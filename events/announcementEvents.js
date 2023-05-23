const ClassRegistration = require("../models/classRegistration");
const announcementPostedEmailTemplate = require("../utils/email/templates/announcementPostedEmail");
const { enqueueEmail } = require("../utils/queueHelper");

exports.announcementPostedNotification = async ({
  announcement,
  classId,
  teacherName,
}) => {
  let classStudentsToNotify = await ClassRegistration.find({
    classId,
  })
    .populate({
      path: "studentId",
      match: { "settings.emailsOn": true },
    })
    .exec();

  let emails = classStudentsToNotify
    .map((classStudent) => classStudent.studentId?.email)
    .filter((email) => !!email);

  let promises = emails.map((email) => {
    return enqueueEmail({
      email,
      subject: `${announcement.title}`,
      message: announcementPostedEmailTemplate({
        announcementDescription: announcement.description,
        announcementTitle: announcement.title,
        teacherName,
      }),
    });
  });

  await Promise.all(promises);
};
