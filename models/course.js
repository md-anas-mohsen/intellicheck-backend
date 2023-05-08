const mongoose = require("mongoose");

const courseSchema = mongoose.Schema({
  courseCode: {
    type: String,
    required: [true, "Provide course code"],
    unique: true,
  },
  courseDescription: {
    type: String,
    required: [true, "Provide course description"],
    maxLength: [100, "Cannot exceed 100 characters"],
  },
  courseName: {
    type: String,
    unique: true,
    required: [true, "Provide course Name"],
    maxLength: [25, "Cannot exceed 25 characters"],
  },
  courseEmbeddingUrl: {
    type: String,
    default: "",
    required: true,
  },
  threshold: {
    type: Map,
    of: [Number],
    required: true,
  },
});

module.exports = mongoose.model("Course", courseSchema);
