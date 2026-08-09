import AuditLog from '../models/auditLog.model.js';
import logger from './logger.js';

export const logSecurityEvent = async (action, req, details = '', status = 'FAILURE') => {
  try {
    const userId = req.user?._id || req.user?.id || null;
    const ipAddress = String(req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1');
    const userAgent = req.headers['user-agent'] || 'Unknown';

    logger.info(`🛡️ [SECURITY AUDIT] Action: ${action} | User: ${userId || 'GUEST'} | IP: ${ipAddress} | Status: ${status}`);

    await AuditLog.create({
      user: userId,
      action,
      ipAddress,
      userAgent,
      details,
      status: status === 'BLOCKED' ? 'FAILURE' : status,
    });
  } catch (err) {
    logger.error('Failed to write Security Audit Log: ' + err.message);
  }
};
