const Busboy = require("busboy");
const csv = require("fast-csv");
const mongoose = require("mongoose");
const events = require("events");
const eventEmitter = new events.EventEmitter();

const { setAuthToken, verifyRefreshToken } = require("../utils/authToken");
const MESSAGES = require("../constants/messages");

const Student = require("../models/student");
const Teacher = require("../models/teacher");
const Course = require("../models/course");
const Class = require("../models/class");
const Announcement = require("../models/announcement");
const ClassRegistration = require("../models/classRegistration");
const StudentRegistrationRequest = require("../models/studentRegistrationRequest");
const Assessment = require("../models/assessment");
const AssessmentSolution = require("../models/assessmentSolution");

const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const sendEmail = require("../utils/email/sendEmail");
const ErrorHandler = require("../utils/errorHandler");
const { applyPagination } = require("../utils/generalHelpers");
const { readCSV2JSON } = require("../utils/fileHelper");
const classRegistration = require("../models/classRegistration");
const { USER_ROLE } = require("../constants/user");
const { studentEvents, classEvents } = require("../constants/events");
const { enqueueEmail } = require("../utils/queueHelper");
const registrationRequestEmailTemplate = require("../utils/email/templates/registrationRequestEmail");
const {
  announcementPostedNotification,
} = require("../events/announcementEvents");
const { assessmentSolutionStatus } = require("../constants/assessment");

const registrationRequestNotificationHandler = async ({
  teacherName,
  className,
  email,
}) => {
  await enqueueEmail({
    email,
    subject: `Register on RapidCheck to join ${className}`,
    message: registrationRequestEmailTemplate({ teacherName, className }),
  });
};

eventEmitter.addListener(
  studentEvents.STUDENT_REGISTRATION_REQUEST_NOTIFICATION,
  registrationRequestNotificationHandler
);

eventEmitter.addListener(
  classEvents.ANNOUNCEMENT_POSTED,
  announcementPostedNotification
);

exports.createClass = catchAsyncErrors(async (req, res, next) => {
  const { className, courseCode, classDescription } = req.body;
  const teacherId = req.user._id;

  const verifyCourse = await Course.findOne({
    courseCode,
  });

  if (!verifyCourse) {
    return next(new ErrorHandler(MESSAGES.COURSE_NOT_FOUND, 404));
  }

  const existingCourseName = await Class.findOne({ className: className });

  if (existingCourseName) {
    return next(new ErrorHandler("Class Name not available", 409));
  }

  const newClass = await Class.create({
    courseCode,
    teacherId,
    classDescription,
    className,
  });

  return res.status(200).json({
    success: true,
    message: MESSAGES.CLASS_CREATION_SUCCESS,
    class: newClass,
  });
});

exports.getClassDetail = catchAsyncErrors(async (req, res, next) => {
  const { classId } = req.params;

  const teacherHasClass = await Class.findOne({
    _id: classId,
    teacherId: req.user?._id,
  });

  if (!teacherHasClass) {
    return next(new ErrorHandler(MESSAGES.TEACHER_CLASS_NOT_FOUND, 403));
  }

  const classDetail = await Class.find(
    { _id: classId },
    { _id: 1, className: 1, classDescription: 1, courseCode: 1 }
  );

  return res.status(200).json({
    success: true,
    message: MESSAGES.CLASS_DETAIL_FETCHED,
    classDetail: classDetail,
  });
});

exports.postAnnouncement = catchAsyncErrors(async (req, res, next) => {
  const { date, title, description } = req.body;
  const { classId } = req.params;
  const teacherId = req.user._id;

  const teacherHasClass = await Class.findOne({
    teacherId: teacherId,
    _id: classId,
  });

  if (!teacherHasClass) {
    return next(new ErrorHandler(MESSAGES.TEACHER_CLASS_NOT_FOUND, 403));
  }

  // const existingTitle = await Announcement.findOne({ title: title });

  // if (existingTitle) {
  //   return next(new ErrorHandler("Title not available", 409));
  // }

  const announcement = await Announcement.create({
    classId,
    description,
    title,
  });

  eventEmitter.emit(classEvents.ANNOUNCEMENT_POSTED, {
    announcement,
    teacherName: `${req.user?.firstName} ${req.user?.lastName}`,
    classId,
  });

  return res.status(200).json({
    success: true,
    message: MESSAGES.ANNOUNCEMENT_CREATION_SUCCESS,
    announcement,
  });
});

