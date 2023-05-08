const mongoose = require("mongoose");
const { questionType } = require("../constants/assessment");

const questionSchema = mongoose.Schema({
  questionType: {
    type: String,
    enum: Object.values(questionType),
    required: true,
  },
  assessmentId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Assessment",
    required: true,
  },
  question: {
    type: String,
    required: [true, "Please provide question text"],
    maxLength: [200, "Question must be within 200 characters"],
  },
  totalMarks: {
    type: Number,
    required: [true, "Provide marks for question"],
    min: [1, "Minimum marks for a question is 1"],
    max: [2, "Maximum marks for a question are 2"],
  },
  msAnswer: [
    [
      {
        type: String,
        required: [true, "Please provide marking scheme answers"],
      },
    ],
  ],
  options: [
    //for MCQs
    { type: String, required: false },
  ],
});

module.exports = mongoose.model("Question", questionSchema);
