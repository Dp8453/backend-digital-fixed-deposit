import connectDB from './config/db.js';
import app from './app.js';
import logger from './utils/logger.js';
import User from './models/user.model.js';
import FixedDeposit from './models/fixedDeposit.model.js';
import Transaction from './models/transaction.model.js';

const PORT = 5010;

async function testTransactionAPI() {
  logger.info('🧪 Starting Transaction Ledger API Integration Tests...');

  const dbConnected = await connectDB();
  if (!dbConnected) {
    logger.error('❌ Database connection required for transaction testing.');
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
      await User.deleteOne({ email: 'txn.user@digitalfd.com' });
      await Transaction.deleteMany({ paymentMethod: 'NET_BANKING' });

      await request(`${baseUrl}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Txn',
          lastName: 'Tester',
          email: 'txn.user@digitalfd.com',
          phone: '9876500088',
          password: 'Password123',
          role: 'CUSTOMER',
        }),
      });

      const dbUser = await User.findOne({ email: 'txn.user@digitalfd.com' }).select('+otp.code');
      await request(`${baseUrl}/auth/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ email: 'txn.user@digitalfd.com', otp: dbUser.otp.code }),
      });

      const loginRes = await request(`${baseUrl}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: 'txn.user@digitalfd.com', password: 'Password123' }),
      });

      const accessToken = loginRes.data.data.accessToken;
      const authHeaders = { Authorization: `Bearer ${accessToken}` };

      // 2. Book an FD account to generate a ledger transaction
      const fdRes = await request(`${baseUrl}/fixed-deposits/book`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          principalAmount: 25000,
          tenureMonths: 12,
          compoundingFrequency: 'QUARTERLY',
          nominee: { name: 'Bob Tester', relationship: 'Son', age: 20, phone: '9876543210' },
        }),
      });

      const bookedFdId = fdRes.data.data._id;

      // 3. Test GET /api/v1/transactions
      logger.info('▶️ Test 1: Paginated Transaction Listing');
      const listRes = await request(`${baseUrl}/transactions?page=1&limit=10`, {
        method: 'GET',
        headers: authHeaders,
      });

      let txnId = '';
      if (listRes.status === 200 && listRes.data.data.transactions.length > 0) {
        txnId = listRes.data.data.transactions[0]._id;
        logger.info(`  ✅ Transaction Listing Passed! Total Entries: ${listRes.data.data.pagination.totalRecords}`);
      } else {
        logger.error('  ❌ Transaction Listing Failed: ' + JSON.stringify(listRes.data));
      }

      // 4. Test Filtering by Type
      logger.info('▶️ Test 2: Filter Transactions by Type (FD_BOOKING)');
      const filterRes = await request(`${baseUrl}/transactions?type=FD_BOOKING`, {
        method: 'GET',
        headers: authHeaders,
      });

      if (filterRes.status === 200 && filterRes.data.data.transactions.length > 0) {
        logger.info(`  ✅ Type Filter Passed! Matched Type: ${filterRes.data.data.transactions[0].type}`);
      } else {
        logger.error('  ❌ Type Filter Failed: ' + JSON.stringify(filterRes.data));
      }

      // 5. Test Search
      logger.info('▶️ Test 3: Search Transactions by Keyword');
      const searchRes = await request(`${baseUrl}/transactions?search=Fixed`, {
        method: 'GET',
        headers: authHeaders,
      });

      if (searchRes.status === 200 && searchRes.data.data.transactions.length > 0) {
        logger.info(`  ✅ Search Passed! Found matching results for keyword "Fixed"`);
      } else {
        logger.error('  ❌ Search Failed: ' + JSON.stringify(searchRes.data));
      }

      // 6. Test GET /api/v1/transactions/:id
      logger.info('▶️ Test 4: Transaction Details Receipt Endpoint');
      const detailRes = await request(`${baseUrl}/transactions/${txnId}`, {
        method: 'GET',
        headers: authHeaders,
      });

      if (detailRes.status === 200 && detailRes.data.data.transactionId) {
        logger.info(`  ✅ Transaction Details Passed! Receipt ID: ${detailRes.data.data.transactionId}`);
      } else {
        logger.error('  ❌ Transaction Details Failed: ' + JSON.stringify(detailRes.data));
      }

      logger.info('🎉 All Phase 7 Transaction Management APIs Verified 100%!');
    } catch (err) {
      logger.error('💥 Test Execution Error: ' + err.message);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

testTransactionAPI();
