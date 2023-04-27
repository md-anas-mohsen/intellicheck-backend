const Joi = require("joi");
const { ORDER_BY_DIRECTIONS } = require("../constants/common");
const { USER_ROLE } = require("../constants/user");
const { PASSCODE_LENGTH } = require("../constants/token");

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
  forgotPasswordRequestModel: Joi.object({
    email: Joi.string().email().required(),
    role: Joi.string().valid(USER_ROLE.STUDENT, USER_ROLE.TEACHER).required(),
  }),
  resetPasswordRequestModel: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
    confirmNewPassword: Joi.string()
      .min(6)
      .valid(Joi.ref("newPassword"))
      .required()
      .label("Confirm new password")
      .messages({ "any.only": "{{#label}} does not match" }),
  }),
  verifyOTPRequestModel: Joi.object({
    token: Joi.string().required(),
    code: Joi.string()
      .length(PASSCODE_LENGTH)
      .pattern(/^[0-9]+$/)
      .required(),
  }),
  changePasswordRequestModel: Joi.object({
    currentPassword: Joi.string().min(6).required(),
    newPassword: Joi.string().min(6).required(),
    confirmNewPassword: Joi.string()
      .min(6)
      .valid(Joi.ref("newPassword"))
      .required()
      .label("Confirm new password")
      .messages({ "any.only": "{{#label}} does not match" }),
  }),
  updateUserProfileRequestModel: Joi.object({
    firstName: Joi.string().max(25).optional(),
    lastName: Joi.string().max(25).optional(),
    username: Joi.string().max(10).optional(),
    email: Joi.string().email().optional(),
  }),
  updateUserSettingsRequestModel: Joi.object({
    notificationsOn: Joi.boolean().optional(),
    emailsOn: Joi.boolean().optional(),
  }),
};

module.exports = userValidatorSchema;
