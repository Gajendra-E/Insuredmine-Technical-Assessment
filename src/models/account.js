const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
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

accountSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model("Account", accountSchema);