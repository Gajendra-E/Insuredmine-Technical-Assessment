const User = require("../models/User");

const searchPoliciesByUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: "username query parameter is required"
      });
    }

    const searchTerm = username.trim();

    const users = await User.aggregate([
      {
        $match: {
          firstName: {
            $regex: searchTerm,
            $options: "i"
          }
        }
      },

      {
        $lookup: {
          from: "policies",
          localField: "_id",
          foreignField: "userId",
          as: "policies"
        }
      },

      {
        $unwind: {
          path: "$policies",
          preserveNullAndEmptyArrays: false
        }
      },

      {
        $lookup: {
          from: "lobs",
          localField: "policies.lobId",
          foreignField: "_id",
          as: "lob"
        }
      },

      {
        $unwind: {
          path: "$lob",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "carriers",
          localField: "policies.carrierId",
          foreignField: "_id",
          as: "carrier"
        }
      },

      {
        $unwind: {
          path: "$carrier",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $lookup: {
          from: "accounts",
          localField: "policies.accountId",
          foreignField: "_id",
          as: "account"
        }
      },

      {
        $unwind: {
          path: "$account",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $project: {
          _id: 0,

          user: {
            id: "$_id",
            firstName: "$firstName",
            email: "$email",
            phone: "$phone"
          },

          policy: {
            policyNumber: "$policies.policyNumber",
            startDate: "$policies.policyStartDate",
            endDate: "$policies.policyEndDate",
            policyType: "$policies.policyType",
            premiumAmount: "$policies.premiumAmount"
          },

          account: "$account.name",

          category: "$lob.categoryName",

          carrier: "$carrier.companyName"
        }
      }
    ]);

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: `No policies found for user: ${searchTerm}`
      });
    }

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });

  } catch (error) {
    console.error(
      "Policy search error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to search policies",
      error: error.message
    });
  }
};

const getPoliciesByUser = async (req, res) => {
  try {
    const result = await User.aggregate([
      /*
       * Join policies with users
       */
      {
        $lookup: {
          from: "policies",
          localField: "_id",
          foreignField: "userId",
          as: "policies"
        }
      },

      /*
       * Only users having policies
       */
      {
        $match: {
          "policies.0": {
            $exists: true
          }
        }
      },

      /*
       * Get LOB information
       */
      {
        $unwind: "$policies"
      },

      {
        $lookup: {
          from: "lobs",
          localField: "policies.lobId",
          foreignField: "_id",
          as: "lob"
        }
      },

      {
        $unwind: {
          path: "$lob",
          preserveNullAndEmptyArrays: true
        }
      },

      /*
       * Get carrier information
       */
      {
        $lookup: {
          from: "carriers",
          localField: "policies.carrierId",
          foreignField: "_id",
          as: "carrier"
        }
      },

      {
        $unwind: {
          path: "$carrier",
          preserveNullAndEmptyArrays: true
        }
      },

      /*
       * Group policies back by user
       */
      {
        $group: {
          _id: "$_id",

          firstName: {
            $first: "$firstName"
          },

          email: {
            $first: "$email"
          },

          phone: {
            $first: "$phone"
          },

          policyCount: {
            $sum: 1
          },

          policies: {
            $push: {
              policyNumber: "$policies.policyNumber",

              policyStartDate:
                "$policies.policyStartDate",

              policyEndDate:
                "$policies.policyEndDate",

              policyType:
                "$policies.policyType",

              premiumAmount:
                "$policies.premiumAmount",

              category:
                "$lob.categoryName",

              carrier:
                "$carrier.companyName"
            }
          }
        }
      },

      /*
       * Sort by user name
       */
      {
        $sort: {
          firstName: 1
        }
      },

      /*
       * Final response shape
       */
      {
        $project: {
          _id: 0,

          userId: "$_id",

          firstName: 1,

          email: 1,

          phone: 1,

          policyCount: 1,

          policies: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });

  } catch (error) {
    console.error(
      "Policy aggregation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to aggregate policies",
      error: error.message
    });
  }
};


module.exports = {
  searchPoliciesByUsername,
  getPoliciesByUser
};