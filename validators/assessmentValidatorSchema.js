const Joi = require("joi").extend(require("@joi/date"));
const { questionType } = require("../constants/assessment");
const { ORDER_BY_DIRECTIONS } = require("../constants/common");
const { USER_ROLE } = require("../constants/user");

const assessmentValidatorSchema = {
  createAssessmentRequestModel: Joi.object({
    assessmentName: Joi.string().max(50).required(),
    description: Joi.string().max(150).optional(),
    openDate: Joi.date().format("YYYY-MM-DDTHH:mm:ss").utc(),
    dueDate: Joi.date().format("YYYY-MM-DDTHH:mm:ss").utc(),
    duration: Joi.number().required(),
    questions: Joi.array().items(
      Joi.object().keys({
        question: Joi.string().required(),
        questionType: Joi.string()
          .trim()
          .valid(...Object.values(questionType))
          .required(),
        totalMarks: Joi.number().required(),
        msAnswer: Joi.array().items(Joi.string()),
      })
    ),
  }),
};

module.exports = assessmentValidatorSchema;
