const mongoose = require("mongoose");
const validator = require("validator");

const studentRegistrationRequestSchema = mongoose.Schema({
  classId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Class",
    required: true,
  },
  email: {
    type: String,
    required: [true, "Please enter user email"],
    validate: [validator.isEmail, "Please enter valid email address"],
  },
});

studentRegistrationRequestSchema.index(
  { classId: 1, email: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "Student_Registration_Request",
  studentRegistrationRequestSchema
);