exports.updateClass = catchAsyncErrors(async (req, res, next) => {
  const classId = req.params.classId;
  const { className, classDescription } = req.body;

  let classExists = await Class.findById(classId);

  if (!classExists) {
    return next(new ErrorHandler(MESSAGES.CLASS_NOT_FOUND, 404));
  }

  classExists = await Class.findByIdAndUpdate(
    classId,
    {
      ...(!!className && { className }),
      ...(!!classDescription && { classDescription }),
    },
    {
      new: true,
    }
  );

  return res.status(200).json({
    success: true,
    message: MESSAGES.CLASS_UPDATED,
    class: classExists,
  });
});

const addStudentToClass = async (
  classToRegisterIn,
  email,
  multiple,
  { res, next }
) => {
  let studentExists;

  studentExists = await Student.findOne({
    email,
  });

  const studentAlreadyRegistered = !!studentExists
    ? await ClassRegistration.findOne({
        studentId: studentExists?._id,
        classId: classToRegisterIn._id,
      })
    : null;

  if (!!studentAlreadyRegistered && !multiple) {
    return next(new ErrorHandler(MESSAGES.STUDENT_ALREADY_ADDED_TO_CLASS));
  }

  if (!!studentExists) {
    //register student to class if the student is already on the app
    await ClassRegistration.findOneAndUpdate(
      {
        classId: classToRegisterIn._id,
        studentId: studentExists._id,
      },
      {
        classId: classToRegisterIn._id,
        studentId: studentExists._id,
      },
      { upsert: true }
    );

    if (!multiple) {
      return res.status(200).json({
        success: true,
        message: MESSAGES.STUDENT_ADDED_TO_CLASS,
      });
    }
    return;
  }

  let studentRegistrationRequest = await StudentRegistrationRequest.findOne({
    classId: classToRegisterIn._id,
    email,
  });

  if (!studentRegistrationRequest) {
    await StudentRegistrationRequest.create({
      classId: classToRegisterIn._id,
      email,
    });
  }

  if (!studentRegistrationRequest) {
    eventEmitter.emit(studentEvents.STUDENT_REGISTRATION_REQUEST_NOTIFICATION, {
      teacherName: `${classToRegisterIn.teacherId?.firstName} ${classToRegisterIn.teacherId?.lastName}`,
      className: classToRegisterIn.className,
      email,
    });
  }

  if (!multiple) {
    return res.status(200).json({
      success: true,
      message: MESSAGES.STUDENT_REGISTRATION_REQUEST_SENT,
    });
  }
};

exports.addSingleStudentToClass = catchAsyncErrors(async (req, res, next) => {
  const classId = req.params.classId;
  const { email } = req.body;

  let classExists;

  classExists = await Class.findOne({ _id: classId }).populate({
    path: "teacherId",
    model: "Teacher",
  });

  // const studentAlreadyRegistered = await ClassRegistration.findOne({
  //   email,
  //   classId: classExists._id,
  // });

  // if (!!studentAlreadyRegistered) {
  //   return next(new ErrorHandler(MESSAGES.STUDENT_ALREADY_ADDED_TO_CLASS, 409));
  // }

  if (!classExists) {
    return next(new ErrorHandler(MESSAGES.CLASS_NOT_FOUND, 404));
  }

  await addStudentToClass(classExists, email, false, { res, next });
});

exports.addMultipleStudentsToClass = catchAsyncErrors(
  async (req, res, next) => {
    const { classId } = req.params;
    const busboy = Busboy({ headers: req.headers });

    const classExists = await Class.findOne({ _id: classId }).populate({
      path: "teacherId",
      model: "Teacher",
    });

    if (!classExists) {
      return next(new ErrorHandler(MESSAGES.CLASS_NOT_FOUND, 404));
    }

    let studentRegistrationPromises = [];
    let studentEmails = (await readCSV2JSON(req, "students")).map(
      (data) => data.email
    );

    studentEmails.forEach((email) =>
      studentRegistrationPromises.push(
        addStudentToClass(classExists, email, true, { res, next })
      )
    );
    await Promise.all(studentRegistrationPromises);

    return res.status(201).json({
      success: true,
      message: "Successfully processed request",
    });
  }
);

exports.getClassStudents = catchAsyncErrors(async (req, res, next) => {
  const classId = req.params.classId;
  const teacherId = req.user._id;
  const { keyword } = req.query;

  const teacherHasClass = await Class.findOne({
    teacherId,
    _id: classId,
  });

  if (!teacherHasClass) {
    return next(new ErrorHandler(MESSAGES.TEACHER_CLASS_NOT_FOUND, 403));
  }

  let studentIds = (
    await ClassRegistration.find(
      {
        classId,
      },
      "studentId"
    )
  ).map((registration) => registration.studentId);

  const whereParams = {
    classId,
    _id: {
      $in: studentIds,
    },
    ...(!!keyword && {
      $or: [
        {
          firstName: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          lastName: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          username: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          email: {
            $regex: keyword,
            $options: "i",
          },
        },
      ],
    }),
  };

  const students = await applyPagination(Student.find(whereParams), req.query);
  const count = await Student.count(whereParams);

  return res.status(200).json({
    success: true,
    students,
    count,
  });
});

