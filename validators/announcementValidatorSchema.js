const Joi = require("joi");
const { ORDER_BY_DIRECTIONS } = require("../constants/common");
const { USER_ROLE } = require("../constants/user");

const announcementValidatorSchema = {
  postAnnouncementRequestModel: Joi.object({
    title: Joi.string().max(25).required(),
    description: Joi.string().max(200).required(),
  }),
};

module.exports = announcementValidatorSchema;
