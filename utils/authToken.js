const jwt = require("jsonwebtoken");

exports.setAuthToken = async (user, statusCode, req, res, message) => {
  const authToken = await user.getJwtToken();
  const refreshToken = await user.getJwtRefreshToken();
  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  user.password = undefined;

  req.user = user;

  res.status(statusCode).cookie("authorization", authToken, options).json({
    success: true,
    message,
    authToken,
    refreshToken,
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
