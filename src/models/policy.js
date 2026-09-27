const mongoose = require("mongoose");

const policySchema = new mongoose.Schema(
  {
    policyNumber: {
      type: String,
      required: true,
      trim: true
    },

    policyStartDate: {
      type: Date
    },

    policyEndDate: {
      type: Date
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    lobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lob"
    },

    carrierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Carrier"
    }
  },
  {
    timestamps: true
  }
);

policySchema.index({ policyNumber: 1 }, { unique: true });
policySchema.index({ userId: 1 });
policySchema.index({ lobId: 1 });
policySchema.index({ carrierId: 1 });

module.exports = mongoose.model("Policy", policySchema);