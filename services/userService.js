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

const UserModelFactory = (role) => {
  const Model =
    role === USER_ROLE.STUDENT
      ? Student
      : role === USER_ROLE.TEACHER && Teacher;

  return Model;
};

exports.getUserListing = async (req, res, next) => {
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
};

exports.registerUser = async function (req, res, next) {
  const { username, firstName, lastName, email, password, role } = req.body;

  const userExists = await findTeacherOrStudent(role, {
    $or: [{ email }, { username }],
  });

  if (role === USER_ROLE.STUDENT && !!userExists) {
    return res.status(409).json({
      success: false,
      message: MESSAGES.EMAIL_ALREADY_REGISTERED,
    });
  }

  let user;
  const Model = UserModelFactory(role);
  try {
    user = await Model.create({
      firstName,
      lastName,
      email,
      password,
      username,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error,
      message: MESSAGES.SERVER_ERROR,
    });
  }

  setAuthToken(user, 201, req, res, MESSAGES.REGISTRATION_SUCCESS);
};

exports.loginUser = async (req, res, next) => {
  const { usernameOrEmail, password, role } = req.body;

  let user;
  try {
    user = await findTeacherOrStudent(role, {
      $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error,
      message: MESSAGES.SERVER_ERROR,
    });
  }

  try {
    const passwordIsCorrect = await user.comparePassword(password);

    if (!passwordIsCorrect) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.INCORRECT_PASSWORD,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: MESSAGES.SERVER_ERROR,
    });
  }

  await setAuthToken(user, 200, req, res, MESSAGES.LOGIN_SUCCESS);
};

exports.getUserProfile = async (req, res) => {
  const Model = UserModelFactory(req.user.role);
  const user = await Model.findById(req.user._id);

  res.status(200).json({
    success: true,
    user,
  });
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    const userId = await verifyRefreshToken(refreshToken);

    const user = await User.findById(userId);

    if (user.reAuthenticate) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.LOGIN_REQUIRED,
      });
    }

    await setAuthToken(user, 200, req, res);
  } catch (error) {
    res.status(401).json({
      success: false,
      message: MESSAGES.INVALID_REFRESH_TOKEN,
    });
  }
};

exports.createUser = async (req, res) => {
  const { name, email, role, password } = req.body;

  const existingEmail = await this.findTeacherOrStudent(role, { email });

  if (existingEmail) {
    return res.status(409).json({
      success: false,
      message: "Email already registered",
    });
  }

  try {
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
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: MESSAGES.SERVER_ERROR,
    });
  }
};

exports.updateUser = async (req, res) => {
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

  const userOrders = await Order.find({
    user: id,
  });

  let promises = [];

  for (let i = 0; i < userOrders.length; i++) {
    promises.push(userOrders[i].delete());
  }

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

exports.logout = async (req, res) => {
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
};

exports.forgotPassword = async (req, res, next) => {
  const { email, role } = req.body;

  const Model = UserModelFactory(role);

  const user = await Model.findOne({
    email,
  });

  if (user) {
    const code = generatePasscode(6);
  }
};
