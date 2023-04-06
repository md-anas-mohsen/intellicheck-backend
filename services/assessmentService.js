const ErrorHandler = require("../utils/errorHandler");
const mongoose = require("mongoose");

const MESSAGES = require("../constants/messages");

const Assessment = require("../models/assessment");
const Class = require("../models/class");
const Question = require("../models/question");

const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

exports.createAssessment = catchAsyncErrors(async (req, res, next) => {
  const {
    assessmentName,
    description,
    openDate,
    dueDate,
    duration,
    questions,
  } = req.body;
  const classId = req.params.classId;

  const teacherId = req.user._id;

  const teacherHasClass = await Class.findOne({
    _id: classId,
    teacherId,
  });

  if (!teacherHasClass) {
    return next(new ErrorHandler(MESSAGES.TEACHER_CLASS_NOT_FOUND, 403));
  }

  if (new Date(dueDate).getTime() - new Date(openDate).getTime() <= 0) {
    return next(
      new ErrorHandler(MESSAGES.ASSESSMENT_DUE_DATE_BEHIND_OPEN_DATE, 400)
    );
  }

  const assessmentWithSameName = await Assessment.findOne({
    assessmentName: { $regex: new RegExp(`^${assessmentName}$`, "i") },
  });

  if (!!assessmentWithSameName) {
    return next(new ErrorHandler(MESSAGES.ASSESSMENT_WITH_SAME_NAME, 409));
  }

  const conn = mongoose.connection;

  try {
    const session = await conn.startSession();
    await session.withTransaction(async () => {
      const totalMarks = questions.reduce(
        (acc, curr) => acc + curr.totalMarks,
        0
      );

      const assessment = await Assessment.create({
        assessmentName,
        description,
        openDate,
        dueDate,
        duration,
        totalMarks,
        classId,
      });

      let questionsData = questions.map((question) => ({
        ...question,
        assessmentId: assessment._id,
      }));

      const questionsCreated = await Question.create(questionsData);

      assessment.questions = questionsCreated;
    });
    session.endSession();

    return res.status(201).json({
      success: true,
      message: MESSAGES.ASSESSMENT_CREATED,
      assessment,
    });
  } catch (err) {
    return next(err);
  }
});
