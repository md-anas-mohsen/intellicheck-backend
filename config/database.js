const chalk = require("chalk");
const mongoose = require("mongoose");

const connectDB = mongoose
  .connect(process.env.DB_CLOUD_URI)
  .then((conn) => {
    console.log(
      chalk.green(
        chalk.underline(`MongoDB connected with HOST: ${conn.connection.host}`)
      )
    );
  })
  .catch((err) => chalk.bgRed(err));

module.exports = connectDB;
