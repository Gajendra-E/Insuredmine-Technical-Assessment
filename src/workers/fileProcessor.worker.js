const { workerData, parentPort } = require("worker_threads");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");

const Agent = require("../models/Agent");
const User = require("../models/User");
const Account = require("../models/Account");
const Lob = require("../models/Lob");
const Carrier = require("../models/Carrier");
const Policy = require("../models/Policy");

require("dotenv").config();

const BATCH_SIZE = 500;

// Helpers
const normalize = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const number = Number(value);

  return Number.isNaN(number) ? 0 : number;
};

const toDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date
    ? value
    : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getFileExtension = (filePath) => {
  return path.extname(filePath).toLowerCase();
};


// Process one batch
async function processBatch(rows) {
  if (!rows.length) {
    return {
      processed: 0,
      skipped: 0,
    };
  }

  // -------------------------------------------------------
  // STEP 1: Prepare unique master data
  // -------------------------------------------------------

  const agents = new Map();
  const accounts = new Map();
  const lobs = new Map();
  const carriers = new Map();

  for (const row of rows) {
    const agentName = normalize(row.agent);
    const accountName = normalize(row.account_name);
    const categoryName = normalize(row.category_name);
    const companyName = normalize(row.company_name);

    if (agentName) {
      agents.set(agentName.toLowerCase(), agentName);
    }

    if (accountName) {
      accounts.set(accountName.toLowerCase(), accountName);
    }

    if (categoryName) {
      lobs.set(categoryName.toLowerCase(), categoryName);
    }

    if (companyName) {
      carriers.set(companyName.toLowerCase(), companyName);
    }
  }

  // -------------------------------------------------------
  // STEP 2: Bulk upsert master collections
  // -------------------------------------------------------

  const masterPromises = [];

  if (agents.size) {
    masterPromises.push(
      Agent.bulkWrite(
        [...agents.values()].map((name) => ({
          updateOne: {
            filter: { name },
            update: {
              $setOnInsert: { name },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      )
    );
  }

  if (accounts.size) {
    masterPromises.push(
      Account.bulkWrite(
        [...accounts.values()].map((name) => ({
          updateOne: {
            filter: { name },
            update: {
              $setOnInsert: { name },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      )
    );
  }

  if (lobs.size) {
    masterPromises.push(
      Lob.bulkWrite(
        [...lobs.values()].map((categoryName) => ({
          updateOne: {
            filter: { categoryName },
            update: {
              $setOnInsert: { categoryName },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      )
    );
  }

  if (carriers.size) {
    masterPromises.push(
      Carrier.bulkWrite(
        [...carriers.values()].map((companyName) => ({
          updateOne: {
            filter: { companyName },
            update: {
              $setOnInsert: { companyName },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      )
    );
  }

  await Promise.all(masterPromises);

  // Load master IDs
  const [
    existingAgents,
    existingAccounts,
    existingLobs,
    existingCarriers,
  ] = await Promise.all([
    agents.size
      ? Agent.find({
          name: { $in: [...agents.values()] },
        }).lean()
      : [],

    accounts.size
      ? Account.find({
          name: { $in: [...accounts.values()] },
        }).lean()
      : [],

    lobs.size
      ? Lob.find({
          categoryName: { $in: [...lobs.values()] },
        }).lean()
      : [],

    carriers.size
      ? Carrier.find({
          companyName: { $in: [...carriers.values()] },
        }).lean()
      : [],
  ]);

  const agentMap = new Map();
  const accountMap = new Map();
  const lobMap = new Map();
  const carrierMap = new Map();

  existingAgents.forEach((agent) => {
    agentMap.set(
      agent.name.toLowerCase(),
      agent._id
    );
  });

  existingAccounts.forEach((account) => {
    accountMap.set(
      account.name.toLowerCase(),
      account._id
    );
  });

  existingLobs.forEach((lob) => {
    lobMap.set(
      lob.categoryName.toLowerCase(),
      lob._id
    );
  });

  existingCarriers.forEach((carrier) => {
    carrierMap.set(
      carrier.companyName.toLowerCase(),
      carrier._id
    );
  });

  // Prepare users
  const users = new Map();

  for (const row of rows) {
    const email = normalize(row.email).toLowerCase();
    if (!email) {
      continue;
    }

    // Keep first occurrence within batch
    if (!users.has(email)) {

      users.set(email, {
        firstName: normalize(row.firstname),
        dob: toDate(row.dob),
        address: normalize(row.address),
        phone: normalize(row.phone),
        state: normalize(row.state),
        zipCode: normalize(row.zip),
        email,
        gender: normalize(row.gender),
        userType: normalize(row.userType),
      });
    }
  }


  // Bulk upsert users
  if (users.size) {
    await User.bulkWrite(
      [...users.entries()].map(([email, user]) => ({
        updateOne: {
          filter: { email },
          update: {
            $set: user,
          },
          upsert: true,
        },
      })),
      {
        ordered: false,
      }
    );
  }

  // Load user IDs
  const userMap = new Map();
  if (users.size) {
    const existingUsers = await User.find({
      email: {
        $in: [...users.keys()],
      },
    }).lean();
    existingUsers.forEach((user) => {
      if (user.email) {
        userMap.set(
          user.email.toLowerCase(),
          user._id
        );
      }
    });
  }

  // Prepare policies
  const policyOperations = [];
  const policyNumbers = new Set();

  let skipped = 0;

  for (const row of rows) {
    const policyNumber = normalize(row.policy_number);

    if (!policyNumber) {
      skipped++;
      continue;
    }

    // Avoid duplicate policy numbers within batch
    if (policyNumbers.has(policyNumber)) {
      skipped++;
      continue;
    }

    policyNumbers.add(policyNumber);

    const email = normalize(row.email).toLowerCase();
    const categoryName = normalize(row.category_name);
    const companyName = normalize(row.company_name);
    const userId = userMap.get(email);

    if (!userId) {
      skipped++;
      continue;
    }

    const lobId = categoryName
      ? lobMap.get(categoryName.toLowerCase()) || null
      : null;

    const carrierId = companyName
      ? carrierMap.get(companyName.toLowerCase()) || null
      : null;

    policyOperations.push({
      updateOne: {
        filter: {
          policyNumber,
        },

        update: {
          $set: {
            policyStartDate: toDate(
              row.policy_start_date
            ),
            policyEndDate: toDate(
              row.policy_end_date
            ),
            userId,
            lobId,
            carrierId,
          },

          $setOnInsert: {
            policyNumber,
          },
        },

        upsert: true,
      },
    });
  }

  // Bulk policy insert/update
  if (policyOperations.length) {
    await Policy.bulkWrite(
      policyOperations,
      {
        ordered: false,
      }
    );
  }

  return {
    processed: policyOperations.length,
    skipped,
  };
}

// CSV streaming
async function processCSV(filePath) {
  return new Promise((resolve, reject) => {
    const stream = fs
      .createReadStream(filePath)
      .pipe(
        csv({
          skipLines: 0,
        })
      );

    let batch = [];

    let totalRows = 0;
    let processed = 0;
    let skipped = 0;

    stream.on("data", async (row) => {
      stream.pause();

      try {
        totalRows++;

        batch.push(row);

        if (batch.length >= BATCH_SIZE) {
          const result = await processBatch(batch);

          processed += result.processed;
          skipped += result.skipped;

          batch = [];
        }

        stream.resume();
      } catch (error) {
        stream.destroy(error);
      }
    });

    stream.on("end", async () => {
      try {
        if (batch.length) {
          const result = await processBatch(batch);

          processed += result.processed;
          skipped += result.skipped;
        }

        resolve({
          totalRows,
          processed,
          skipped,
        });
      } catch (error) {
        reject(error);
      }
    });

    stream.on("error", reject);
  });
}

// XLSX streaming
async function processXLSX(filePath) {
  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(
    filePath,
    {
      worksheets: "emit",
      sharedStrings: "cache",
      hyperlinks: "ignore",
      styles: "ignore",
      entries: "ignore",
    }
  );

  let totalRows = 0;
  let processed = 0;
  let skipped = 0;

  for await (const worksheetReader of workbookReader) {
    let headers = null;
    let batch = [];

    for await (const row of worksheetReader) {
      // First row = headers
      if (!headers) {
        headers = row.values
          .slice(1)
          .map((header) =>
            normalize(header).toLowerCase()
          );

        continue;
      }

      const values = row.values.slice(1);
      const data = {};

      headers.forEach((header, index) => {
        data[header] = values[index] ?? "";
      });

      totalRows++;
      batch.push(data);

      if (batch.length >= BATCH_SIZE) {
        const result = await processBatch(batch);

        processed += result.processed;
        skipped += result.skipped;

        batch = [];
      }
    }

    if (batch.length) {
      const result = await processBatch(batch);
      processed += result.processed;
      skipped += result.skipped;
    }
  }

  return {
    totalRows,
    processed,
    skipped,
  };
}

// File Processing
async function processFile() {
  const { filePath } = workerData;
  const extension = getFileExtension(filePath);

  console.log("Worker started");
  // console.log(`File type: ${extension}`);

  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    console.log("Worker connected to MongoDB");

    let result

    // Select streaming parser
    if (extension === ".csv") {
      result = await processCSV(filePath);
    } else if (
      extension === ".xlsx"
    ) {
      result = await processXLSX(filePath);
    } else {
      throw new Error(
        "Unsupported file format. Only CSV and XLSX are supported."
      );
    }

    console.log(
      "File processing completed"
    );

    parentPort.postMessage({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Worker processing failed:",
      error
    );

    parentPort.postMessage({
      success: false,
      error: error.message,
    });
  } finally {
    await mongoose.disconnect();
  }
}

processFile();