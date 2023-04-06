const router = require("express").Router();
const classService = require("../services/classService");
const classValidatorSchema = require("../validators/classValidatorSchema");
const announcementValidatorSchema = require("../validators/announcementValidatorSchema");
const SchemaValidator = require("../middlewares/SchemaValidator");
const { isAuthenticatedUser } = require("../middlewares/auth");
const { USER_ROLE } = require("../constants/user");
const validator = new SchemaValidator();

router.post(
  "/create-class",
  isAuthenticatedUser(USER_ROLE.TEACHER),
  validator.body(classValidatorSchema.createClassRequestModel),
  classService.createClass
);

router.patch(
  "/update-class/:classId",
  isAuthenticatedUser(USER_ROLE.TEACHER),
  validator.body(classValidatorSchema.updateClassRequestModel),
  classService.updateClass
);

router.post(
  "/post-announcement/:classId",
  isAuthenticatedUser(USER_ROLE.TEACHER),
  validator.body(announcementValidatorSchema.postAnnouncementRequestModel),
  classService.postAnnouncement
);

router.post(
  "/add-single-student/:classId",
  isAuthenticatedUser(USER_ROLE.TEACHER),
  validator.body(classValidatorSchema.addSingleStudentToClassRequestModel),
  classService.addSingleStudentToClass
);

router.post(
  "/add-multiple-students/:classId",
  isAuthenticatedUser(USER_ROLE.TEACHER),
  classService.addMultipleStudentsToClass
);

router.get(
  "/get-class-students/:classId",
  isAuthenticatedUser(USER_ROLE.TEACHER),
  validator.query(classValidatorSchema.getClassStudentsRequestModel),
  classService.getClassStudents
);

module.exports = router;
