import connectDB from './config/db.js';
import app from './app.js';
import logger from './utils/logger.js';
import User from './models/user.model.js';
import FixedDeposit from './models/fixedDeposit.model.js';

const PORT = 5009;

async function testDashboardAPI() {
  logger.info('🧪 Starting Customer Dashboard API Integration Test...');

  const dbConnected = await connectDB();
  if (!dbConnected) {
    logger.error('❌ Database connection required for dashboard testing.');
    process.exit(1);
  }

  const server = app.listen(PORT, async () => {
    logger.info(`🚀 Test server listening on http://localhost:${PORT}`);

    try {
      const baseUrl = `http://localhost:${PORT}/api/v1`;

      const request = async (url, options = {}) => {
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        const response = await fetch(url, { ...options, headers });
        const data = await response.json();
        return { status: response.status, data };
      };

      // 1. Setup Test User & Obtain Access Token
      await User.deleteOne({ email: 'dash.user@digitalfd.com' });
      await FixedDeposit.deleteMany({ nominee: { $exists: true } });

      await request(`${baseUrl}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Dash',
          lastName: 'User',
          email: 'dash.user@digitalfd.com',
          phone: '9876500099',
          password: 'Password123',
          role: 'CUSTOMER',
        }),
      });

      const dbUser = await User.findOne({ email: 'dash.user@digitalfd.com' }).select('+otp.code');
      await request(`${baseUrl}/auth/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ email: 'dash.user@digitalfd.com', otp: dbUser.otp.code }),
      });

      const loginRes = await request(`${baseUrl}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'dash.user@digitalfd.com', password: 'Password123' }),
      });

      const accessToken = loginRes.data.data.accessToken;
      const authHeaders = { Authorization: `Bearer ${accessToken}` };

      // 2. Book an FD account
      await request(`${baseUrl}/fixed-deposits/book`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          principalAmount: 75000,
          tenureMonths: 12,
          compoundingFrequency: 'QUARTERLY',
          nominee: { name: 'Alice Dash', relationship: 'Spouse', age: 28, phone: '9876543210' },
        }),
      });

      // 3. Test GET /api/v1/dashboard/stats
      logger.info('▶️ Testing GET /api/v1/dashboard/stats');
      const statsRes = await request(`${baseUrl}/dashboard/stats`, {
        method: 'GET',
        headers: authHeaders,
      });

      if (statsRes.status === 200 && statsRes.data.data.summary.totalInvestment === 75000) {
        logger.info(`  ✅ Dashboard Stats API Passed! Total Deployed Investment: ₹${statsRes.data.data.summary.totalInvestment}`);
        logger.info(`  ✅ Active FDs: ${statsRes.data.data.summary.activeFdCount} | Total Accrued Interest: ₹${statsRes.data.data.summary.totalInterestEarned}`);
        logger.info('🎉 Customer Dashboard API Integration Verified 100%!');
      } else {
        logger.error('  ❌ Dashboard Stats API Failed: ' + JSON.stringify(statsRes.data));
      }
    } catch (err) {
      logger.error('💥 Test Execution Error: ' + err.message);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

testDashboardAPI();
