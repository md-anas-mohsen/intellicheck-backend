const { PASSCODE_LENGTH } = require("../constants/token");

exports.applyPagination = (dbQuery, queryString) => {
  let { page, limit } = queryString;

  if (!page) {
    page = 1;
  }

  if (!limit) {
    limit = 20;
  }

  return dbQuery.skip((page - 1) * limit).limit(limit);
};

exports.capitalizeEachWord = (sentence) => {
  const words = sentence.split(" ");

  return words
    .map((word) => {
      return word[0].toUpperCase() + word.substring(1);
    })
    .join(" ");
};

exports.generatePasscode = (digits = 6) => {
  return process.env.ENVIRONMENT === "DEVELOPMENT"
    ? "0".repeat(PASSCODE_LENGTH)
    : `${Math.floor(10 ** digits - 1 + Math.random() * 9 * 10 ** digits - 1)}`;
};

exports.shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};
