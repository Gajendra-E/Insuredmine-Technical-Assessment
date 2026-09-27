const express = require("express");
const uploadRoutes = require("./routes/uploadRoutes");
const policyRoutes = require("./routes/policyRoutes");
const messageRoutes = require("./routes/messageRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "InsuredMine assessment API is running"
  });
});

app.use("/api", uploadRoutes);
app.use("/api", policyRoutes);
app.use("/api", messageRoutes);

app.use(errorHandler);


module.exports = app;