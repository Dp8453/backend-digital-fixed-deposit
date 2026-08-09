import Transaction from '../models/transaction.model.js';

class TransactionRepository {
  async findUserTransactions(userId, filters = {}, pagination = {}) {
    const { type, status, search, startDate, endDate } = filters;
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { user: userId };

    if (type && type !== 'ALL') {
      query.type = type;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [transactions, totalRecords] = await Promise.all([
      Transaction.find(query)
        .populate('fixedDeposit', 'fdNumber principalAmount maturityAmount status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Transaction.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      transactions,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findByIdAndUser(id, userId) {
    return await Transaction.findOne({ _id: id, user: userId })
      .populate('fixedDeposit', 'fdNumber principalAmount interestRate maturityAmount startDate maturityDate status')
      .populate('user', 'firstName lastName email phone')
      .exec();
  }

  async findAllForCsvExport(userId, filters = {}) {
    const { type, status } = filters;
    const query = { user: userId };
    if (type && type !== 'ALL') query.type = type;
    if (status && status !== 'ALL') query.status = status;

    return await Transaction.find(query)
      .populate('fixedDeposit', 'fdNumber')
      .sort({ createdAt: -1 })
      .exec();
  }
}

export default new TransactionRepository();
