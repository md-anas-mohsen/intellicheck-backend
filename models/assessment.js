const mongoose = require("mongoose");
const { assessmentStatus } = require("../constants/assessment");

const assessmentSchema = mongoose.Schema({
  classId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Class",
    required: [true, "Provide class id"],
  },
  assessmentName: {
    type: String,
    required: [true, "Provide asessment name"],
    maxLength: [50, "Name cannot exceed 50 characters"],
  },
  openDate: {
    type: Date,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    maxLength: [150, "Description cannot exceed 150 characters"],
  },
  duration: {
    type: Number,
    required: [true, "Please specify duration in number of seconds"],
  },
  totalMarks: {
    type: Number,
    required: [true, "Provide total marks of assessment"],
  },
  obtainedMarks: {
    type: Number,
  },
  cancelled: {
    type: Boolean,
    default: false,
  },
  allowManualGrading: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: Object.values(assessmentStatus),
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Assessment", assessmentSchema);
