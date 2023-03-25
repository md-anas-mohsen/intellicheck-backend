const Joi = require("joi");
const { ORDER_BY_DIRECTIONS } = require("../constants/common");
const { USER_ROLE } = require("../constants/user");

const userValidatorSchema = {
  registerUserRequestModel: Joi.object({
    firstName: Joi.string().max(25).required(),
    lastName: Joi.string().max(25).required(),
    username: Joi.string().max(10).required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string()
      .min(6)
      .valid(Joi.ref("password"))
      .required()
      .label("Confirm password")
      .messages({ "any.only": "{{#label}} does not match" }),
    email: Joi.string().email().required(),
    role: Joi.string().valid(USER_ROLE.STUDENT, USER_ROLE.TEACHER).required(),
  }),
  loginUserRequestModel: Joi.object({
    password: Joi.string().required(),
    usernameOrEmail: Joi.string().required(),
    role: Joi.string().valid(USER_ROLE.STUDENT, USER_ROLE.TEACHER).required(),
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
