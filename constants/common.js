const Joi = require("joi");

exports.ORDER_BY_DIRECTIONS = {
  ASC: "asc",
  DESC: "desc",
};

exports.PAGINATION_OPTIONS = {
  keyword: Joi.string().allow("").trim().optional(),
  page: Joi.number().empty("").default(1).optional(),
  limit: Joi.number().empty("").default(20).optional(),
};

exports.MONGODB_OBJECT_ID_REGEX = /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i;
