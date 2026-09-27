const express = require("express");

const {
  scheduleMessage,
  getScheduledMessages
} = require("../controllers/messageController");

const router = express.Router();

router.post(
  "/messages",
  scheduleMessage
);

router.get("/messages", getScheduledMessages);

module.exports = router;
