const Joi = require("joi");
const {
  ORDER_BY_DIRECTIONS,
  PAGINATION_OPTIONS,
} = require("../constants/common");
const { USER_ROLE } = require("../constants/user");

const announcementValidatorSchema = {
  postAnnouncementRequestModel: Joi.object({
    title: Joi.string().max(25).required(),
    description: Joi.string().max(200).required(),
  }),
  viewAnnouncementsRequestModel: Joi.object({
    ...PAGINATION_OPTIONS,
  }),
};

module.exports = announcementValidatorSchema;
