const ClassRegistration = require("../models/classRegistration");
const Announcement = require("../models/announcement");

const { enqueueEmail } = require("../utils/queueHelper");
const assessmentRegradedEmailTemplate = require("../utils/email/templates/assessmentRegradedEmail");
const assessmentCreatedEmailTemplate = require("../utils/email/templates/assessmentCreatedEmail");

exports.assessmentRegradedNotification = async ({ assessmentSolution }) => {
  if (assessmentSolution.studentId?.settings?.emailsOn) {
    await enqueueEmail({
      email: assessmentSolution.studentId?.email,
      subject: `${assessmentSolution.assessmentId?.classId?.className} ${assessmentSolution.assessmentId?.assessmentName} Regraded`,
      message: assessmentRegradedEmailTemplate({
        className: assessmentSolution.assessmentId?.classId?.className,
        assessmentName: assessmentSolution.assessmentId?.assessmentName,
        obtainedMarks: assessmentSolution.obtainedMarks,
        totalMarks: assessmentSolution.assessmentId?.totalMarks,
      }),
    });
  }
};

exports.assessmentGradedNotification = async ({ assessmentSolution }) => {
  if (assessmentSolution.studentId?.settings?.emailsOn) {
    await enqueueEmail({
      email: assessmentSolution.studentId?.email,
      subject: `${assessmentSolution.assessmentId?.classId?.className} ${assessmentSolution.assessmentId?.assessmentName} Graded`,
      message: assessmentGradedEmailTemplate({
        className: assessmentSolution.assessmentId?.classId?.className,
        assessmentName: assessmentSolution.assessmentId?.assessmentName,
        obtainedMarks: assessmentSolution.obtainedMarks,
        totalMarks: assessmentSolution.assessmentId?.totalMarks,
      }),
    });
  }
};

exports.assessmentCreatedNotification = async ({
  teacherClass,
  assessment,
}) => {
  const classId = assessment.classId;

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
      subject: `${assessment.assessmentName} Posted`,
      message: assessmentCreatedEmailTemplate({
        className: teacherClass.className,
        assessmentName: assessment.assessmentName,
        duration: assessment.duration / 60,
        totalMarks: assessment.totalMarks,
      }),
    });
  });

  await Announcement.create({
    classId,
    title: `${assessment.assessmentName} Posted`,
    description: `${assessment.assessmentName} has been posted, it is ${
      assessment.duration / 60
    } minute(s) long and is of ${assessment.totalMarks} marks.`,
  });

  await Promise.all(promises);
};
