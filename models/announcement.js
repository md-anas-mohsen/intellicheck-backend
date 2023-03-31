const announcementSchema = mongoose.Schema({
    classCode: {
      type: String,
      required: [true, "Provide class code"],
    },
    date: {
      type: Date,
      required: [true, "Provide date"],
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
      unique: true
    },
  
  });
  
  module.exports = mongoose.model("Announcement", announcementSchema);