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

const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const sendEmail = require("../utils/sendEmail");
const ErrorHandler = require("../utils/errorHandler");

exports.createClass = catchAsyncErrors(async (req, res, next) => {
  const { className, classDescription } = req.body;
  const { courseCode } = req.params;
  const teacherId = req.user._id;

  const user = await Teacher.findOne({ _id: teacherId });

  if (!user) {
    return next(new ErrorHandler(MESSAGES.USER_NOT_FOUND, 404));
  }

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

exports.postAnnouncement = catchAsyncErrors(async (req, res, next) => {
  const { date, title, description } = req.body;
  const { classCode } = req.params;
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

  const newAnnouncement = await Announcement.create({
    classCode,
    date,
    description,
    title,
  });

  const announcement = await Announcement.find({ classCode: classCode });

  return res.status(200).json({
    success: true,
    message: MESSAGES.ANNOUNCEMENT_CREATION_SUCCESS,
    announcement,
  });
});

exports.updateClass = catchAsyncErrors(async (req, res) => {
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

const addStudentToClass = async (classToRegisterIn, email, multiple) => {
  let studentExists;

  studentExists = await Student.findOne({
    email,
  });

  const studentAlreadyRegistered = await ClassRegistration.findOne({
    email,
    classId: classToRegisterIn._id,
  });

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

  await StudentRegistrationRequest.findOneAndUpdate(
    {
      classId: classToRegisterIn._id,
      email,
    },
    {
      classId: classToRegisterIn._id,
      email,
    },
    { upsert: true }
  );

  await sendEmail({
    email,
    subject: `Register for ${classToRegisterIn.className} on RapidCheck`,
    message: `<p>Hello, please register, thsnsk</p>`,
  });

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

  const studentAlreadyRegistered = await ClassRegistration.findOne({
    email,
    classId: classToRegisterIn._id,
  });

  if (!!studentAlreadyRegistered) {
    return next(new ErrorHandler(MESSAGES.STUDENT_ALREADY_ADDED_TO_CLASS, 409));
  }

  if (!classExists) {
    return next(new ErrorHandler(MESSAGES.CLASS_NOT_FOUND, 404));
  }

  await addStudentToClass(classExists, email, false);
});

exports.addMultipleStudentsToClass = catchAsyncErrors(
  async (req, res, next) => {
    const { classId } = req.params;
    const busboy = Busboy({ headers: req.headers });

    const classExists = await Class.findById(classId);

    if (!classExists) {
      return next(new ErrorHandler(MESSAGES.CLASS_NOT_FOUND, 404));
    }

    const options = {
      objectMode: true,
      quote: null,
      headers: true,
      renameHeaders: false,
    };

    let studentRegistrationPromises = [];
    let studentEmails = [];
    let incompleteData = false;

    busboy.on("file", (fieldName, file, fileName, encoding, mimeType) => {
      file.pipe(csv.parse(options)).on("data", (data) => {
        if (!data["email"]) {
          incompleteData = true;
          return;
        } else {
          studentEmails.push(data["email"]);
        }
      });
    });

    busboy.on("finish", async () => {
      if (incompleteData) {
        return next(new ErrorHandler(MESSAGES.EMAIL_MISSING_IN_CSV_ROW, 400));
      }

      studentEmails.forEach((email) =>
        studentRegistrationPromises.push(
          addStudentToClass(classExists, email, true)
        )
      );
      await Promise.all(studentRegistrationPromises);

      return res.status(201).json({
        success: true,
        message: "Successfully processed request",
      });
    });

    req.pipe(busboy);
  }
);
