const Busboy = require("busboy");
const csv = require("fast-csv");

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
const sendEmail = require("../utils/sendEmail");
const ErrorHandler = require("../utils/errorHandler");
const { applyPagination } = require("../utils/generalHelpers");
const { readCSV2JSON } = require("../utils/fileHelper");
const classRegistration = require("../models/classRegistration");

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
  const { classId } = req.params.classId;

  const teacherHasClass = await Class.findOne({
    _id: classId,
    teacherId: req.user?._id,
  });

  if (!teacherHasClass) {
    return next(new ErrorHandler(MESSAGES.TEACHER_CLASS_NOT_FOUND, 403));
  }

  const classDetail = await Class.find({ _id: classId }, { _id: 1, className:1, classDescription:1, courseCode:1  });

  return res.status(200).json({
    success: true,
    message: MESSAGES.CLASS_DETAIL_FETCHED,
    classDetail: classDetail
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

  const existingTitle = await Announcement.findOne({ title: title });

  if (existingTitle) {
     return next("Title not available", 409);
  }

  const announcement = await Announcement.create({
    classId,
    description,
    title,
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
    await sendEmail({
      email,
      subject: `Register for ${classToRegisterIn.className} on RapidCheck`,
      message: `<p>Hello, please register, thsnsk</p>`,
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

  classExists = await Class.findById(classId);

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

    const classExists = await Class.findById(classId);

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


exports.removeStudent = catchAsyncErrors(async (req, res, next) => {
  const { classId } = req.params.classId;
  const { studentId } = req.params.studentId;
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
    assessmentId: { $in: assessmentIds } 
  });

  let studentIds = (
    await ClassRegistration.find(
      {
        classId,
      },
      "studentId"
    )
  ).map((registration) => registration.studentId);

  const whereParams = {
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
    message: MESSAGES.STUDENT_REMOVED_FROM_CLASS,
    students,
    count,
  });
});