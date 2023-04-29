const mongoose = require("mongoose");
const { assessmentSolutionStatus } = require("../constants/assessment");

const assessmentSolutionAnswerSchema = mongoose.Schema({
  question: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Question",
    required: true,
  },
  answer: {
    type: String,
    required: [true, "An answer must be provided"],
    default: "",
  },
  marks: {
    type: Number,
    max: [2, "Maximum marks for a question are 2"],
  },
  regradeRequest: {
    type: Boolean,
    default: false,
  },
});

const assessmentSolutionSchema = mongoose.Schema({
  studentId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Student",
    required: true,
  },
  assessmentId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Assessment",
    required: true,
  },
  obtainedMarks: {
    type: Number,
    default: null,
  },
  durationInSeconds: {
    type: Number,
  },
  studentAnswers: [assessmentSolutionAnswerSchema],
  status: {
    type: String,
    enum: Object.values(assessmentSolutionStatus),
    required: true,
    default: assessmentSolutionStatus.SUBMITTED,
  },
  lateSubmission: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

assessmentSolutionSchema.index(
  { studentId: 1, assessmentId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "Assessment_Solution",
  assessmentSolutionSchema
);
