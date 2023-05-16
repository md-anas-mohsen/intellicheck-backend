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

const DeviceSession = require("../models/deviceSession");
const StudentRegistrationRequest = require("../models/studentRegistrationRequest");
const ClassRegistration = require("../models/classRegistration");

const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorHandler");
const Token = require("../models/token");
const { TOKEN_TYPE, PASSCODE_LENGTH } = require("../constants/token");
const sendEmail = require("../utils/sendEmail");
const { enqueueEmail } = require("../utils/queueHelper");

const crypto = require("crypto");

const findTeacherOrStudent = async (role, whereParams) => {
  try {
    user =
      role === USER_ROLE.STUDENT
        ? await Student.findOne(whereParams).select("+password")
        : role === USER_ROLE.TEACHER &&
          (await Teacher.findOne(whereParams).select("+password"));
  } catch (err) {
    console.log(err);
  }

  return user;
};

exports.UserModelFactory = (role) => {
  const Model =
    role === USER_ROLE.STUDENT
      ? Student
      : role === USER_ROLE.TEACHER && Teacher;

  return Model;
};

exports.getUserListing = catchAsyncErrors(async (req, res, next) => {
  const { keyword } = req.query;
  const users = await applyPagination(
    User.searchQuery(keyword, {
      ...req.query,
      exceptUserWithId: req.user._id,
    }),
    req.query
  );
  const count = await User.searchQuery(keyword, {
    exceptUserWithId: req.user._id,
  }).count();

  return res.status(200).json({
    success: true,
    count,
    users,
  });
});

exports.registerUser = catchAsyncErrors(async (req, res, next) => {
  const { username, firstName, lastName, email, password, role } = req.body;

  const userExists = await findTeacherOrStudent(role, {
    $or: [{ email }, { username }],
  });

  if (role === USER_ROLE.STUDENT && !!userExists) {
    return next(new ErrorHandler(MESSAGES.EMAIL_ALREADY_REGISTERED, 409));
  }

  let user;
  const Model = this.UserModelFactory(role);
  user = await Model.create({
    firstName,
    lastName,
    email,
    password,
    username,
  });

  const pendingRegistrationRequests = await StudentRegistrationRequest.find({
    email,
  });

  let registrationData = pendingRegistrationRequests.map((request) => ({
    classId: request.classId,
    studentId: user._id,
  }));

  await ClassRegistration.create(registrationData);

  setAuthToken(user, 201, req, res, MESSAGES.REGISTRATION_SUCCESS);
});

exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { usernameOrEmail, password, role } = req.body;

  let user;
  user = await findTeacherOrStudent(role, {
    $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
  });

  if (!user) {
    return next(new ErrorHandler("Invalid credentials", 401));
  }

  const passwordIsCorrect = await user.comparePassword(password);

  if (!passwordIsCorrect) {
    return next(new ErrorHandler(MESSAGES.INCORRECT_PASSWORD, 401));
  }

  await setAuthToken(user, 200, req, res, MESSAGES.LOGIN_SUCCESS);
});

exports.getUserProfile = catchAsyncErrors(async (req, res) => {
  const Model = this.UserModelFactory(req.user.role);
  const user = await Model.findById(req.user._id);

  res.status(200).json({
    success: true,
    user,
  });
});

exports.createUser = catchAsyncErrors(async (req, res, next) => {
  const { name, email, role, password } = req.body;

  const existingEmail = await this.findTeacherOrStudent(role, { email });

  if (existingEmail) {
    return next(new ErrorHandler("Email already registered", 409));
  }

  const newUser = await User.create({
    name,
    email,
    role,
    password,
  });

  return res.status(200).json({
    success: true,
    message: MESSAGES.USER_CREATION_SUCCESS,
  });
});

