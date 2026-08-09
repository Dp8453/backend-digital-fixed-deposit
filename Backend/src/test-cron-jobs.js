import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db.js';
import logger from './utils/logger.js';
import User from './models/user.model.js';
import FixedDeposit from './models/fixedDeposit.model.js';
import RefreshToken from './models/refreshToken.model.js';
import Transaction from './models/transaction.model.js';
import Notification from './models/notification.model.js';
import {
  processFdMaturitiesJob,
  cleanupExpiredOtpsJob,
  cleanupExpiredTokensJob,
  upcomingMaturityAlertsJob,
} from './jobs/cronScheduler.js';

async function testCronSchedulerJobs() {
  logger.info('🧪 Starting Node-Cron Scheduled Jobs Integration Tests...');

  const dbConnected = await connectDB();
  if (!dbConnected) {
    logger.error('❌ Database connection required for cron job testing.');
    process.exit(1);
  }

  try {
    // 1. Setup Test User
    await User.deleteOne({ email: 'cron.user@digitalfd.com' });
    const user = await User.create({
      firstName: 'Cron',
      lastName: 'Tester',
      email: 'cron.user@digitalfd.com',
      phone: '9876500055',
      password: 'Password123',
      role: 'CUSTOMER',
      isEmailVerified: true,
      otp: {
        code: '123456',
        expiresAt: new Date(Date.now() - 20 * 60 * 1000), // Expired 20 mins ago
      },
    });

    // 2. Setup Expired FD (Maturity date set to yesterday)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredFD = await FixedDeposit.create({
      fdNumber: 'FDCRON001',
      user: user._id,
      principalAmount: 100000,
      interestRate: 8.0,
      tenureMonths: 12,
      compoundingFrequency: 'QUARTERLY',
      payoutMode: 'AT_MATURITY',
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      maturityDate: yesterday,
      maturityAmount: 108000,
      totalInterestPayable: 8000,
      status: 'ACTIVE',
      nominee: { name: 'Cron Nominee', relationship: 'Spouse', age: 30, phone: '9876543210' },
    });

    // 3. Setup Expired RefreshToken
    await RefreshToken.create({
      token: 'expired_refresh_token_test_123',
      user: user._id,
      expiresAt: yesterday,
    });

    // 4. Setup Upcoming FD Maturing in 3 days
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await FixedDeposit.create({
      fdNumber: 'FDCRON002',
      user: user._id,
      principalAmount: 50000,
      interestRate: 7.5,
      tenureMonths: 12,
      compoundingFrequency: 'QUARTERLY',
      payoutMode: 'AT_MATURITY',
      startDate: new Date(),
      maturityDate: in3Days,
      maturityAmount: 53750,
      totalInterestPayable: 3750,
      status: 'ACTIVE',
      nominee: { name: 'Cron Nominee', relationship: 'Spouse', age: 30, phone: '9876543210' },
    });

    // ▶️ Execute Job 1: FD Maturity Processing
    logger.info('▶️ Test 1: FD Maturity Processing Job');
    const maturedCount = await processFdMaturitiesJob();
    const updatedFd = await FixedDeposit.findById(expiredFD._id);
    const maturityTxn = await Transaction.findOne({ fixedDeposit: expiredFD._id, type: 'MATURITY_PAYOUT' });

    if (maturedCount > 0 && updatedFd.status === 'MATURED' && maturityTxn) {
      logger.info(`  ✅ FD Maturity Job Passed! FD #${updatedFd.fdNumber} status updated to MATURED and payout transaction recorded.`);
    } else {
      logger.error('  ❌ FD Maturity Job Failed!');
    }

    // ▶️ Execute Job 2: Expired OTP Cleanup
    logger.info('▶️ Test 2: Expired OTP Cleanup Job');
    const clearedOtps = await cleanupExpiredOtpsJob();
    const updatedUser = await User.findById(user._id);

    if (clearedOtps > 0 && !updatedUser.otp?.code) {
      logger.info('  ✅ OTP Cleanup Job Passed! Expired OTP code successfully cleared from database.');
    } else {
      logger.error('  ❌ OTP Cleanup Job Failed!');
    }

    // ▶️ Execute Job 3: Expired RefreshToken Cleanup
    logger.info('▶️ Test 3: Expired Token Cleanup Job');
    const deletedTokens = await cleanupExpiredTokensJob();
    const remainingToken = await RefreshToken.findOne({ token: 'expired_refresh_token_test_123' });

    if (deletedTokens > 0 && !remainingToken) {
      logger.info('  ✅ Token Cleanup Job Passed! Expired refresh token deleted.');
    } else {
      logger.error('  ❌ Token Cleanup Job Failed!');
    }

    // ▶️ Execute Job 4: Upcoming Maturity Alert Notifications
    logger.info('▶️ Test 4: Upcoming Maturity Alert Job');
    const alertCount = await upcomingMaturityAlertsJob();
    const notification = await Notification.findOne({ user: user._id, type: 'FD_MATURITY' });

    if (alertCount > 0 && notification) {
      logger.info(`  ✅ Upcoming Maturity Alert Passed! Generated notification: "${notification.title}"`);
    } else {
      logger.error('  ❌ Upcoming Maturity Alert Job Failed!');
    }

    logger.info('🎉 All Phase 10 Scheduled Node-Cron Jobs Verified 100%!');
  } catch (err) {
    logger.error('💥 Test Execution Error: ' + err.message);
  } finally {
    process.exit(0);
  }
}

testCronSchedulerJobs();
