import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI;

    if (!connStr || connStr.includes('<username>') || connStr.includes('<password>')) {
      logger.warn('⚠️  MongoDB Atlas URI is configured with placeholder credentials. Database operations will be delayed until original URI is provided.');
      return false;
    }

    const conn = await mongoose.connect(connStr, {
      autoIndex: true,
      serverSelectionTimeoutMS: 15000,
    });

    logger.info(`✅ MongoDB Connected Successfully: Host ${conn.connection.host}`);
    return true;
  } catch (error) {
    logger.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (error.message.includes('Authentication failed') || error.message.includes('bad auth')) {
      logger.warn('💡 Tip: Check username & password in MONGO_URI. If your password has special characters like @, #, !, %, url-encode them (e.g., @ -> %40).');
    }
    return false;
  }
};

export default connectDB;
