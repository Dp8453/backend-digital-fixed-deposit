import { Server } from 'socket.io';
import JWTService from '../services/jwt.service.js';
import logger from '../utils/logger.js';

let io = null;

export const initSocketIO = (httpServer) => {
  const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((url) => url.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = JWTService.verifyAccessToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id || socket.user.id || socket.user.userId;
    const role = socket.user.role;

    if (userId) {
      socket.join(`user:${userId.toString()}`);
    }
    if (role) {
      socket.join(`role:${role}`);
    }

    logger.info(`🔌 [SOCKET.IO] Client connected: User [${userId}] Role [${role}] SocketID [${socket.id}]`);

    socket.on('disconnect', () => {
      logger.info(`🔌 [SOCKET.IO] Client disconnected: User [${userId}] SocketID [${socket.id}]`);
    });
  });

  logger.info('✅ Socket.IO Server Initialized Successfully!');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Emit real-time notification to a specific user
 */
export const emitRealTimeNotification = (userId, notificationData) => {
  try {
    if (io) {
      io.to(`user:${userId.toString()}`).emit('notification', notificationData);
      logger.info(`⚡ [SOCKET.IO] Real-time notification emitted to user:${userId}`);
    }
  } catch (err) {
    logger.error('Failed to emit real-time socket notification: ' + err.message);
  }
};
