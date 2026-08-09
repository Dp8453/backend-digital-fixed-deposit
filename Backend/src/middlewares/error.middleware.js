import logger from '../utils/logger.js';
import { errorResponse } from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  let message = err.message || 'Internal Server Error';

  logger.error(`[${req.method}] ${req.originalUrl} - Status: ${statusCode} - ${message}`);
  if (err.stack) {
    logger.error(err.stack);
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field} field.`;
  }

  // Handle Mongoose Invalid ObjectId CastError
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for parameter: ${err.path}`;
  }

  // Handle Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors || {})
      .map((val) => val.message)
      .join(', ');
  }

  // Handle JWT Verification Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please log in again.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
  }

  // Handle Malformed JSON Payload
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON payload in request body.';
  }

  return errorResponse(res, message, statusCode);
};

export default errorHandler;
