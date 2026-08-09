import TransactionRepository from '../repositories/transaction.repository.js';
import AppError from '../utils/appError.js';

class TransactionService {
  async getUserTransactions(userId, queryParams) {
    const { type, status, search, page, limit, startDate, endDate } = queryParams;

    const filters = { type, status, search, startDate, endDate };
    const pagination = { page, limit };

    return await TransactionRepository.findUserTransactions(userId, filters, pagination);
  }

  async getTransactionDetails(transactionId, userId) {
    const txn = await TransactionRepository.findByIdAndUser(transactionId, userId);
    if (!txn) {
      throw new AppError('Transaction record not found or access denied.', 404);
    }
    return txn;
  }

  async exportCsvStatement(userId, queryParams) {
    const transactions = await TransactionRepository.findAllForCsvExport(userId, queryParams);

    const headers = 'Transaction ID,Type,FD Number,Amount (INR),Payment Method,Status,Description,Date\n';
    const rows = transactions.map((t) => {
      const fdNo = t.fixedDeposit?.fdNumber || 'N/A';
      const cleanDesc = `"${(t.description || '').replace(/"/g, '""')}"`;
      return `${t.transactionId},${t.type},${fdNo},${t.amount},${t.paymentMethod},${t.status},${cleanDesc},${new Date(t.createdAt).toISOString()}`;
    });

    return headers + rows.join('\n');
  }
}

export default new TransactionService();
