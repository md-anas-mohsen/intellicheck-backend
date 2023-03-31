const Student = require("../models/student");
const Teacher = require("../models/teacher");
const { setAuthToken, verifyRefreshToken } = require("../utils/authToken");
const MESSAGES = require("../constants/messages");
const {
  applyPagination,
  generatePasscode,
} = require("../utils/generalHelpers");
const { SERVER_ERROR } = require("../constants/messages");
const { USER_ROLE } = require("../constants/user");
const Course = require("../models/course");
const Class = require("../models/class");
const Announcement = require("../models/announcement");

exports.createClass = async (req, res) => {
    const { className, classDescription } = req.body;
    const { courseCode } = req.params;
    const teacherId = req.user._id
  
    try {
      
      const user = await Teacher.findOne({_id: teacherId});
  
      if (!user) {
        return res.status(404).json({
          success: true,
          message: MESSAGES.USER_NOT_FOUND,
        });
      }
  
      const verifyCourse = await Course.findOne({
         courseCode: courseCode
      })
  
      if (!verifyCourse) {
        return res.status(404).json({
          success: true,
          message: MESSAGES.COURSE_NOT_FOUND,
        });
      }
  
      const existingCourseName = await Class.findOne( { className: className });
  
      if (existingCourseName) {
      return res.status(409).json({
        success: false,
        message: "Class Name not available",
      });
      }
  
      const newClass = await Class.create({
        
        courseCode ,
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
    const teacherId = req.user._id
  
    try {
  
      const teacherHasClass = await Class.findOne({
         teacherId: teacherId,
         _id: classId
       })
  
      if (!teacherHasClass) {
         return res.status(403).json({
           success: false,
           message:  MESSAGES.TEACHER_CLASS_NOT_FOUND,
         })
       }
  
      const existingTitle = await Announcement.findOne( { title: title });
  
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
  
      const announcement = await Announcement.find( { classCode: classCode });
  
      return res.status(200).json({
        success: true,
        message: MESSAGES.ANNOUNCEMENT_CREATION_SUCCESS,
        announcement
  
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        message: MESSAGES.SERVER_ERROR,
      });
    }
  
  };