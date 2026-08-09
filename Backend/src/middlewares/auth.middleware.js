import JWTService from '../services/jwt.service.js';
import UserRepository from '../repositories/user.repository.js';
import AppError from '../utils/appError.js';
import { logSecurityEvent } from '../utils/securityLogger.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError('Authentication required. Please log in to access this resource.', 401));
    }

    const decoded = JWTService.verifyAccessToken(token);

    const user = await UserRepository.findById(decoded.id);
    if (!user) {
      return next(new AppError('User belonging to this token no longer exists.', 401));
    }

    if (user.status !== 'ACTIVE') {
      await logSecurityEvent('INACTIVE_ACCOUNT_ACCESS_DENIED', req, `Status: ${user.status}`, 'BLOCKED');
      return next(new AppError('User account is inactive, locked, or pending verification.', 403));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    // Treat CUSTOMER and USER as equivalent customer roles
    const userRole = req.user.role;
    const isAllowed = roles.some((role) => {
      if (role === 'CUSTOMER' && (userRole === 'CUSTOMER' || userRole === 'USER')) return true;
      if (role === 'USER' && (userRole === 'CUSTOMER' || userRole === 'USER')) return true;
      return role === userRole;
    });

    if (!isAllowed) {
      logSecurityEvent(
        'UNAUTHORIZED_ROLE_ACCESS_ATTEMPT',
        req,
        `Role [${userRole}] attempted access to ${req.originalUrl}`,
        'BLOCKED'
      );
      return next(
        new AppError(`Access denied. Role [${userRole}] is not authorized to perform this action.`, 403)
      );
    }

    next();
  };
};
