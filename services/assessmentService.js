const ErrorHandler = require("../utils/errorHandler");
const mongoose = require("mongoose");

const MESSAGES = require("../constants/messages");
const { USER_ROLE } = require("../constants/user");

const Assessment = require("../models/assessment");
const Class = require("../models/class");
const Question = require("../models/question");
const ClassRegistration = require("../models/classRegistration");
const AssessmentSolution = require("../models/assessmentSolution");

const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const { assessmentSolutionStatus } = require("../constants/assessment");

exports.createAssessment = catchAsyncErrors(async (req, res, next) => {
  const {
    assessmentName,
    description,
    openDate,
    dueDate,
    duration,
    questions,
    allowManualGrading,
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

  let assessment;
  let questionsCreated;
  try {
    const session = await conn.startSession();
    await session.withTransaction(async () => {
      const totalMarks = questions.reduce(
        (acc, curr) => acc + curr.totalMarks,
        0
      );

      assessment = await Assessment.create({
        assessmentName,
        description,
        openDate,
        dueDate,
        duration,
        totalMarks,
        classId,
        allowManualGrading,
      });

      let questionsData = questions.map((question) => ({
        ...question,
        assessmentId: assessment._id,
      }));

      questionsCreated = await Question.create(questionsData);

      assessment.questions = questionsCreated;
    });
    session.endSession();

    return res.status(201).json({
      success: true,
      message: MESSAGES.ASSESSMENT_CREATED,
      assessment,
      questions: questionsCreated,
    });
  } catch (err) {
    return next(err);
  }
});

exports.viewAssessment = catchAsyncErrors(async (req, res, next) => {
  const { assessmentId } = req.params;

  const assessment = await Assessment.findById(assessmentId);

  if (!assessment) {
    return next(new ErrorHandler(MESSAGES.ASSESSMENT_NOT_FOUND, 404));
  }

  let assessmentSolution;

  if (req.user?.role === USER_ROLE.STUDENT) {
    const userEnrolledInThisClass = await ClassRegistration.findOne({
      userId: req.user?._id,
      classId: assessment.classId,
    });

    if (!userEnrolledInThisClass) {
      return next(new ErrorHandler(MESSAGES.ASSESSMENT_NOT_ACCESSIBLE, 403));
    }

    assessmentSolution = await AssessmentSolution.findOne({
      studentId: req.user?._id,
      assessmentId,
    });

    if (
      assessmentSolution &&
      assessmentSolution.status === assessmentSolutionStatus.UNGRADED
    ) {
      return next(new ErrorHandler(MESSAGES.ASSESSMENT_GRADING_PROCESS, 403));
    }
  }

  if (req.user?.role === USER_ROLE.TEACHER) {
    const classBelongsToTeacher = await Class.findOne({
      teacherId: req.user?._id,
      _id: assessment.classId,
    });

    if (!classBelongsToTeacher) {
      return next(new ErrorHandler(MESSAGES.ASSESSMENT_NOT_ACCESSIBLE, 403));
    }
  }

  let assessmentQuestionsQuery = Question.find({
    assessmentId,
  }).select("-assessmentId");

  if (req.user?.role === USER_ROLE.STUDENT) {
    assessmentQuestionsQuery = assessmentQuestionsQuery.select("-msAnswer");
  }

  questions = await assessmentQuestionsQuery;

  return res.status(200).json({
    assessment,
    questions,
  });
});

exports.submitAssessment = catchAsyncErrors(async (req, res, next) => {
  const { assessmentId } = req.params;

  const submittedOn = Date.now();
  const assessment = await Assessment.findById(assessmentId);

  if (!assessment) {
    return next(new ErrorHandler(MESSAGES.ASSESSMENT_NOT_FOUND, 404));
  }

  if (assessment.dueDate?.getTime() - submittedOn <= assessment.duration) {
    return next(new ErrorHandler(MESSAGES.ASSESSMENT_OVERDUE, 403));
  }

  let lateSubmission = false;
  if (assessment.dueDate?.getTime() - submittedOn < 0) {
    lateSubmission = true;
  }

  if (req.user?.role === USER_ROLE.STUDENT) {
    const userEnrolledInThisClass = await ClassRegistration.findOne({
      userId: req.user?._id,
      classId: assessment.classId,
    });

    if (!userEnrolledInThisClass) {
      return next(new ErrorHandler(MESSAGES.ASSESSMENT_NOT_ACCESSIBLE, 403));
    }
  }

  const assessmentAlreadySubmitted = await AssessmentSolution.findOne({
    studentId: req.user?._id,
    assessmentId,
  });

  if (assessmentAlreadySubmitted) {
    return next(new ErrorHandler(MESSAGES.ASSESSMENT_ALREADY_SUBMITTED, 409));
  }

  const { answers, durationInSeconds } = req.body;

  const studentAnswers = answers.map(({ questionId, answer }) => ({
    question: questionId,
    answer,
  }));

  const solution = await AssessmentSolution.create({
    studentId: req.user?._id,
    assessmentId,
    durationInSeconds,
    studentAnswers,
    lateSubmission,
  });

  //TODO: Invoke AI to grade submission

  return res.status(201).json({
    message: MESSAGES.ASSESSMENT_SUBMITTED_SUCCESS,
  });
});

exports.updateAssessment = catchAsyncErrors(async (req, res, next) => {
  const { assessmentId } = req.params;
  const {
    assessmentName,
    description,
    openDate,
    dueDate,
    duration,
    questions,
    allowManualGrading,
  } = req.body;

  let assessment = await Assessment.findById(assessmentId);

  if (!assessment) {
    return next(new ErrorHandler(MESSAGES.ASSESSMENT_NOT_FOUND, 404));
  }

  const classBelongsToTeacher = await Class.findOne({
    teacherId: req.user?._id,
    _id: assessment.classId,
  });

  if (!classBelongsToTeacher) {
    return next(new ErrorHandler(MESSAGES.ASSESSMENT_NOT_ACCESSIBLE, 403));
  }

  if (!!assessmentName) {
    const duplicateAssessment = await Assessment.findOne({
      assessmentName,
      _id: {
        $ne: assessmentId,
      },
    });

    if (duplicateAssessment) {
      return next(new ErrorHandler(MESSAGES.ASSESSMENT_WITH_SAME_NAME, 409));
    }
  }

  const assessmentIsSolved = await AssessmentSolution.find({
    assessmentId,
  });

  if (assessmentIsSolved?.length) {
    return next(new ErrorHandler(MESSAGES.ASSESSMENT_SUBMITTED_BY_ONE, 403));
  }

  if (
    !!assessmentName ||
    !!description ||
    !!openDate ||
    !!dueDate ||
    !!duration ||
    allowManualGrading !== undefined
  ) {
    assessment = await Assessment.findByIdAndUpdate(
      assessmentId,
      {
        ...(!!assessmentName && { assessmentName }),
        ...(!!description && { description }),
        ...(!!openDate && { openDate }),
        ...(!!dueDate && { dueDate }),
        ...(!!duration && { duration }),
        ...(allowManualGrading !== undefined && { allowManualGrading }),
      },
      {
        new: true,
      }
    );
  }

  let modifiedAssessmentQuestions = [];

  const assessmentQuestions = await Question.find({
    assessmentId,
  });

  if (!!questions) {
    try {
      const conn = mongoose.connection;

      const existingQuestionIds = assessmentQuestions.map(
        (question) => question._id
      );

      const incomingQuestionIds = questions.map((question) => {
        if (!!question._id) {
          return question._id;
        }
      });

      const deletedQuestionIds = existingQuestionIds.filter(
        (id) => !incomingQuestionIds.includes(id)
      );

      const newQuestions = questions
        .map((question) => {
          if (!question._id) {
            return question;
          }
        })
        .filter((question) => !!question);

      const oldOrUpdatedQuestions = questions
        .map((question) => {
          if (!!question._id) {
            return question;
          }
        })
        .filter((question) => !!question);

      const session = await conn.startSession();

      await session.withTransaction(async () => {
        let newQuestionsData = newQuestions.map((question) => ({
          ...question,
          assessmentId,
        }));

        let questionsCreated = newQuestionsData
          ? await Question.create(newQuestionsData)
          : [];

        let oldOrUpdatedQuestionsPromises = [];

        oldOrUpdatedQuestions.forEach((question) => {
          const { _id, ...questionData } = question;

          oldOrUpdatedQuestionsPromises.push(
            Question.updateOne(
              {
                _id,
              },
              { ...questionData, assessmentId },
              { new: true }
            )
          );
        });

        await Question.deleteMany({
          _id: {
            $in: deletedQuestionIds,
          },
        });

        await Promise.all(oldOrUpdatedQuestionsPromises);

        modifiedAssessmentQuestions = [
          ...oldOrUpdatedQuestions,
          ...questionsCreated,
        ];

        const totalMarks = modifiedAssessmentQuestions.reduce(
          (acc, curr) => acc + curr.totalMarks,
          0
        );

        assessment = await Assessment.findByIdAndUpdate(assessmentId, {
          totalMarks,
        });
      });
      session.endSession();

      assessment.questions = modifiedAssessmentQuestions;
      return res.status(200).json({
        success: true,
        message: MESSAGES.ASSESSMENT_UPDATED,
        assessment,
        questions: modifiedAssessmentQuestions,
      });
    } catch (err) {
      return next(err);
    }
  }

  return res.status(200).json({
    success: true,
    message: MESSAGES.ASSESSMENT_UPDATED,
    assessment,
    questions: assessmentQuestions,
  });
});

exports.manuallyGradeAssessment = catchAsyncErrors(async (req, res, next) => {
  const { assessmentSolutionId } = req.params;
  const { marking } = req.body;

  const assessmentSolution = await AssessmentSolution.findById(
    assessmentSolutionId
  )
    .populate({
      path: "studentAnswers",
      populate: { path: "question", model: "Question" },
    })
    .exec();

  if (!assessmentSolution) {
    return next(new ErrorHandler(MESSAGES.ASSESSMENT_SOLUTION_NOT_FOUND, 404));
  }

  const questionIdsToGrade = assessmentSolution.studentAnswers?.map(
    (answer) => answer.question?._id
  );

  if (
    assessmentSolution.studentAnswers?.length !== Object.keys(marking).length
  ) {
    return next(new ErrorHandler(MESSAGES.ASSESSMENT_QUESTION_NOT_GRADED, 400));
  }

  questionIdsToGrade.forEach((questionId) => {
    console.log(questionId);
    if (!marking[questionId]) {
      return next(
        new ErrorHandler(MESSAGES.ASSESSMENT_QUESTION_NOT_GRADED, 400)
      );
    }
  });

  let marksObtained = 0;

  assessmentSolution.studentAnswers?.forEach((answer, index) => {
    if (!!answer.question?._id) {
      assessmentSolution.studentAnswers[index].marks =
        marking[answer.question._id];
      marksObtained += marking[answer.question._id];
    }
  });

  assessmentSolution.status = assessmentSolutionStatus.GRADED;
  assessmentSolution.obtainedMarks = marksObtained;

  await assessmentSolution.save();

  return res.status(200).json({
    message: "Graded",
    assessmentSolution,
  });
});

exports.deleteAssessment = catchAsyncErrors(async (req, res, next) => {

  const { assessmentId } = req.params;

  const assessment = await Assessment.findById(assessmentId);

  if (!assessment) {
    return next(new ErrorHandler(MESSAGES.ASSESSMENT_NOT_FOUND, 404));
  }

  const classBelongsToTeacher = await Class.findOne({
    teacherId: req.user?._id,
    _id: assessment.classId,
  });

  if (!classBelongsToTeacher) {
    return next(new ErrorHandler(MESSAGES.ASSESSMENT_NOT_ACCESSIBLE, 403));
  }

  const assessmentIsSolved = await AssessmentSolution.find({
    assessmentId,
  });

  if (assessmentIsSolved?.length) {
    await AssessmentSolution.deleteMany({ 
      assessmentId: { assessmentId } 
    });
  }

  await Assessment.deleteOne({
    _id: assessmentId,

  });

  // Paginated list of assessments returned
  
  return res.status(200).json({
    message: MESSAGES.ASSESSMENT_DELETED,
  });

});