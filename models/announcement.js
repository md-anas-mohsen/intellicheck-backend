const mongoose = require("mongoose");
const announcementSchema = mongoose.Schema({
  classId: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "Class",
    required: [true, "Provide class id"],
  },
  description: {
    type: String,
    required: [true, "Provide announcement description"],
    maxLength: [200, "Cannot exceed 100 characters"],
  },
  title: {
    type: String,
    required: [true, "Provide class name"],
    maxLength: [25, "Cannot exceed 25 characters"],
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Announcement", announcementSchema);
