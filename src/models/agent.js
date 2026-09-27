const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

agentSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("Agent", agentSchema);