exports.getClassUnregisteredStudents = catchAsyncErrors(
  async (req, res, next) => {
    const classId = req.params.classId;
    const teacherId = req.user._id;
    const { keyword } = req.query;

    const teacherHasClass = await Class.findOne({
      teacherId,
      _id: classId,
    });

    if (!teacherHasClass) {
      return next(new ErrorHandler(MESSAGES.TEACHER_CLASS_NOT_FOUND, 403));
    }

    const whereParams = {
      classId: classId,
      ...(!!keyword && {
        $or: [
          {
            email: {
              $regex: keyword,
              $options: "i",
            },
          },
        ],
      }),
    };

    const UnregisteredStudents = await applyPagination(
      StudentRegistrationRequest.find(whereParams),
      req.query
    );
    const count = await StudentRegistrationRequest.count(whereParams);

    return res.status(200).json({
      success: true,
      UnregisteredStudents,
      count,
    });
  }
);

exports.removeStudent = catchAsyncErrors(async (req, res, next) => {
  const { classId } = req.params;
  const { studentId } = req.params;
  const { keyword } = req.query;

  const teacherHasClass = await Class.findOne({
    _id: classId,
    teacherId: req.user?._id,
  });

  if (!teacherHasClass) {
    return next(new ErrorHandler(MESSAGES.TEACHER_CLASS_NOT_FOUND, 403));
  }

  await classRegistration.deleteOne({
    studentId: studentId,
    classId: classId,
  });

  const assessments = await Assessment.find({ classId: classId }, { _id: 1 });

  const assessmentIds = assessments.map((assessment) => assessment._id);

  await AssessmentSolution.deleteMany({
    studentId: studentId,
    assessmentId: { $in: assessmentIds },
  });

  return res.status(200).json({
    success: true,
    message: MESSAGES.STUDENT_REMOVED_FROM_CLASS,
  });
});

exports.removeUnregisteredStudent = catchAsyncErrors(async (req, res, next) => {
  const { classId } = req.params;
  const { email } = req.params;

  const teacherHasClass = await Class.findOne({
    _id: classId,
    teacherId: req.user?._id,
  });

  if (!teacherHasClass) {
    return next(new ErrorHandler(MESSAGES.TEACHER_CLASS_NOT_FOUND, 403));
  }

  await StudentRegistrationRequest.deleteOne({
    email: email,
    classId: classId,
  });

  return res.status(200).json({
    success: true,
    message: MESSAGES.UNREGISTERED_STUDENT_REMOVED_FROM_CLASS,
  });
});

exports.viewAnnouncements = catchAsyncErrors(async (req, res, next) => {
  const { classId } = req.params;
  const { keyword } = req.query;

  if (req.user?.role === USER_ROLE.TEACHER) {
    const teacherHasClass = await Class.findOne({
      _id: classId,
      teacherId: req.user?._id,
    });

    if (!teacherHasClass) {
      return next(new ErrorHandler(MESSAGES.TEACHER_CLASS_NOT_FOUND, 403));
    }
  } else if (req.user?.role === USER_ROLE.STUDENT) {
    const studentHasClass = await ClassRegistration.findOne({
      classid: classId,
      studentId: req.user?._id,
    });

    if (!studentHasClass) {
      return next(new ErrorHandler(MESSAGES.STUDENT_CLASS_NOT_FOUND, 403));
    }
  }

  const whereParams = {
    classId: classId,
    ...(!!keyword && {
      $or: [
        {
          description: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          title: {
            $regex: keyword,
            $options: "i",
          },
        },
      ],
    }),
  };

  const announcements = await applyPagination(
    Announcement.find(whereParams, "title description _id"),
    req.query
  );

  const count = await Announcement.count(whereParams);

  return res.status(200).json({
    success: true,
    message: MESSAGES.ANNOUCEMENTS_FETCHED,
    announcements,
    count,
  });
});
exports.getClasses = catchAsyncErrors(async (req, res, next) => {
  const { keyword, courseCode } = req.query;

  const whereParams = {
    ...(!!courseCode && { courseCode }),
    ...(!!keyword && {
      $or: [
        {
          className: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          classDescription: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          courseCode: {
            $regex: keyword,
            $options: "i",
          },
        },
      ],
    }),
  };

  if (req.user?.role === USER_ROLE.STUDENT) {
    const userClasses = await ClassRegistration.find({
      studentId: req.user?._id,
    });

    classIds = userClasses.map((userClass) => userClass.classId);

    whereParams._id = {
      $in: classIds,
    };
  }

  if (req.user?.role === USER_ROLE.TEACHER) {
    whereParams.teacherId = req.user?._id;
  }

  const classes = await applyPagination(Class.find(whereParams), req.query)
    .populate({
      path: "teacherId",
      select: { _id: 1, firstName: 1, lastName: 1 },
    })
    .exec();
  const count = await Class.count(whereParams);

  return res.status(200).json({
    success: true,
    classes,
    count,
  });
});

