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
const {
  assessmentSolutionStatus,
  assessmentStatus,
} = require("../constants/assessment");
const { gradeSolution } = require("./aiService");
const { applyPagination } = require("../utils/generalHelpers");

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

  if (
    Date.now() <
    new Date(assessment.dueDate).getTime() + assessment.duration
  ) {
    return next(new ErrorHandler(MESSAGES.ASSESSMENT_GRADING_PROCESS, 403));
  }

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
    })
      .populate({
        path: "studentAnswers",
        populate: {
          path: "question",
          model: "Question",
          select: {
            _id: 1,
            questionType: 1,
            question: 1,
            totalMarks: 1,
            options: 1,
          },
        },
      })
      .exec();

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

  let studentAnswers = assessmentSolution?.studentAnswers;

  return res.status(200).json({
    assessment,
    questions,
    studentAnswers,
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

  let solution = await AssessmentSolution.create({
    studentId: req.user?._id,
    assessmentId,
    durationInSeconds,
    studentAnswers,
    lateSubmission,
  });

  //TODO: Invoke AI to grade submission
  await gradeSolution(solution);

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
      assessmentId: { assessmentId },
    });
  }

  await Question.deleteMany({
    assessmentId,
  });

  await Assessment.deleteOne({
    _id: assessmentId,
  });

  // Paginated list of assessments returned

  return res.status(200).json({
    message: MESSAGES.ASSESSMENT_DELETED,
  });
});

exports.getAssessmentListing = async (req, res, next) => {
  const { classId, keyword } = req.query;

  let classIds = [];
  if (req.user?.role === USER_ROLE.STUDENT && !!classId) {
    const registeredInClass = await ClassRegistration.findOne({
      classId,
      studentId: req.user?._id,
    });

    if (!registeredInClass) {
      return next(
        new ErrorHandler(MESSAGES.ASSESSMENT_CANNOT_VIEW_FOR_THIS_CLASS, 403)
      );
    }
  } else if (req.user?.role === USER_ROLE.STUDENT && !classId) {
    classIds = (
      await ClassRegistration.find(
        {
          studentId: req.user?._id,
        },
        "classId"
      )
    ).map((classRegistration) => classRegistration.classId);
  }

  if (req.user?.role === USER_ROLE.TEACHER && !!classId) {
    const classBelongsToTeacher = await Class.findOne({
      _id: classId,
      teacherId: req.user?._id,
    });

    if (!classBelongsToTeacher) {
      return next(
        new ErrorHandler(MESSAGES.ASSESSMENT_CANNOT_VIEW_FOR_THIS_CLASS, 403)
      );
    }
  }

  const whereParams = {
    ...(req.user?.role === USER_ROLE.STUDENT && {
      classId: {
        $in: classIds,
      },
    }),
    ...(!!classId && { classId }),
    ...(req.user?.role === USER_ROLE.TEACHER && { teacherId: req.user?._id }),
    ...(!!keyword && {
      $or: [
        {
          assessmentName: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          description: {
            $regex: keyword,
            $options: "i",
          },
        },
      ],
    }),
  };

  let assessments = await applyPagination(
    Assessment.find(
      whereParams,
      "_id assessmentName openDate dueDate description duration totalMarks createdAt"
    ),
    req.query
  )
    .populate({
      path: "classId",
      select: {
        _id: 1,
        className: 1,
        courseCode: 1,
        classDescription: 1,
      },
    })
    .exec();
  const count = await Assessment.count(whereParams);

  let attempted = {};
  if (req.user?.role === USER_ROLE.STUDENT) {
    (
      await AssessmentSolution.find(
        {
          studentId: req.user?._id,
        },
        "_id"
      )
    ).forEach((solution) => (attempted[solution._id] = true));
  }

  let status = "";
  assessments = assessments.map((assessment) => {
    status = "";

    let currentTimestamp = Date.now();
    let dueDateTimestamp = new Date(assessment.dueDate).getTime();
    let openDateTimestamp = new Date(assessment.openDate).getTime();

    switch (req.user?.role) {
      case USER_ROLE.STUDENT: {
        if (
          attempted[assessment._id] &&
          currentTimestamp < dueDateTimestamp + assessment.duration
        ) {
          status = assessmentStatus.UNGRADED;
        } else if (attempted[assessment._id]) {
          status = assessmentStatus.GRADED;
        } else if (
          !attempted[assessment._id] &&
          currentTimestamp > dueDateTimestamp + assessment.duration
        ) {
          status = assessmentStatus.EXPIRED;
        } else if (currentTimestamp < openDateTimestamp) {
          status = assessmentStatus.INACTIVE;
        } else if (currentTimestamp >= openDateTimestamp) {
          status = assessmentStatus.ACTIVE;
        }
        break;
      }
      case USER_ROLE.TEACHER: {
        if (currentTimestamp < openDateTimestamp) {
          status = assessmentStatus.INACTIVE;
        } else if (currentTimestamp >= openDateTimestamp) {
          status = assessmentStatus.ACTIVE;
        } else if (currentTimestamp > dueDateTimestamp + assessment.duration) {
          status = assessmentStatus.EXPIRED;
        }
        break;
      }
    }

    assessment.status = status || assessment.status;

    return assessment;
  });

  return res.status(200).json({
    success: true,
    assessments,
    count,
  });
};
