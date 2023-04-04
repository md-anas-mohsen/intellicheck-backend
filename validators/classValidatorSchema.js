const Joi = require("joi");
const { ORDER_BY_DIRECTIONS } = require("../constants/common");
const { USER_ROLE } = require("../constants/user");

const classValidatorSchema = {
  createClassRequestModel: Joi.object({
    courseCode: Joi.string().required(),
    teacherId: Joi.string().required(),
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
};

module.exports = classValidatorSchema;