exports.getAddMultipleStudentsToClassTemplate = catchAsyncErrors(
  async (req, res, next) => {
    const csvData = `${["email"].join(",")}\r\n`;

    res
      .status(200)
      .set({
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="students_enrollment_template.csv"`,
      })
      .send(csvData);
  }
);

exports.getStudentScores = catchAsyncErrors(async (req, res, next) => {
  const { classId } = req.params;
  let { studentId } = req.query;

  switch (req.user?.role) {
    case USER_ROLE.TEACHER: {
      if (!studentId) {
        return next(new ErrorHandler(MESSAGES.STUDENT_ID_NOT_SPECIFIED, 400));
      }

      const studentIsTaughtByTeacher = await ClassRegistration.findOne({
        classId,
        studentId,
      });

      if (!studentIsTaughtByTeacher) {
        return next(new ErrorHandler(MESSAGES.FORBIDDEN, 403));
      }

      studentId = mongoose.Types.ObjectId(studentId);

      break;
    }
    case USER_ROLE.STUDENT: {
      studentId = req.user?._id;
      break;
    }
  }

  let currentTimestamp = Date.now();

  let [solvedAssessments, count, totalObtainedMarks, totalAvailableMarks] =
    await Promise.all([
      applyPagination(
        AssessmentSolution.find({
          studentId,
        })
          .populate({
            path: "assessmentId",
            select: "_id assessmentName totalMarks",
          })
          .select("_id assessmentId obtainedMarks status"),
        req.query
      ),
      AssessmentSolution.count({
        studentId,
      }),
      AssessmentSolution.aggregate([
        {
          $match: {
            studentId,
          },
        },
        {
          $group: {
            _id: null,
            totalObtainedMarks: { $sum: "$obtainedMarks" },
          },
        },
      ]),
      AssessmentSolution.aggregate([
        {
          $lookup: {
            from: "assessments",
            localField: "assessmentId",
            foreignField: "_id",
            as: "assessment",
          },
        },
        {
          $unwind: "$assessment",
        },
        {
          $match: {
            studentId,
            status: {
              $in: [
                assessmentSolutionStatus.GRADED,
                assessmentSolutionStatus.REGRADE_REQUESTED,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalAvailableMarks: { $sum: "$assessment.totalMarks" },
          },
        },
      ]),
    ]);

  let solutions = await AssessmentSolution.find({
    studentId,
    status: {
      $in: [
        assessmentSolutionStatus.GRADED,
        assessmentSolutionStatus.REGRADE_REQUESTED,
      ],
    },
  })
    .populate({
      path: "assessmentId",
      ...(!!classId && { match: { classId } }),
    })
    .exec();

  solutions = solutions.filter((solution) => !!solution.assessmentId);

  let obtainedMarks = 0;
  let totalMarks = 0;

  solutions.forEach((solution) => {
    let dueDateTimestamp = new Date(solution.assessmentId?.dueDate).getTime();

    if (
      currentTimestamp >=
      dueDateTimestamp + solution.assessmentId?.duration
    ) {
      obtainedMarks += solution.obtainedMarks;
      totalMarks += solution.assessmentId?.totalMarks;
    }
  });

  solvedAssessments = solvedAssessments.map((solution) => ({
    _id: solution._id,
    assessmentId: solution.assessmentId?._id,
    assessmentName: solution.assessmentId?.assessmentName,
    obtainedMarks: solution.obtainedMarks,
    totalMarks: solution.assessmentId?.totalMarks,
    status: solution.status,
  }));

  return res.status(200).json({
    // totalObtainedMarks: totalObtainedMarks[0]?.totalObtainedMarks || null,
    // totalAvailableMarks: totalAvailableMarks[0]?.totalAvailableMarks || null,
    totalObtainedMarks: obtainedMarks,
    totalAvailableMarks: totalMarks,
    solvedAssessments,
    count,
  });
});
