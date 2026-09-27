const path = require("path");
const { Worker } = require("worker_threads");

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a CSV or XLSX file"
      });
    }

    const filePath = path.resolve(req.file.path);

    const worker = new Worker(
      path.resolve(__dirname, "../workers/fileProcessor.worker.js"),
      {
        workerData: {
          filePath
        }
      }
    );

    worker.on("message", (result) => {
      if (result.success) {
        console.log("Worker completed:", result);

        return;
      }

      console.error("Worker failed:", result.error);
    });

    worker.on("error", (error) => {
      console.error("Worker error:", error);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
    });

    return res.status(202).json({
      success: true,
      message: "File uploaded successfully. Processing started.",
      fileName: req.file.originalname
    });
  } catch (error) {
    console.error("Upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload file",
      error: error.message
    });
  }
};

module.exports = {
  uploadFile
};