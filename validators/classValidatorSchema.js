const Joi = require("joi");
const {
  ORDER_BY_DIRECTIONS,
  PAGINATION_OPTIONS,
} = require("../constants/common");
const { USER_ROLE } = require("../constants/user");

const classValidatorSchema = {
  createClassRequestModel: Joi.object({
    courseCode: Joi.string().required(),
    classDescription: Joi.string().max(100).required(),
    className: Joi.string().max(25).required(),
  }),
  updateClassRequestModel: Joi.object({
    className: Joi.string().max(25).optional(),
    classDescription: Joi.string().max(100).optional(),
  }),
  addSingleStudentToClassRequestModel: Joi.object({
    email: Joi.string().email().required(),
  }),
  getClassStudentsRequestModel: Joi.object({
    ...PAGINATION_OPTIONS,
  }),
  getClassesListingRequestModel: Joi.object({
    ...PAGINATION_OPTIONS,
    courseCode: Joi.string().optional(),
  }),
};

module.exports = classValidatorSchema;
