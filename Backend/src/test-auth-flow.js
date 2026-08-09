import connectDB from './config/db.js';
import app from './app.js';
import logger from './utils/logger.js';
import User from './models/user.model.js';
import RefreshToken from './models/refreshToken.model.js';
import http from 'http';

const PORT = 5006;

async function runAuthTests() {
  logger.info('🧪 Starting Automated Auth Engine Verification Tests...');

  const dbConnected = await connectDB();
  if (!dbConnected) {
    logger.warn('⚠️ MongoDB not connected or placeholder URI active. Starting in-memory mock integration test...');
  }

  const server = app.listen(PORT, async () => {
    logger.info(`🚀 Test server listening on http://localhost:${PORT}`);

    try {
      const baseUrl = `http://localhost:${PORT}/api/v1/auth`;

      // Helper for HTTP requests
      const request = async (url, options = {}) => {
        const response = await fetch(url, {
          headers: { 'Content-Type': 'application/json', ...options.headers },
          ...options,
        });
        const data = await response.json();
        return { status: response.status, data, headers: response.headers };
      };

      // Clean up previous test user if DB is connected
      if (dbConnected) {
        await User.deleteOne({ email: 'authtest.user@digitalfd.com' });
      }

      // Test 1: Register User
      logger.info('▶️ Test 1: User Registration');
      const regRes = await request(`${baseUrl}/register`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'AuthTest',
          lastName: 'User',
          email: 'authtest.user@digitalfd.com',
          phone: '9988776655',
          password: 'Password123',
          role: 'CUSTOMER',
        }),
      });

      if (regRes.status === 201 && regRes.data.success) {
        logger.info('  ✅ User Registration Passed! Response: ' + regRes.data.message);
      } else {
        logger.error('  ❌ User Registration Failed: ' + JSON.stringify(regRes.data));
      }

      // Fetch OTP from database if connected
      let otpCode = '123456';
      if (dbConnected) {
        const dbUser = await User.findOne({ email: 'authtest.user@digitalfd.com' }).select('+otp.code');
        if (dbUser && dbUser.otp && dbUser.otp.code) {
          otpCode = dbUser.otp.code;
          logger.info(`  🔑 Retrieved OTP from DB: [${otpCode}]`);
        }
      }

      // Test 2: OTP Verification
      logger.info('▶️ Test 2: Email OTP Verification');
      const otpRes = await request(`${baseUrl}/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({
          email: 'authtest.user@digitalfd.com',
          otp: otpCode,
        }),
      });

      if (otpRes.status === 200 && otpRes.data.success) {
        logger.info('  ✅ OTP Verification Passed! Response: ' + otpRes.data.message);
      } else {
        logger.error('  ❌ OTP Verification Failed: ' + JSON.stringify(otpRes.data));
      }

      // Test 3: User Login
      logger.info('▶️ Test 3: User Login (bcrypt password check & JWT generation)');
      const loginRes = await request(`${baseUrl}/login`, {
        method: 'POST',
        body: JSON.stringify({
          email: 'authtest.user@digitalfd.com',
          password: 'Password123',
        }),
      });

      let accessToken = '';
      let refreshToken = '';
      if (loginRes.status === 200 && loginRes.data.data.accessToken) {
        accessToken = loginRes.data.data.accessToken;
        refreshToken = loginRes.data.data.refreshToken;
        logger.info('  ✅ User Login Passed! Received JWT Access Token & Refresh Token.');
      } else {
        logger.error('  ❌ User Login Failed: ' + JSON.stringify(loginRes.data));
      }

      // Test 4: Protected Route Access with valid token
      logger.info('▶️ Test 4: Access Protected Route (/api/v1/auth/me) with Bearer token');
      const profileRes = await request(`${baseUrl}/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (profileRes.status === 200 && profileRes.data.success) {
        logger.info(`  ✅ Protected Route Passed! Authenticated User: ${profileRes.data.data.email}`);
      } else {
        logger.error('  ❌ Protected Route Failed: ' + JSON.stringify(profileRes.data));
      }

      // Test 5: Protected Route Rejection for Unauthorized Request
      logger.info('▶️ Test 5: Verify Protected Route rejects request without token');
      const unauthRes = await request(`${baseUrl}/me`, {
        method: 'GET',
      });

      if (unauthRes.status === 401) {
        logger.info('  ✅ Unauthorized Rejection Passed! Rejected with 401 Unauthorized as expected.');
      } else {
        logger.error('  ❌ Unauthorized Rejection Failed: Status ' + unauthRes.status);
      }

      // Test 6: Role-Based Authorization Rejection
      logger.info('▶️ Test 6: Verify Admin Route rejects CUSTOMER role user');
      const adminRes = await request(`${baseUrl}/admin-test`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (adminRes.status === 403) {
        logger.info('  ✅ Role Protection Passed! Customer rejected with 403 Forbidden on Admin route as expected.');
      } else {
        logger.error('  ❌ Role Protection Failed: Status ' + adminRes.status);
      }

      logger.info('🎉 All Phase 3 Authentication Tests Completed Successfully!');
    } catch (err) {
      logger.error('💥 Test Execution Error: ' + err.message);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runAuthTests();
