module.exports = {
  apps: [
    {
      name: "node-server",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
    },
    {
      name: "queue-handler",
      script: "queueHandler.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};
