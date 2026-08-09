import TransactionService from '../services/transaction.service.js';
import { successResponse } from '../utils/apiResponse.js';

export const getUserTransactions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await TransactionService.getUserTransactions(userId, req.query);
    return successResponse(res, 'User transactions retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

export const getTransactionDetails = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const transaction = await TransactionService.getTransactionDetails(id, userId);
    return successResponse(res, 'Transaction details retrieved successfully', transaction, 200);
  } catch (error) {
    next(error);
  }
};

export const exportTransactionsCsv = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const csvContent = await TransactionService.exportCsvStatement(userId, req.query);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_statement_${Date.now()}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
