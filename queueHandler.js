require("dotenv").config({ path: "./.env" });
const { Worker } = require("bullmq");
const chalk = require("chalk");

const { QUEUE_NAMES, QUEUE_CONFIG, QUEUE_JOBS } = require("./constants/queue");

const sendEmail = require("./utils/sendEmail");

const worker = new Worker(
  QUEUE_NAMES.TASK_QUEUE,
  async (job) => {
    const JOB_TYPE = job.name;

    switch (JOB_TYPE) {
      case QUEUE_JOBS.EMAIL: {
        handleEmailQueueJob(job.data);
        break;
      }
      case QUEUE_JOBS.GRADE_SOLUTION: {
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
