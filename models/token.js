const mongoose = require("mongoose");
const {
  TOKEN_TYPE,
  PASSCODE_LENGTH,
  PASSCODE_INCORRECT_RETRIES,
} = require("../constants/token");
const { USER_ROLE } = require("../constants/user");

const tokenSchema = mongoose.Schema({
  tokenHash: {
    type: String,
    required: [true, "Provide token hash"],
    unique: true,
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Provide user id"],
  },
  userType: {
    type: String,
    enum: Object.values(USER_ROLE),
    required: [true, "Provide user type"],
  },
  tokenType: {
    type: String,
    enum: Object.values(TOKEN_TYPE),
    required: [true, "Provide token type"],
  },
  passcode: {
    type: String,
    required: false,
    length: [PASSCODE_LENGTH, `Passcode must be ${PASSCODE_LENGTH} digits`],
  },
  retriesLeft: {
    type: Number,
    default: PASSCODE_INCORRECT_RETRIES,
  },
  expiresAt: {
    type: Date,
    default: Date.now() + 10 * 60 * 1000,
  },
});

module.exports = mongoose.model("Token", tokenSchema);
