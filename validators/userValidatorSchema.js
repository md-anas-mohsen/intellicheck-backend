const Joi = require("joi");
const { ORDER_BY_DIRECTIONS } = require("../constants/common");

const userValidatorSchema = {
  registerUserRequestModel: Joi.object({
    name: Joi.string().max(25).required(),
    password: Joi.string().min(6).required(),
    email: Joi.string().email().required(),
    avatar: Joi.string().optional(),
  }),
  loginUserRequestModel: Joi.object({
    password: Joi.string().required(),
    email: Joi.string().email().required(),
  }),
  refreshUserTokenRequestModel: Joi.object({
    refreshToken: Joi.string().required(),
  }),
  createUserRequestModel: Joi.object({
    name: Joi.string().max(25).required(),
    password: Joi.string().min(6).required(),
    email: Joi.string().email().required(),
    role: Joi.string().valid("user", "admin").required(),
  }),
  updateUserUsingAdminPrivilegeRequestModel: Joi.object({
    name: Joi.string().max(25).optional(),
    password: Joi.string().min(6).optional(),
    email: Joi.string().lowercase().email().required().optional(),
    role: Joi.string().valid("user", "admin").optional(),
  }),
  userListingRequestModel: Joi.object({
    keyword: Joi.string().allow("").trim().optional(),
    page: Joi.number().empty("").default(1).optional(),
    limit: Joi.number().empty("").default(20).max(500).optional(),
    orderBy: Joi.string()
      .allow("")
      .trim()
      .valid("_id", "role", "createdAt", "email", "name")
      .optional(),
    direction: Joi.string()
      .valid(ORDER_BY_DIRECTIONS.ASC, ORDER_BY_DIRECTIONS.DESC)
      .optional(),
  }),
};

module.exports = userValidatorSchema;
