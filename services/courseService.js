const Course = require("../models/course");

const { applyPagination } = require("../utils/generalHelpers");

exports.getCourses = async (req, res, next) => {
  const { keyword } = req.query;

  const whereParams = {
    ...(!!keyword && {
      $or: [
        {
          courseName: {
            $regex: keyword,
            $options: "i",
          },
          courseCode: {
            $regex: keyword,
            $options: "i",
          },
          courseDescription: {
            $regex: keyword,
            $options: "i",
          },
        },
      ],
    }),
  };

  const courses = await applyPagination(
    Course.find(whereParams, "_id courseCode courseName courseDescription"),
    req.query
  );
  const count = await Course.count(whereParams);

  return res.status(200).json({
    success: true,
    courses,
    count,
  });
};
