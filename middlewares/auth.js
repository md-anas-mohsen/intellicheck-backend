const Student = require("../models/student");
const Teacher = require("../models/teacher");

const jwt = require("jsonwebtoken");
const MESSAGES = require("../constants/messages");
const { USER_ROLE } = require("../constants/user");
const DeviceSession = require("../models/deviceSession");
const { UserModelFactory } = require("../services/userService");

exports.isAuthenticatedUser = (roles) => {
  return async (req, res, next) => {
    let allowedRoles = [];
    if (roles) {
      if (!Array.isArray(roles)) {
        allowedRoles = roles;
      } else {
        allowedRoles = [roles];
      }
    }

    const { authorization } = req.cookies;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.LOGIN_REQUIRED,
      });
    }

    try {
      const decoded = jwt.verify(
        authorization,
        process.env.JWT_AUTH_TOKEN_SECRET
      );

      const tokenIsValid = await DeviceSession.findOne({
        userId: decoded.id,
        authToken: authorization,
      });

      if (!tokenIsValid) {
        return res.status(401).json({
          success: false,
          message: MESSAGES.LOGIN_REQUIRED,
        });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return res.status(401).json({
          success: false,
          message: MESSAGES.INSUFFICIENT_PRIVILEGE,
        });
      }

      const Model = UserModelFactory(decoded.role);
      const user = await Model.findById(decoded.id);

      // const user =
      //   decoded.role === USER_ROLE.STUDENT
      //     ? await Student.findById(decoded.id)
      //     : decoded.role === USER_ROLE.TEACHER &&
      //       (await Teacher.findById(decoded.id));

      if (!user) {
        return res.status(404).json({
          success: false,
          message: MESSAGES.USER_NOT_FOUND,
        });
      }

      req.user = user;
      req.user.role = decoded.role;

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.LOGIN_REQUIRED,
      });
    }
  };
};
