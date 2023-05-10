const chalk = require("chalk");

module.exports = (err, req, res, next) => {
  console.error(chalk.bgRed(err.stack));
  next(err);
};
