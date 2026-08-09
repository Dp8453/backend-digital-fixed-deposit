import User from '../models/user.model.js';
import FixedDeposit from '../models/fixedDeposit.model.js';
import Transaction from '../models/transaction.model.js';
import SupportTicket from '../models/supportTicket.model.js';
import { successResponse } from '../utils/apiResponse.js';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';

// System Financial & System Overview Stats
export const getAdminStats = async (req, res, next) => {
  try {
    const [totalUsers, totalActiveFDs, totalFDs, openTickets] = await Promise.all([
      User.countDocuments({ role: 'CUSTOMER' }),
      FixedDeposit.countDocuments({ status: 'ACTIVE' }),
      FixedDeposit.countDocuments(),
      SupportTicket.countDocuments({ status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
    ]);

    const activeFDs = await FixedDeposit.find({ status: 'ACTIVE' }).select('principalAmount maturityAmount accruedInterest').exec();

    const totalPlatformInvestment = activeFDs.reduce((sum, fd) => sum + fd.principalAmount, 0);
    const totalMaturityLiability = activeFDs.reduce((sum, fd) => sum + fd.maturityAmount, 0);

    const stats = {
      userMetrics: {
        totalUsers,
      },
      depositMetrics: {
        totalFDs,
        totalActiveFDs,
        totalPlatformInvestment: Math.round(totalPlatformInvestment * 100) / 100,
        totalMaturityLiability: Math.round(totalMaturityLiability * 100) / 100,
      },
      supportMetrics: {
        openTickets,
      },
    };

    return successResponse(res, 'Admin system metrics retrieved', stats, 200);
  } catch (error) {
    next(error);
  }
};

// User Management: List all users with pagination, role & status filters
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;
    const p = Number(page) || 1;
    const l = Number(limit) || 10;
    const skip = (p - 1) * l;

    const query = {};
    if (role && role !== 'ALL') query.role = role;
    if (status && status !== 'ALL') query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, totalRecords] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(l).exec(),
      User.countDocuments(query),
    ]);

    return successResponse(res, 'Users retrieved successfully', {
      users,
      pagination: {
        page: p,
        limit: l,
        totalRecords,
        totalPages: Math.ceil(totalRecords / l) || 1,
      },
    }, 200);
  } catch (error) {
    next(error);
  }
};

// User Management: Update account status (ACTIVE, SUSPENDED, LOCKED)
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'LOCKED', 'PENDING_VERIFICATION'].includes(status)) {
      throw new AppError('Invalid account status specified.', 400);
    }

    const user = await User.findByIdAndUpdate(id, { status }, { new: true }).select('-password');
    if (!user) {
      throw new AppError('User account not found.', 404);
    }

    logger.info(`🛡️ Admin updated user [${user.email}] status to [${status}]`);
    return successResponse(res, `User status updated to ${status}`, user, 200);
  } catch (error) {
    next(error);
  }
};

// Master Fixed Deposit Ledger View
export const getAllFixedDeposits = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const p = Number(page) || 1;
    const l = Number(limit) || 10;
    const skip = (p - 1) * l;

    const query = {};
    if (status && status !== 'ALL') query.status = status;
    if (search) {
      query.fdNumber = { $regex: search, $options: 'i' };
    }

    const [fds, totalRecords] = await Promise.all([
      FixedDeposit.find(query).populate('user', 'firstName lastName email phone').sort({ createdAt: -1 }).skip(skip).limit(l).exec(),
      FixedDeposit.countDocuments(query),
    ]);

    return successResponse(res, 'All system Fixed Deposits retrieved', {
      fixedDeposits: fds,
      pagination: {
        page: p,
        limit: l,
        totalRecords,
        totalPages: Math.ceil(totalRecords / l) || 1,
      },
    }, 200);
  } catch (error) {
    next(error);
  }
};
