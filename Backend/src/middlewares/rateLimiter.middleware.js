import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import AuditLog from '../models/auditLog.model.js';

// Sensitive Authentication Rate Limiter (Login, Register, OTP verification)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 15, // Max 15 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.warn(`🚨 [SECURITY ALERT] Rate limit exceeded on Auth endpoint by IP: ${ip} | Path: ${req.originalUrl}`);

    // Log security audit breach
    AuditLog.create({
      action: 'RATE_LIMIT_EXCEEDED',
      ipAddress: String(ip),
      details: `Auth rate limit exceeded on ${req.originalUrl}`,
      status: 'BLOCKED',
    }).catch((err) => logger.error('AuditLog write error: ' + err.message));

    return res.status(429).json({
      success: false,
      message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
      timestamp: new Date().toISOString(),
    });
  },
});

// General API Rate Limiter
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.warn(`🚨 [SECURITY ALERT] API Rate limit exceeded by IP: ${ip} | Path: ${req.originalUrl}`);

    return res.status(429).json({
      success: false,
      message: 'Too many requests from this IP address. Please try again later.',
      timestamp: new Date().toISOString(),
    });
  },
});
