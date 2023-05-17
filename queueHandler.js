require("dotenv").config({ path: "./.env" });
require("./config/database");

const { Worker } = require("bullmq");
const chalk = require("chalk");

const { QUEUE_NAMES, QUEUE_CONFIG, QUEUE_JOBS } = require("./constants/queue");

const { gradeSolution } = require("./services/grading/gradingService");
const sendEmail = require("./utils/sendEmail");

const Assessment = require("./models/assessment");
const AssessmentSolution = require("./models/assessmentSolution");
const Course = require("./models/course");
const Class = require("./models/class");
const Announcement = require("./models/announcement");
const Question = require("./models/question");
const Teacher = require("./models/teacher");
const Student = require("./models/student");
const ClassRegistration = require("./models/classRegistration");
const DeviceSession = require("./models/deviceSession");
const StudentRegistrationRequest = require("./models/studentRegistrationRequest");
const Token = require("./models/token");

const worker = new Worker(
  QUEUE_NAMES.TASK_QUEUE,
  async (job) => {
    const JOB_TYPE = job.name;

    switch (JOB_TYPE) {
      case QUEUE_JOBS.EMAIL: {
        await handleEmailQueueJob(job.data);
        break;
      }
      case QUEUE_JOBS.GRADE_SOLUTION: {
        await handleGradeSolutionQueueJob(job.data);
        break;
      }
      case QUEUE_JOBS.NOTIFICATION: {
        break;
      }
      case QUEUE_JOBS.TEST_JOB: {
        console.log(chalk.bgCyanBright(`TEST QUEUE JOB RUN`));
        break;
      }
    }
  },
  QUEUE_CONFIG
);

const handleEmailQueueJob = async ({ email, subject, message }) => {
  console.log(chalk.bgCyanBright(`[INFO] EMAIL ENQUEUED`));
  await sendEmail({
    email,
    subject,
    message,
  });
};

const handleGradeSolutionQueueJob = async ({ assessmentSolution }) => {
  console.log(
    chalk.bgCyanBright(
      `[INFO] ASSESSMENT SOLUTION ${assessmentSolution._id} ENQUEUED FOR GRADING`
    )
  );

  await gradeSolution(assessmentSolution);
};

worker.on("completed", (job, returnvalue) => {
  console.log(
    chalk.greenBright(
      `[SUCCESS] JOB ID: ${job.id} type: ${
        job.name
      } successfully executed\ndata: ${JSON.stringify(job.data, null, 4)}`
    )
  );
});

worker.on("progress", (job, progress) => {
  console.log(chalk.cyanBright(`[INFO] JOB ID: ${job.id} is in progress`));
});

worker.on("failed", (job, error) => {
  console.log(chalk.redBright(`[ERROR] JOB ID: ${job.id} failed`));
  console.error(chalk.redBright(`${error.message}`));
  console.error(chalk.redBright(`${error.stack}`));
});
