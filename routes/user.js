const router = require("express").Router();
const userService = require("../services/userService");
const classService = require("../services/classService");
const userValidatorSchema = require("../validators/userValidatorSchema");
const classValidatorSchema = require("../validators/classValidatorSchema");
const announcementValidatorSchema = require("../validators/announcementValidatorSchema");
const SchemaValidator = require("../middlewares/SchemaValidator");
const { isAuthenticatedUser } = require("../middlewares/auth");
const validator = new SchemaValidator();

router.get(
  "/",
  isAuthenticatedUser("admin"),
  validator.query(userValidatorSchema.userListingRequestModel),
  userService.getUserListing
);

router.get("/me", isAuthenticatedUser(), userService.getUserProfile);

router.get("/:id", isAuthenticatedUser("admin"), userService.getSingleUser);

router.post(
  "/register",
  validator.body(userValidatorSchema.registerUserRequestModel),
  userService.registerUser
);

router.post(
  "/login",
  validator.body(userValidatorSchema.loginUserRequestModel),
  userService.loginUser
);
router.delete("/logout", userService.logout);

router.post(
  "/",
  isAuthenticatedUser("admin"),
  validator.body(userValidatorSchema.createUserRequestModel),
  userService.createUser
);

router.patch(
  "/update-profile",
  isAuthenticatedUser(),
  validator.body(userValidatorSchema.updateUserProfileRequestModel),
  userService.updateProfile
);

router.patch(
  "/update-settings",
  isAuthenticatedUser(),
  validator.body(userValidatorSchema.updateUserSettingsRequestModel),
  userService.updateSettings
);

router.patch(
  "/:id",
  isAuthenticatedUser(),
  validator.body(userValidatorSchema.updateUserUsingAdminPrivilegeRequestModel),
  userService.updateUser
);

router.post(
  "/forgot-password",
  validator.body(userValidatorSchema.forgotPasswordRequestModel),
  userService.forgotPassword
);

router.post(
  "/verify-otp",
  validator.body(userValidatorSchema.verifyOTPRequestModel),
  userService.verifyOTP
);

router.post(
  "/reset-password",
  validator.body(userValidatorSchema.resetPasswordRequestModel),
  userService.resetPassword
);

router.put(
  "/change-password",
  isAuthenticatedUser(),
  validator.body(userValidatorSchema.changePasswordRequestModel),
  userService.changePassword
);

module.exports = router;
