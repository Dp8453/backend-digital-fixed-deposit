import cron from 'node-cron';
import FixedDeposit from '../models/fixedDeposit.model.js';
import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import Transaction from '../models/transaction.model.js';
import NotificationService from '../services/notification.service.js';
import logger from '../utils/logger.js';

/**
 * 1. Fixed Deposit Maturity Processing Job
 * Auto-detects active FDs whose maturityDate <= today, updates status to MATURED,
 * generates MATURITY_PAYOUT transaction, and notifies customer.
 */
export const processFdMaturitiesJob = async () => {
  logger.info('⏰ [CRON JOB] Running FD Maturity Processing Job...');
  try {
    const now = new Date();
    const maturingFDs = await FixedDeposit.find({
      status: 'ACTIVE',
      maturityDate: { $lte: now },
    }).exec();

    logger.info(`📋 [CRON JOB] Found ${maturingFDs.length} FDs ready for maturity processing.`);

    let processedCount = 0;
    for (const fd of maturingFDs) {
      fd.status = 'MATURED';
      await fd.save();

      // Record MATURITY_PAYOUT Transaction
      const txnId = `TXN${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
      await Transaction.create({
        transactionId: txnId,
        user: fd.user,
        fixedDeposit: fd._id,
        type: 'MATURITY_PAYOUT',
        amount: fd.maturityAmount,
        status: 'SUCCESS',
        paymentMethod: 'SYSTEM_AUTO',
        description: `Automatic maturity payout credited for ${fd.fdNumber}.`,
      });

      // Generate Notification
      await NotificationService.createNotification(
        fd.user,
        `Fixed Deposit #${fd.fdNumber} Matured!`,
        `Your Fixed Deposit #${fd.fdNumber} has matured. Guaranteed maturity payout of ₹${fd.maturityAmount.toLocaleString('en-IN')} has been credited.`,
        'FD_MATURITY'
      );

      processedCount++;
      logger.info(`🎉 [CRON JOB] Processed Maturity for FD [${fd.fdNumber}] - Amount: ₹${fd.maturityAmount}`);
    }

    return processedCount;
  } catch (error) {
    logger.error('❌ [CRON JOB ERROR] FD Maturity Processing Failed: ' + error.message);
    return 0;
  }
};

/**
 * 2. Expired OTP Cleanup Job
 * Clears expired OTP codes older than 10 minutes from User records.
 */
export const cleanupExpiredOtpsJob = async () => {
  logger.info('⏰ [CRON JOB] Running Expired OTP Cleanup Job...');
  try {
    const now = new Date();
    const result = await User.updateMany(
      { 'otp.expiresAt': { $lt: now } },
      { $unset: { otp: 1 } }
    );
    logger.info(`🧹 [CRON JOB] Cleared expired OTPs from ${result.modifiedCount || 0} user accounts.`);
    return result.modifiedCount || 0;
  } catch (error) {
    logger.error('❌ [CRON JOB ERROR] OTP Cleanup Failed: ' + error.message);
    return 0;
  }
};

/**
 * 3. Expired Refresh Token Cleanup Job
 * Removes expired refresh tokens from database.
 */
export const cleanupExpiredTokensJob = async () => {
  logger.info('⏰ [CRON JOB] Running Expired Token Cleanup Job...');
  try {
    const now = new Date();
    const result = await RefreshToken.deleteMany({ expiresAt: { $lt: now } });
    logger.info(`🧹 [CRON JOB] Removed ${result.deletedCount || 0} expired refresh tokens.`);
    return result.deletedCount || 0;
  } catch (error) {
    logger.error('❌ [CRON JOB ERROR] Token Cleanup Failed: ' + error.message);
    return 0;
  }
};

/**
 * 4. Upcoming Maturity Alert Job (7-day advance notification)
 */
export const upcomingMaturityAlertsJob = async () => {
  logger.info('⏰ [CRON JOB] Running Upcoming Maturity Alert Job...');
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const fds = await FixedDeposit.find({
      status: 'ACTIVE',
      maturityDate: { $gte: now, $lte: in7Days },
    }).exec();

    let alertCount = 0;
    for (const fd of fds) {
      await NotificationService.createNotification(
        fd.user,
        `Maturity Reminder: FD #${fd.fdNumber}`,
        `Your Fixed Deposit #${fd.fdNumber} is scheduled to mature on ${new Date(fd.maturityDate).toLocaleDateString('en-IN')}.`,
        'FD_MATURITY'
      );
      alertCount++;
    }

    logger.info(`🔔 [CRON JOB] Sent ${alertCount} upcoming maturity reminder notifications.`);
    return alertCount;
  } catch (error) {
    logger.error('❌ [CRON JOB ERROR] Upcoming Maturity Alert Failed: ' + error.message);
    return 0;
  }
};

/**
 * Main Cron Scheduler Initializer
 */
export const initCronJobs = () => {
  logger.info('⚙️  Initializing Background Node-Cron Scheduler...');

  // 1. FD Maturity Processing Job - Runs daily at midnight (0 0 * * *)
  cron.schedule('0 0 * * *', async () => {
    await processFdMaturitiesJob();
  });

  // 2. Expired OTP Cleanup Job - Runs every 15 minutes (*/15 * * * *)
  cron.schedule('*/15 * * * *', async () => {
    await cleanupExpiredOtpsJob();
  });

  // 3. Expired Refresh Token Cleanup Job - Runs every hour (0 * * * *)
  cron.schedule('0 * * * *', async () => {
    await cleanupExpiredTokensJob();
  });

  // 4. Upcoming Maturity Alert Job - Runs daily at 9:00 AM (0 9 * * *)
  cron.schedule('0 9 * * *', async () => {
    await upcomingMaturityAlertsJob();
  });

  logger.info('✅ Node-Cron Scheduled Jobs Registered Successfully!');
};

/**
 * Manual Execution helper for testing
 */
export const runAllJobsManually = async () => {
  logger.info('⚡ Running all scheduled cron jobs manually for verification...');
  const maturities = await processFdMaturitiesJob();
  const otps = await cleanupExpiredOtpsJob();
  const tokens = await cleanupExpiredTokensJob();
  const alerts = await upcomingMaturityAlertsJob();
  return { maturities, otps, tokens, alerts };
};
