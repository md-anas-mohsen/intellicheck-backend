const Joi = require("joi");
const { ORDER_BY_DIRECTIONS } = require("../constants/common");
const { USER_ROLE } = require("../constants/user");

const announcementValidatorSchema ={
    postAnnouncementRequestModel: Joi.object({

      classClode:  Joi.string().required(),
      date : Joi.date().required(),
      description: Joi.string().max(200).required(),
      title: Joi.string().max(25).required(),  

    }),
  }

  module.exports = announcementValidatorSchema;