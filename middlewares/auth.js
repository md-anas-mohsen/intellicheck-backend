const User = require("../models/user");
const jwt = require("jsonwebtoken");
const MESSAGES = require("../constants/messages");

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
      req.user = await User.findById(decoded.id);

      if (req.user.reAuthenticate) {
        return res.status(401).json({
          success: false,
          message: MESSAGES.LOGIN_REQUIRED,
        });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
        return res.status(401).json({
          success: false,
          message: MESSAGES.INSUFFICIENT_PRIVILEGE,
        });
      }
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.LOGIN_REQUIRED,
      });
    }
  };
};
