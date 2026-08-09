import mongoose from 'mongoose';
import { successResponse } from '../utils/apiResponse.js';

export const checkHealth = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  const healthInfo = {
    application: 'Digital Fixed Deposit System API',
    status: 'UP',
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(process.uptime())}s`,
    database: {
      status: dbStatusMap[dbState] || 'Unknown',
      connected: dbState === 1,
    },
    timestamp: new Date().toISOString(),
  };

  return successResponse(res, 'System health status retrieved successfully', healthInfo);
};
