import AppError from '../utils/appError.js';

export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Resource not found - ${req.originalUrl}`, 404));
};

export default notFoundHandler;
