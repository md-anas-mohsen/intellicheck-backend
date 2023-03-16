const router = require("express").Router();
const userService = require("../services/userService");
const userValidatorSchema = require("../validators/userValidatorSchema");
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
  "/refresh-token",
  validator.body(userValidatorSchema.refreshUserTokenRequestModel),
  userService.refreshToken
);

router.post(
  "/",
  isAuthenticatedUser("admin"),
  validator.body(userValidatorSchema.createUserRequestModel),
  userService.createUser
);

router.patch(
  "/:id",
  isAuthenticatedUser(),
  validator.body(userValidatorSchema.updateUserUsingAdminPrivilegeRequestModel),
  userService.updateUser
);

router.delete("/:id", isAuthenticatedUser("admin"), userService.deleteUser);

module.exports = router;
