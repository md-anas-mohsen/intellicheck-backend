const mongoose = require("mongoose");
const { USER_ROLE } = require("../constants/user");

const deviceSessionSchema = mongoose.Schema({
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
    unique: true,
    required: true,
  },
  userRole: {
    type: String,
    enum: [USER_ROLE.STUDENT, USER_ROLE.TEACHER],
    required: true,
  },
  authToken: {
    type: String,
    required: true,
  },
  fcmToken: {
    type: String,
  },
});

module.exports = mongoose.model("Device_Session", deviceSessionSchema);
