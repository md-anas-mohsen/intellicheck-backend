const mongoose = require("mongoose");

const connectDB = mongoose.connect(process.env.DB_LOCAL_URI).then((conn) => {
  console.log(`MongoDB connected with HOST: ${conn.connection.host}`);
});

module.exports = connectDB;
