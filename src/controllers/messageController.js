const ScheduledMessage = require("../models/ScheduledMessage");

const scheduleMessage = async (req, res) => {
  try {
    const { message, day, time } = req.body;

    if (!message || !day || !time) {
      return res.status(400).json({
        success: false,
        message: "message, day and time are required"
      });
    }

    const scheduledAt = new Date(`${day}T${time}:00`);

    if (Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid day or time format"
      });
    }

    if (scheduledAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time must be in the future"
      });
    }

    const scheduledMessage =
      await ScheduledMessage.create({
        message: message.trim(),
        scheduledAt,
        status: "scheduled"
      });

    return res.status(201).json({
      success: true,
      message: "Message scheduled successfully",
      data: scheduledMessage
    });
  } catch (error) {
    console.error("Schedule message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to schedule message",
      error: error.message
    });
  }
};

const getScheduledMessages = async (req, res) => {
  try {
    const messages = await ScheduledMessage.find()
      .sort({ scheduledAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error("Get messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch scheduled messages",
      error: error.message
    });
  }
};

module.exports = {
  scheduleMessage,
  getScheduledMessages
};