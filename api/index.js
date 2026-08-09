import app from '../Backend/src/app.js';
import connectDB from '../Backend/src/config/db.js';

let isConnected = false;

export default async function handler(req, res) {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error('Database connection error in serverless handler:', err);
    }
  }
  return app(req, res);
}
