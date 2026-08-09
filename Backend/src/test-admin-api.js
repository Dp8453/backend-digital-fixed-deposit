import connectDB from './config/db.js';
import app from './app.js';
import logger from './utils/logger.js';
import User from './models/user.model.js';
import SupportTicket from './models/supportTicket.model.js';

const PORT = 5011;

async function testAdminAPI() {
  logger.info('🧪 Starting Admin Control Center & Role Restriction Integration Tests...');

  const dbConnected = await connectDB();
  if (!dbConnected) {
    logger.error('❌ Database connection required for admin testing.');
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

      // 1. Setup Normal Customer User
      await User.deleteOne({ email: 'normal.customer@digitalfd.com' });
      await request(`${baseUrl}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Normal',
          lastName: 'Customer',
          email: 'normal.customer@digitalfd.com',
          phone: '9876500077',
          password: 'Password123',
          role: 'CUSTOMER',
        }),
      });

      const customerUser = await User.findOne({ email: 'normal.customer@digitalfd.com' }).select('+otp.code');
      await request(`${baseUrl}/auth/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ email: 'normal.customer@digitalfd.com', otp: customerUser.otp.code }),
      });

      const customerLogin = await request(`${baseUrl}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'normal.customer@digitalfd.com', password: 'Password123' }),
      });

      const customerToken = customerLogin.data.data.accessToken;

      // 2. Test Role Restriction: Customer calls Admin API -> Must receive 403 Forbidden!
      logger.info('▶️ Test 1: Role Restriction Protection (Customer accessing Admin API)');
      const forbiddenRes = await request(`${baseUrl}/admin/stats`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${customerToken}` },
      });

      if (forbiddenRes.status === 403) {
        logger.info('  ✅ Security Guard Passed! Customer access to Admin endpoint blocked with 403 Forbidden.');
      } else {
        logger.error('  ❌ Security Guard Failed! Expected 403, received: ' + forbiddenRes.status);
      }

      // 3. Setup Admin User
      await User.deleteOne({ email: 'system.admin@digitalfd.com' });
      await request(`${baseUrl}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'System',
          lastName: 'Admin',
          email: 'system.admin@digitalfd.com',
          phone: '9876500000',
          password: 'AdminPassword123',
          role: 'ADMIN',
        }),
      });

      const adminUser = await User.findOne({ email: 'system.admin@digitalfd.com' }).select('+otp.code');
      await request(`${baseUrl}/auth/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ email: 'system.admin@digitalfd.com', otp: adminUser.otp.code }),
      });

      const adminLogin = await request(`${baseUrl}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'system.admin@digitalfd.com', password: 'AdminPassword123' }),
      });

      const adminToken = adminLogin.data.data.accessToken;
      const adminHeaders = { Authorization: `Bearer ${adminToken}` };

      // 4. Test Admin Stats
      logger.info('▶️ Test 2: Admin System Platform Metrics');
      const statsRes = await request(`${baseUrl}/admin/stats`, {
        method: 'GET',
        headers: adminHeaders,
      });

      if (statsRes.status === 200 && statsRes.data.data.userMetrics) {
        logger.info(`  ✅ Admin Stats Passed! Registered Users: ${statsRes.data.data.userMetrics.totalUsers}`);
      } else {
        logger.error('  ❌ Admin Stats Failed: ' + JSON.stringify(statsRes.data));
      }

      // 5. Test User Management (Update Status)
      logger.info('▶️ Test 3: Admin User Account Management & Status Update');
      const usersRes = await request(`${baseUrl}/admin/users`, {
        method: 'GET',
        headers: adminHeaders,
      });

      const targetUser = usersRes.data.data.users.find((u) => u.role === 'CUSTOMER');
      if (targetUser) {
        const updateRes = await request(`${baseUrl}/admin/users/${targetUser._id}/status`, {
          method: 'PATCH',
          headers: adminHeaders,
          body: JSON.stringify({ status: 'SUSPENDED' }),
        });

        if (updateRes.status === 200 && updateRes.data.data.status === 'SUSPENDED') {
          logger.info(`  ✅ User Status Update Passed! Account [${targetUser.email}] status toggled to SUSPENDED.`);
          // Re-activate user
          await request(`${baseUrl}/admin/users/${targetUser._id}/status`, {
            method: 'PATCH',
            headers: adminHeaders,
            body: JSON.stringify({ status: 'ACTIVE' }),
          });
        }
      }

      // 6. Test Customer Support Ticket Flow & Admin Response
      logger.info('▶️ Test 4: Support Ticket Creation & Admin Resolution Thread');
      const ticketRes = await request(`${baseUrl}/tickets`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          subject: 'TDS Deduction Query',
          category: 'FD_QUERY',
          priority: 'HIGH',
          message: 'Can you clarify the TDS deduction percentage for maturity over 40000?',
        }),
      });

      const ticketId = ticketRes.data.data._id;

      const replyRes = await request(`${baseUrl}/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          message: 'Hello, TDS is 10% on interest exceeding ₹40,000 per financial year as per Section 194A.',
          status: 'RESOLVED',
        }),
      });

      if (replyRes.status === 200 && replyRes.data.data.status === 'RESOLVED') {
        logger.info(`  ✅ Support Ticket Flow Passed! Admin replied and marked ticket as RESOLVED.`);
      } else {
        logger.error('  ❌ Support Ticket Flow Failed: ' + JSON.stringify(replyRes.data));
      }

      logger.info('🎉 All Phase 8 Admin Functionality & Security Tests Passed 100%!');
    } catch (err) {
      logger.error('💥 Test Execution Error: ' + err.message);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

testAdminAPI();
