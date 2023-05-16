exports.QUEUE_JOBS = {
  EMAIL: "EMAIL",
  NOTIFICATION: "NOTIFICATION",
  GRADE_SOLUTION: "GRADE_SOLUTION",
  TEST_JOB: "TEST_JOB",
};

exports.QUEUE_NAMES = {
  TASK_QUEUE: "TASK_QUEUE",
};

exports.QUEUE_CONFIG = {
  connection: {
    host: process.env.REDIS_CLOUD_HOST,
    port: process.env.REDIS_CLOUD_PORT,
    // username: process.env.REDIS_CLOUD_USERNAME,
    password: process.env.REDIS_CLOUD_PASSWORD,
  },
  concurrency: 50,
};
