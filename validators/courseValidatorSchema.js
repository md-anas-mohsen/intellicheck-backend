const Joi = require("joi").extend(require("@joi/date"));
const { questionType } = require("../constants/assessment");
const {
  ORDER_BY_DIRECTIONS,
  MONGODB_OBJECT_ID_REGEX,
  PAGINATION_OPTIONS,
} = require("../constants/common");
const { USER_ROLE } = require("../constants/user");

const courseValidatorSchema = {
  courseListingRequestModel: Joi.object({
    ...PAGINATION_OPTIONS,
  }),
};

module.exports = courseValidatorSchema;
