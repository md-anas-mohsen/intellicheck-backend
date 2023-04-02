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

const sendEmail = require("../utils/sendEmail");

exports.createClass = async (req, res) => {
  const { className, classDescription } = req.body;
  const { courseCode } = req.params;
  const teacherId = req.user._id;

  try {
    const user = await Teacher.findOne({ _id: teacherId });

    if (!user) {
      return res.status(404).json({
        success: true,
        message: MESSAGES.USER_NOT_FOUND,
      });
    }

    const verifyCourse = await Course.findOne({
      courseCode: courseCode,
    });

    if (!verifyCourse) {
      return res.status(404).json({
        success: true,
        message: MESSAGES.COURSE_NOT_FOUND,
      });
    }

    const existingCourseName = await Class.findOne({ className: className });

    if (existingCourseName) {
      return res.status(409).json({
        success: false,
        message: "Class Name not available",
      });
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
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: MESSAGES.SERVER_ERROR,
    });
  }
};

exports.postAnnouncement = async (req, res) => {
  const { date, title, description } = req.body;
  const { classCode } = req.params;
  const teacherId = req.user._id;

  try {
    const teacherHasClass = await Class.findOne({
      teacherId: teacherId,
      _id: classId,
    });

    if (!teacherHasClass) {
      return res.status(403).json({
        success: false,
        message: MESSAGES.TEACHER_CLASS_NOT_FOUND,
      });
    }

    const existingTitle = await Announcement.findOne({ title: title });

    if (existingTitle) {
      return res.status(409).json({
        success: false,
        message: "Title not available",
      });
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
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: MESSAGES.SERVER_ERROR,
    });
  }
};

const addStudentToClass = async (classToRegisterIn, email, multiple) => {
  let studentExists;

  try {
    studentExists = await Student.findOne({
      email,
    });

    const studentAlreadyRegistered = await ClassRegistration.findOne({
      email,
      classId: classToRegisterIn._id,
    });

    if (!!studentAlreadyRegistered) {
      return res.status(409).json({
        success: false,
        message: MESSAGES.STUDENT_ALREADY_ADDED_TO_CLASS,
      });
    }
  } catch (err) {
    if (!multiple) {
      console.log(error);
      return res.status(500).json({
        success: false,
        error,
        message: MESSAGES.SERVER_ERROR,
      });
    }
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

exports.addSingleStudentToClass = async (req, res) => {
  const classId = req.params.classId;
  const { email } = req.body;

  let classExists;

  try {
    classExists = await Class.findById(classId);

    const studentAlreadyRegistered = await ClassRegistration.findOne({
      email,
      classId: classToRegisterIn._id,
    });

    if (!!studentAlreadyRegistered) {
      return res.status(409).json({
        success: false,
        message: MESSAGES.STUDENT_ALREADY_ADDED_TO_CLASS,
      });
    }

    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.CLASS_NOT_FOUND,
      });
    }

    await addStudentToClass(classExists, email, false);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error,
      message: MESSAGES.SERVER_ERROR,
    });
  }
};

exports.addMultipleStudentsToClass = async (req, res) => {
  const { classId } = req.params;
  const busboy = Busboy({ headers: req.headers });

  const classExists = await Class.findById(classId);

  if (!classExists) {
    return res.status(404).json({
      success: false,
      message: MESSAGES.CLASS_NOT_FOUND,
    });
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
      console.log(data);
      if (!data["email"]) {
        console.log("no email");
        incompleteData = true;
        return;
      } else {
        studentEmails.push(data["email"]);
      }
    });
  });

  busboy.on("finish", async () => {
    try {
      console.log("INCOMPLETE DATA ", incompleteData);
      if (incompleteData) {
        return res.status(400).json({
          success: false,
          message: MESSAGES.EMAIL_MISSING_IN_CSV_ROW,
        });
      }

      studentEmails.forEach((email) =>
        studentRegistrationPromises.push(
          addStudentToClass(classExists, email, true)
        )
      );
      await Promise.all(studentRegistrationPromises);
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        error,
        message: MESSAGES.SERVER_ERROR,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Successfully processed request",
    });
  });

  req.pipe(busboy);
};
