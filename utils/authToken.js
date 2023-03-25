const jwt = require("jsonwebtoken");
const { USER_ROLE } = require("../constants/user");
const DeviceSession = require("../models/deviceSession");

exports.setAuthToken = async (user, statusCode, req, res, message) => {
  const authToken = await user.getJwtToken();
  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  user.password = undefined;

  const decoded = jwt.verify(authToken, process.env.JWT_AUTH_TOKEN_SECRET);

  await DeviceSession.findOneAndUpdate(
    { _id: decoded.id },
    {
      userId: decoded.id,
      userRole: decoded.role,
      authToken,
    },
    { upsert: true }
  );

  req.user = user;
  req.user.role = decoded.role;

  res.status(statusCode).cookie("authorization", authToken, options).json({
    success: true,
    message,
    authToken,
    user,
  });
};

exports.verifyRefreshToken = async (refreshToken) => {
  const decoded = await jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_TOKEN_SECRET
  );
  return decoded.id;
};
