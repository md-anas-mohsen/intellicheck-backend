const router = require("express").Router();
const courseValidatorSchema = require("../validators/courseValidatorSchema");
const SchemaValidator = require("../middlewares/SchemaValidator");
const { isAuthenticatedUser } = require("../middlewares/auth");
const { USER_ROLE } = require("../constants/user");
const validator = new SchemaValidator();

const courseService = require("../services/courseService");

router.get(
  "/",
  isAuthenticatedUser(USER_ROLE.TEACHER),
  validator.query(courseValidatorSchema.courseListingRequestModel),
  courseService.getCourses
);

module.exports = router;
