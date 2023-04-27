const mongoose = require("mongoose");

exports.USER_ROLE = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
};

exports.userSettingsSchema = mongoose.Schema({
  notificationsOn: {
    type: Boolean,
    required: true,
    default: true,
  },
  emailsOn: {
    type: Boolean,
    required: true,
    default: true,
  },
});
