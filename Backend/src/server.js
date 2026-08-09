import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';
import { initSocketIO } from './socket/socket.js';
import { initCronJobs } from './jobs/cronScheduler.js';

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION! 💥 Shutting down... ${err.name}: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

const startServer = async () => {
  await connectDB();

  // Create HTTP server
  const httpServer = http.createServer(app);

  // Initialize Socket.IO Server
  initSocketIO(httpServer);

  // Initialize background node-cron scheduled jobs
  initCronJobs();

  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running in [${process.env.NODE_ENV || 'development'}] mode on port ${PORT}`);
    logger.info(`🔗 Health Check URL: http://localhost:${PORT}/api/v1/health`);
  });

  process.on('unhandledRejection', (err) => {
    logger.error(`UNHANDLED REJECTION! 💥 Shutting down... ${err.name}: ${err.message}`);
    httpServer.close(() => {
      process.exit(1);
    });
  });
};

startServer();
