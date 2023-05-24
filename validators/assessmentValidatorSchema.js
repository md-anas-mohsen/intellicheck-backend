const Joi = require("joi").extend(require("@joi/date"));
const { questionType } = require("../constants/assessment");
const {
  ORDER_BY_DIRECTIONS,
  MONGODB_OBJECT_ID_REGEX,
  PAGINATION_OPTIONS,
} = require("../constants/common");
const { USER_ROLE } = require("../constants/user");

const assessmentValidatorSchema = {
  createAssessmentRequestModel: Joi.object({
    assessmentName: Joi.string().max(50).required(),
    description: Joi.string().max(150).optional(),
    openDate: Joi.date().utc(),
    dueDate: Joi.date().utc(),
    // openDate: Joi.date().format("YYYY-MM-DDTHH:mm:ss").utc(),
    // dueDate: Joi.date().format("YYYY-MM-DDTHH:mm:ss").utc(),
    duration: Joi.number().required(),
    questions: Joi.array().items(
      Joi.object().keys({
        question: Joi.string().required(),
        questionType: Joi.string()
          .trim()
          .valid(...Object.values(questionType))
          .required(),
        totalMarks: Joi.number()
          .label("Marks for a question")
          .min(1)
          .max(2)
          .required(),
        msAnswer: Joi.array()
          .items(Joi.array().items(Joi.string()))
          .label("Mark scheme"),
      })
    ),
    allowManualGrading: Joi.boolean().optional(),
  }),
  submitAssessmentRequestModel: Joi.object({
    answers: Joi.array()
      .items(
        Joi.object().keys({
          questionId: Joi.string().required(),
          answer: Joi.string().required(),
        })
      )
      .required(),
    durationInSeconds: Joi.number().optional(),
  }),
  updateAssessmentRequestModel: Joi.object({
    assessmentName: Joi.string().max(50).optional(),
    description: Joi.string().max(150).optional(),
    openDate: Joi.date().format("YYYY-MM-DDTHH:mm:ss").utc().optional(),
    dueDate: Joi.date().format("YYYY-MM-DDTHH:mm:ss").utc().optional(),
    duration: Joi.number().optional(),
    questions: Joi.array()
      .items(
        Joi.object().keys({
          _id: Joi.string().optional(),
          question: Joi.string().required(),
          questionType: Joi.string()
            .label("Question type")
            .trim()
            .valid(...Object.values(questionType))
            .required(),
          totalMarks: Joi.number()
            .label("Marks for a question")
            .min(1)
            .max(2)
            .required(),
          msAnswer: Joi.array()
            .items(Joi.array().items(Joi.string()))
            .label("Mark scheme"),
        })
      )
      .optional(),
    allowManualGrading: Joi.boolean().optional(),
  }),
  manuallyGradeAssessmentRequestModel: Joi.object({
    marking: Joi.object()
      .pattern(
        MONGODB_OBJECT_ID_REGEX,
        Joi.number().max(2).label("marks").required()
      )
      .required()
      .messages({
        "any.only": `Pass valid question id in key and marks in value for "marking"`,
      }),
  }),
  assessmentListingRequestModel: Joi.object({
    ...PAGINATION_OPTIONS,
    classId: Joi.string(),
  }),
  createRegradeRequestModel: Joi.object({
    assessmentId: Joi.string(),
    questionId: Joi.string(),
  }),
  getRegradeRequestsModel: Joi.object({
    ...PAGINATION_OPTIONS,
    classId: Joi.string(),
    studentId: Joi.string(),
  }),
};
module.exports = assessmentValidatorSchema;
