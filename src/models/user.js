const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },

    dob: {
      type: Date
    },

    address: {
      type: String,
      trim: true
    },

    phone: {
      type: String,
      trim: true
    },

    state: {
      type: String,
      trim: true
    },

    zipCode: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    gender: {
      type: String,
      trim: true
    },

    userType: {
      type: String,
      trim: true
    },
  },
  {
    timestamps: true
  }
);

userSchema.index({ email: 1 });
userSchema.index({ firstName: 1 });

module.exports = mongoose.model("User", userSchema);