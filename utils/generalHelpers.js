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