exports.updateUser = async (req, res, next) => {
  const { id } = req.params;
  const { name, email, password, role } = req.body;
  const currentUser = req.user;
  const user = await User.findById(id);

  if (req.user._id !== id && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: MESSAGES.INSUFFICIENT_PRIVILEGE,
    });
  }
  if (!user) {
    return res.status(404).json({
      success: false,
      message: MESSAGES.USER_NOT_FOUND,
    });
  }

  if (name) {
    user.name = name;
  }

  if (!!req.body.avatar && req.body.avatar !== "") {
    try {
      const image_id = user.avatar.public_id;
      const res = await cloudinary.v2.uploader.destroy(image_id);

      const result = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: "avatars",
        width: 480,
        crop: "scale",
      });

      user.avatar = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: SERVER_ERROR,
      });
    }
  }

  if (role && currentUser.role === "admin") {
    user.role = role;
  } else if (role && currentUser.role !== "admin") {
    return res.status(403).json({
      success: true,
      message: MESSAGES.INSUFFICIENT_PRIVILEGE,
    });
  }

  if (email) {
    const emailIsUsed = await User.findOne({ email, _id: { $ne: id } });

    if (!!emailIsUsed) {
      return res.status(409).json({
        success: false,
        message: "Email is already used",
      });
    }

    user.email = email;
  }

  if (password && currentUser.role === "admin") {
    user.password = password;
    // user.reAuthenticate = true;
  } else if (password && currentUser.role !== "admin") {
    return res.status(403).json({
      success: true,
      message: MESSAGES.INSUFFICIENT_PRIVILEGE,
    });
  }

  try {
    await user.save();
  } catch (err) {
    return res.status(200).json({
      success: false,
      message: MESSAGES.SERVER_ERROR,
    });
  }

  return res.status(200).json({
    success: true,
    message: MESSAGES.USER_UPDATED,
  });
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      success: true,
      message: MESSAGES.USER_NOT_FOUND,
    });
  }

  let promises = [];

  promises.push(user.delete());
  await Promise.all(promises);

  return res.status(200).json({
    success: true,
    message: MESSAGES.USER_DELETED,
  });
};

exports.getSingleUser = async (req, res) => {
  const { id } = req.params;

  try {
    // const teacherHasClass = await TeacherClass.findOne({
    //   teacherId: req.user.id,
    //   courseId: id
    // })

    // if (!teacherHasClass) {
    //   return res.status(403).json({
    //     success: false,
    //     message:
    //   })
    // }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: true,
        message: MESSAGES.USER_NOT_FOUND,
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: MESSAGES.SERVER_ERROR,
    });
  }
};

exports.logout = catchAsyncErrors(async (req, res) => {
  const { authorization } = req.cookies;

  await DeviceSession.deleteOne({
    authToken: authorization,
  });

  res.cookie("authorization", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: MESSAGES.LOGOUT_SUCCESS,
  });
});

exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const { email, role } = req.body;

  const Model = this.UserModelFactory(role);

  const user = await Model.findOne({
    email,
  });

  if (!user) {
    return next(new ErrorHandler(MESSAGES.USER_NOT_FOUND, 404));
  }

  const code = generatePasscode(PASSCODE_LENGTH);
  let tokenHash = crypto.randomBytes(16).toString("hex");
  tokenHash = crypto.createHash("sha256").update(tokenHash).digest("hex");

  const [token] = await Promise.all([
    Token.findOneAndUpdate(
      {
        userId: user.id,
        tokenType: TOKEN_TYPE.FORGOT_PASSWORD,
        userType: role,
      },
      {
        userId: user.id,
        passcode: code,
        tokenType: TOKEN_TYPE.FORGOT_PASSWORD,
        userType: role,
        tokenHash,
        expiresAt: Date.now() + 10 * 60 * 1000,
        retriesLeft: 3,
      },
      { upsert: true, new: true }
    ),
    Token.findOneAndDelete({
      userId: user.id,
      tokenType: TOKEN_TYPE.RESET_PASSWORD,
      userType: role,
    }),
  ]);

  await enqueueEmail({
    email,
    subject: `RapidCheck | OTP`,
    message: `<p>Here is your OTP</p> <h1>${code}</h1>`,
  });

  // sendEmail({
  //   email,
  //   subject: `RapidCheck | OTP`,
  //   message: `<p>Here is your OTP</p> <h1>${code}</h1>`,
  // });

  return res.status(200).json({
    token: token.tokenHash,
  });
});

