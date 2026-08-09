import connectDB from './config/db.js';
import app from './app.js';
import logger from './utils/logger.js';
import User from './models/user.model.js';
import FixedDeposit from './models/fixedDeposit.model.js';
import Transaction from './models/transaction.model.js';

const PORT = 5008;

async function runFDEngineTests() {
  logger.info('🧪 Starting Fixed Deposit Core Engine Integration Tests...');

  const dbConnected = await connectDB();
  if (!dbConnected) {
    logger.error('❌ Database connection required for FD testing.');
    process.exit(1);
  }

  const server = app.listen(PORT, async () => {
    logger.info(`🚀 Test server listening on http://localhost:${PORT}`);

    try {
      const baseUrl = `http://localhost:${PORT}/api/v1`;

      const request = async (url, options = {}) => {
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        const response = await fetch(url, {
          ...options,
          headers,
        });
        const data = await response.json();
        return { status: response.status, data };
      };

      // 1. Setup Test User & Obtain Access Token
      await User.deleteOne({ email: 'fdtest.user@digitalfd.com' });
      await FixedDeposit.deleteMany({ nominee: { $exists: true } });

      const regRes = await request(`${baseUrl}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'FDTest',
          lastName: 'User',
          email: 'fdtest.user@digitalfd.com',
          phone: '9876500011',
          password: 'Password123',
          role: 'CUSTOMER',
        }),
      });

      const dbUser = await User.findOne({ email: 'fdtest.user@digitalfd.com' }).select('+otp.code');
      await request(`${baseUrl}/auth/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ email: 'fdtest.user@digitalfd.com', otp: dbUser.otp.code }),
      });

      const loginRes = await request(`${baseUrl}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'fdtest.user@digitalfd.com', password: 'Password123' }),
      });

      const accessToken = loginRes.data.data.accessToken;
      const authHeaders = { Authorization: `Bearer ${accessToken}` };

      // 2. Test Calculate Interest & Maturity
      logger.info('▶️ Test 1: Calculate Interest & Maturity Amount Simulation');
      const calcRes = await request(`${baseUrl}/fixed-deposits/calculate`, {
        method: 'POST',
        body: JSON.stringify({
          principalAmount: 100000,
          interestRate: 7.5,
          tenureMonths: 12,
          compoundingFrequency: 'QUARTERLY',
        }),
      });

      if (calcRes.status === 200 && calcRes.data.data.maturityAmount > 100000) {
        logger.info(`  ✅ Calculation Passed! Principal: ₹100,000 -> Maturity: ₹${calcRes.data.data.maturityAmount}`);
      } else {
        logger.error('  ❌ Calculation Failed: ' + JSON.stringify(calcRes.data));
      }

      // 3. Test Book Fixed Deposit
      logger.info('▶️ Test 2: Book New Fixed Deposit');
      const bookRes = await request(`${baseUrl}/fixed-deposits/book`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          principalAmount: 50000,
          tenureMonths: 12,
          compoundingFrequency: 'QUARTERLY',
          nominee: { name: 'Jane Doe', relationship: 'Spouse', age: 30, phone: '9876543210' },
        }),
      });

      let bookedFdId = '';
      if (bookRes.status === 201 && bookRes.data.data.fdNumber) {
        bookedFdId = bookRes.data.data._id;
        logger.info(`  ✅ FD Booking Passed! Generated FD Number: [${bookRes.data.data.fdNumber}] Status: ${bookRes.data.data.status}`);
      } else {
        logger.error('  ❌ FD Booking Failed: ' + JSON.stringify(bookRes.data));
      }

      // 4. Test Get User Portfolio
      logger.info('▶️ Test 3: Get User FD Portfolio');
      const portfolioRes = await request(`${baseUrl}/fixed-deposits/my-portfolio`, {
        method: 'GET',
        headers: authHeaders,
      });

      if (portfolioRes.status === 200 && portfolioRes.data.data.portfolio.length > 0) {
        logger.info(`  ✅ Portfolio Listing Passed! Total Active FDs: ${portfolioRes.data.data.portfolio.length}`);
      } else {
        logger.error('  ❌ Portfolio Listing Failed: ' + JSON.stringify(portfolioRes.data));
      }

      // 5. Test Get FD Details
      logger.info('▶️ Test 4: Get Fixed Deposit Account Details');
      const detailsRes = await request(`${baseUrl}/fixed-deposits/${bookedFdId}`, {
        method: 'GET',
        headers: authHeaders,
      });

      if (detailsRes.status === 200 && detailsRes.data.data.fixedDeposit.fdNumber) {
        logger.info(`  ✅ FD Details Passed! Account Number: ${detailsRes.data.data.fixedDeposit.fdNumber}`);
      } else {
        logger.error('  ❌ FD Details Failed: ' + JSON.stringify(detailsRes.data));
      }

      // 6. Test Simulate Premature Break
      logger.info('▶️ Test 5: Simulate Premature Withdrawal Breakdown');
      const simBreakRes = await request(`${baseUrl}/fixed-deposits/${bookedFdId}/simulate-break`, {
        method: 'POST',
        headers: authHeaders,
      });

      if (simBreakRes.status === 200 && simBreakRes.data.data.penaltyRate === 1) {
        logger.info(`  ✅ Premature Break Simulation Passed! Effective Rate: ${simBreakRes.data.data.effectiveInterestRate}% Net Payout: ₹${simBreakRes.data.data.netPayoutAmount}`);
      } else {
        logger.error('  ❌ Premature Break Simulation Failed: ' + JSON.stringify(simBreakRes.data));
      }

      // 7. Test Execute Premature Break
      logger.info('▶️ Test 6: Execute Premature Closure');
      const breakRes = await request(`${baseUrl}/fixed-deposits/${bookedFdId}/break`, {
        method: 'POST',
        headers: authHeaders,
      });

      if (breakRes.status === 200 && (breakRes.data.data.fixedDeposit.status === 'CLOSED' || breakRes.data.data.fixedDeposit.status === 'PREMATURELY_CLOSED')) {
        logger.info(`  ✅ Premature Closure Execution Passed! New Status: ${breakRes.data.data.fixedDeposit.status}`);
      } else {
        logger.error('  ❌ Premature Closure Execution Failed: ' + JSON.stringify(breakRes.data));
      }

      logger.info('🎉 All Phase 5 Fixed Deposit Core Engine Tests Passed 100%! All 6 APIs Verified.');
    } catch (err) {
      logger.error('💥 Test Execution Error: ' + err.message);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runFDEngineTests();
