const router = require("express").Router();
const assessmentService = require("../services/assessmentService");
const assessmentValidatorSchema = require("../validators/assessmentValidatorSchema");
const SchemaValidator = require("../middlewares/SchemaValidator");
const { isAuthenticatedUser } = require("../middlewares/auth");
const { USER_ROLE } = require("../constants/user");
const validator = new SchemaValidator();

// router.get(
//   "/",
//   isAuthenticatedUser(),
//   validator.query(assessmentValidatorSchema.assessmentListingRequestModel),
//   assessmentService.getAssessmentListing
// );

router.post(
  "/create-assessment/:classId",
  isAuthenticatedUser(USER_ROLE.TEACHER),
  validator.body(assessmentValidatorSchema.createAssessmentRequestModel),
  assessmentService.createAssessment
);

router.get(
  "/view-assessment/:assessmentId",
  isAuthenticatedUser(),
  assessmentService.viewAssessment
);

router.post(
  "/submit-assessment/:assessmentId",
  isAuthenticatedUser(USER_ROLE.STUDENT),
  assessmentService.submitAssessment
);

router.patch(
  "/update-assessment/:assessmentId",
  validator.body(assessmentValidatorSchema.updateAssessmentRequestModel),
  isAuthenticatedUser(USER_ROLE.TEACHER),
  assessmentService.updateAssessment
);

router.post(
  "/grade-assessment-manually/:assessmentSolutionId",
  validator.body(assessmentValidatorSchema.manuallyGradeAssessmentRequestModel),
  isAuthenticatedUser(USER_ROLE.TEACHER),
  assessmentService.manuallyGradeAssessment
);

router.delete(
  "/delete-assessment/:assessmentId",
  isAuthenticatedUser(USER_ROLE.TEACHER),
  assessmentService.deleteAssessment
);

module.exports = router;
