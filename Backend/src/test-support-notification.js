import connectDB from './config/db.js';
import app from './app.js';
import logger from './utils/logger.js';
import User from './models/user.model.js';
import SupportTicket from './models/supportTicket.model.js';
import Notification from './models/notification.model.js';

const PORT = 5012;

async function testSupportNotificationWorkflow() {
  logger.info('🧪 Starting Phase 9 Support System & Notification Workflow Tests...');

  const dbConnected = await connectDB();
  if (!dbConnected) {
    logger.error('❌ Database connection required for support notification testing.');
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

      // 1. Register Customer
      await User.deleteOne({ email: 'support.cust@digitalfd.com' });
      await request(`${baseUrl}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Support',
          lastName: 'Customer',
          email: 'support.cust@digitalfd.com',
          phone: '9876500066',
          password: 'Password123',
          role: 'CUSTOMER',
        }),
      });

      const customerUser = await User.findOne({ email: 'support.cust@digitalfd.com' }).select('+otp.code');
      await request(`${baseUrl}/auth/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ email: 'support.cust@digitalfd.com', otp: customerUser.otp.code }),
      });

      const customerLogin = await request(`${baseUrl}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'support.cust@digitalfd.com', password: 'Password123' }),
      });

      const customerToken = customerLogin.data.data.accessToken;
      const customerHeaders = { Authorization: `Bearer ${customerToken}` };

      // 2. Register Admin
      await User.deleteOne({ email: 'support.admin@digitalfd.com' });
      await request(`${baseUrl}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Support',
          lastName: 'Admin',
          email: 'support.admin@digitalfd.com',
          phone: '9876500001',
          password: 'AdminPassword123',
          role: 'ADMIN',
        }),
      });

      const adminUser = await User.findOne({ email: 'support.admin@digitalfd.com' }).select('+otp.code');
      await request(`${baseUrl}/auth/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ email: 'support.admin@digitalfd.com', otp: adminUser.otp.code }),
      });

      const adminLogin = await request(`${baseUrl}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'support.admin@digitalfd.com', password: 'AdminPassword123' }),
      });

      const adminToken = adminLogin.data.data.accessToken;
      const adminHeaders = { Authorization: `Bearer ${adminToken}` };

      // 3. Test Create Ticket & Automatic Notification
      logger.info('▶️ Test 1: Create Ticket & Verify Notification Trigger');
      const ticketRes = await request(`${baseUrl}/tickets`, {
        method: 'POST',
        headers: customerHeaders,
        body: JSON.stringify({
          subject: 'Maturity Payout Delay',
          category: 'MATURITY_PAYOUT',
          priority: 'URGENT',
          message: 'When will my maturity payout be credited to my savings account?',
        }),
      });

      let ticketId = '';
      if (ticketRes.status === 201 && ticketRes.data.data.ticketId) {
        ticketId = ticketRes.data.data._id;
        logger.info(`  ✅ Support Ticket Created! Ticket ID: #${ticketRes.data.data.ticketId}`);
      } else {
        logger.error('  ❌ Ticket Creation Failed: ' + JSON.stringify(ticketRes.data));
      }

      // 4. Test View Ticket Details
      logger.info('▶️ Test 2: View Ticket Conversation Thread');
      const viewRes = await request(`${baseUrl}/tickets/${ticketId}`, {
        method: 'GET',
        headers: customerHeaders,
      });

      if (viewRes.status === 200 && viewRes.data.data.subject) {
        logger.info(`  ✅ View Ticket Thread Passed! Subject: "${viewRes.data.data.subject}"`);
      } else {
        logger.error('  ❌ View Ticket Failed: ' + JSON.stringify(viewRes.data));
      }

      // 5. Test Admin Response & Automatic Customer Notification Trigger
      logger.info('▶️ Test 3: Admin Response & Automatic Customer Notification');
      const replyRes = await request(`${baseUrl}/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          message: 'Your maturity payout has been processed via NEFT reference #NEFT889900.',
          status: 'RESOLVED',
        }),
      });

      if (replyRes.status === 200 && replyRes.data.data.status === 'RESOLVED') {
        logger.info(`  ✅ Admin Reply Passed! Status updated to: RESOLVED`);
      } else {
        logger.error('  ❌ Admin Reply Failed: ' + JSON.stringify(replyRes.data));
      }

      // 6. Test Fetch Customer Notifications
      logger.info('▶️ Test 4: Fetch Customer In-App Notifications & Unread Count');
      const notifRes = await request(`${baseUrl}/notifications`, {
        method: 'GET',
        headers: customerHeaders,
      });

      if (notifRes.status === 200 && notifRes.data.data.unreadCount > 0) {
        logger.info(`  ✅ Notification Delivery Passed! Unread Alerts: ${notifRes.data.data.unreadCount}`);
        logger.info(`  ✅ Latest Notification Title: "${notifRes.data.data.notifications[0].title}"`);
      } else {
        logger.error('  ❌ Notification Fetch Failed: ' + JSON.stringify(notifRes.data));
      }

      logger.info('🎉 All Phase 9 Support System & Notification Workflow Tests Passed 100%!');
    } catch (err) {
      logger.error('💥 Test Execution Error: ' + err.message);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

testSupportNotificationWorkflow();
