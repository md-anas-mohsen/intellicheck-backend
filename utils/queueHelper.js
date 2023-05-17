const { Queue } = require("bullmq");

const { QUEUE_JOBS, QUEUE_NAMES, QUEUE_CONFIG } = require("../constants/queue");
const chalk = require("chalk");

const taskQueue = new Queue(QUEUE_NAMES.TASK_QUEUE, QUEUE_CONFIG);

taskQueue.on("connected", () => {
  console.log(
    chalk.underline(
      chalk.cyanBright(
        `Queue connected with Redis HOST: ${process.env.REDIS_CLOUD_HOST}`
      )
    )
  );
});

exports.enqueueEmail = async ({ email, subject, message }) => {
  await taskQueue.add(
    QUEUE_JOBS.EMAIL,
    { email, subject, message },
    { removeOnComplete: true }
  );
};

exports.enqueueAssessmentSolutionAIGrading = async ({ assessmentSolution }) => {
  await taskQueue.add(
    QUEUE_JOBS.GRADE_SOLUTION,
    { assessmentSolution },
    {
      removeOnComplete: true,
      attempts: 5,
    }
  );
};

exports.enqueueTestJob = async () => {
  console.log(chalk.cyan(`ENQUEUING TEST JOB`));
  await taskQueue.add(QUEUE_JOBS.TEST_JOB);
};
