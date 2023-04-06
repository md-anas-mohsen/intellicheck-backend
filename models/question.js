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
  },
  msAnswer: [
    {
      type: String,
      required: [true, "Please provide marking scheme answers"],
    },
  ],
});

module.exports = mongoose.model("Question", questionSchema);