exports.verifyOTP = catchAsyncErrors(async (req, res, next) => {
  const { token, code } = req.body;

  const tokenRecord = await Token.findOne({
    tokenHash: token,
  });

  if (!tokenRecord) {
    return next(new ErrorHandler(MESSAGES.INVALID_TOKEN, 404));
  }

  if (Date.now() >= new Date(tokenRecord.expiresAt).getTime()) {
    // await Token.findByIdAndDelete(tokenRecord._id);
    console.log(Date.now());
    console.log(new Date(tokenRecord.expiresAt).getTime());
    return next(new ErrorHandler(MESSAGES.INVALID_TOKEN, 404));
  }

  let retriesLeft = tokenRecord.retriesLeft;

  if (tokenRecord.passcode !== code) {
    retriesLeft -= 1;

    if (retriesLeft <= 0) {
      await Token.findByIdAndDelete(tokenRecord._id);
    } else {
      tokenRecord.retriesLeft = retriesLeft;
      await tokenRecord.save();
    }

    return next(new ErrorHandler(MESSAGES.INVALID_OTP, 403));
  }

  let tokenHash = crypto.randomBytes(16).toString("hex");
  tokenHash = crypto.createHash("sha256").update(tokenHash).digest("hex");

  const resetPasswordToken = await Token.findOneAndUpdate(
    {
      userId: tokenRecord.userId,
      tokenType: TOKEN_TYPE.RESET_PASSWORD,
      userType: tokenRecord.userType,
    },
    {
      userId: tokenRecord.userId,
      tokenType: TOKEN_TYPE.RESET_PASSWORD,
      userType: tokenRecord.userType,
      tokenHash,
      expiresAt: Date.now() + 10 * 60 * 1000,
      retriesLeft: 3,
    },
    { upsert: true, new: true }
  );

  await Token.findByIdAndDelete(tokenRecord._id);

  return res.status(200).json({
    token: resetPasswordToken.tokenHash,
  });
});

exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { token, newPassword, confirmNewPassword } = req.body;

  const resetPasswordToken = await Token.findOne({
    tokenHash: token,
  });

  if (!resetPasswordToken) {
    return next(new ErrorHandler(MESSAGES.INVALID_TOKEN, 404));
  }

  const Model = this.UserModelFactory(resetPasswordToken.userType);
  const user = await Model.findById(resetPasswordToken.userId);

  if (newPassword !== confirmNewPassword) {
    return next(new ErrorHandler(MESSAGES.PASSWORDS_DONOT_MATCH, 400));
  }

  user.password = newPassword;
  await user.save();

  await Token.deleteMany({
    userId: user._id,
    userType: resetPasswordToken.userType,
  });

  return res.status(200).json({
    message: MESSAGES.PASSWORD_RESET_SUCCESSFUL,
  });
});

exports.changePassword = catchAsyncErrors(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const UserModel = this.UserModelFactory(req.user?.role);

  const user = await findTeacherOrStudent(req.user?.role, {
    _id: req.user?._id,
  });

  const passwordIsCorrect = await user.comparePassword(currentPassword);

  if (!passwordIsCorrect) {
    return next(new ErrorHandler(MESSAGES.INCORRECT_PASSWORD, 403));
  }

  user.password = newPassword;

  await user.save();

  return res.status(200).json({
    message: "Password changed successfully",
  });
});

exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
  const UserModel = this.UserModelFactory(req.user?.role);

  const { firstName, lastName, username, email } = req.body;

  if (!!email) {
    const duplicateEmailUser = await UserModel.findOne({
      _id: { $ne: req.user?._id },
      email,
    });

    if (duplicateEmailUser) {
      return next(new ErrorHandler(MESSAGES.EMAIL_ALREADY_REGISTERED, 409));
    }
  }

  if (!!username) {
    const duplicateUsernameUser = await UserModel.findOne({
      _id: { $ne: req.user?._id },
      username,
    });

    if (duplicateUsernameUser) {
      return next(new ErrorHandler(MESSAGES.USERNAME_ALREADY_TAKEN, 409));
    }
  }

  const user = await UserModel.findByIdAndUpdate(
    req.user?._id,
    {
      ...(!!firstName && { firstName }),
      ...(!!lastName && { lastName }),
      ...(!!username && { username }),
      ...(!!email && { email }),
    },
    { new: true }
  );

  return res.status(200).json({
    user,
    message: MESSAGES.PROFILE_UPDATED,
  });
});

exports.updateSettings = catchAsyncErrors(async (req, res, next) => {
  const { notificationsOn, emailsOn } = req.body;

  const user = await findTeacherOrStudent(req.user?.role, {
    id: req.user?._id,
  });

  if (!user.settings) {
    user.settings = {};
  }

  if (notificationsOn !== undefined) {
    user.settings.notificationsOn = notificationsOn;
  }

  if (emailsOn !== undefined) {
    user.settings.emailsOn = emailsOn;
  }

  await user.save();

  return res.status(200).json({
    user,
    message: MESSAGES.SETTINGS_UPDATED,
  });
});
