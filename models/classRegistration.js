const mongoose = require("mongoose");
const validator = require("validator");

const classRegistrationSchema = mongoose.Schema({
  classId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Class",
    required: [true, "Provide class id"],
  },
  studentId: {
    type: mongoose.SchemaTypes.ObjectId,
    required: [true, "Provide student Id"],
    ref: "Student",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

classRegistrationSchema.index({ classId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Class_Registration", classRegistrationSchema);
