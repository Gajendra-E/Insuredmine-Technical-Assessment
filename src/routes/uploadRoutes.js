// const express = require("express");
// const multer = require("multer");
// const path = require("path");

// const {
//   uploadFile
// } = require("../controllers/uploadController");

// const router = express.Router();

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/");
//   },

//   filename: (req, file, cb) => {
//     const uniqueName =
//       `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
//       path.extname(file.originalname);

//     cb(null, uniqueName);
//   }
// });

// const fileFilter = (req, file, cb) => {
//   const allowedExtensions = [".csv", ".xlsx"];

//   const extension = path
//     .extname(file.originalname)
//     .toLowerCase();

//   if (allowedExtensions.includes(extension)) {
//     cb(null, true);
//   } else {
//     cb(
//       new Error("Only CSV and XLSX files are allowed"),
//       false
//     );
//   }
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 20 * 1024 * 1024
//   }
// });

// router.post(
//   "/upload",
//   upload.single("file"),
//   uploadFile
// );

// module.exports = router;


const express = require("express");
const multer = require("multer");
const path = require("path");

const {
  uploadFile
} = require("../controllers/uploadController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const uniqueName =
      `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
      path.extname(file.originalname);

    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".csv", ".xlsx"];

  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only CSV and XLSX files are allowed"),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

router.post(
  "/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      next();
    });
  },
  uploadFile
);

module.exports = router;