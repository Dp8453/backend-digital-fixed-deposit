import FixedDeposit from '../models/fixedDeposit.model.js';
import Transaction from '../models/transaction.model.js';
import { calculateAccruedInterest } from '../utils/interestCalculator.js';
import { successResponse } from '../utils/apiResponse.js';

export const getCustomerDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Fetch all user FDs
    const fds = await FixedDeposit.find({ user: userId }).sort({ createdAt: -1 }).exec();

    const activeFds = fds.filter((fd) => fd.status === 'ACTIVE');
    const activeFdCount = activeFds.length;

    let totalInvestment = 0;
    let totalAccruedInterest = 0;

    activeFds.forEach((fd) => {
      const P = fd.principalAmount;
      totalInvestment += P;
      const accrual = calculateAccruedInterest(
        P,
        fd.interestRate,
        fd.startDate,
        new Date(),
        fd.compoundingFrequency
      );
      totalAccruedInterest += accrual.accruedInterest;
    });

    // Upcoming maturity (FD with maturityDate >= today, sorted ascending)
    const upcomingMaturityFD = activeFds
      .filter((fd) => new Date(fd.maturityDate) >= new Date())
      .sort((a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime())[0] || null;

    let upcomingMaturity = null;
    if (upcomingMaturityFD) {
      const daysLeft = Math.ceil(
        (new Date(upcomingMaturityFD.maturityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      upcomingMaturity = {
        fdNumber: upcomingMaturityFD.fdNumber,
        maturityAmount: upcomingMaturityFD.maturityAmount,
        maturityDate: upcomingMaturityFD.maturityDate,
        daysRemaining: Math.max(0, daysLeft),
      };
    }

    // Recent 5 Transactions
    const recentTransactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    // Chart Data 1: Compounding Frequency Breakdown
    const frequencyCounts = {
      QUARTERLY: 0,
      MONTHLY: 0,
      YEARLY: 0,
      HALF_YEARLY: 0,
    };

    activeFds.forEach((fd) => {
      const freq = fd.compoundingFrequency || 'QUARTERLY';
      frequencyCounts[freq] = (frequencyCounts[freq] || 0) + fd.principalAmount;
    });

    const portfolioDistribution = Object.keys(frequencyCounts).map((key) => ({
      name: key.replace('_', ' '),
      value: frequencyCounts[key],
    }));

    // Chart Data 2: 6-Month Projected Growth Trend
    const monthlyGrowthTrend = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const projectedValuation = totalInvestment + totalAccruedInterest + (totalInvestment * 0.006 * i);
      return {
        month: monthName,
        valuation: Math.round(projectedValuation),
        interest: Math.round(totalAccruedInterest + (totalInvestment * 0.006 * i)),
      };
    });

    const data = {
      summary: {
        totalInvestment: Math.round(totalInvestment * 100) / 100,
        activeFdCount,
        totalInterestEarned: Math.round(totalAccruedInterest * 100) / 100,
        currentPortfolioValue: Math.round((totalInvestment + totalAccruedInterest) * 100) / 100,
      },
      upcomingMaturity,
      recentTransactions,
      charts: {
        portfolioDistribution,
        monthlyGrowthTrend,
      },
      activeFdCards: activeFds.slice(0, 4),
    };

    return successResponse(res, 'Customer dashboard statistics retrieved', data, 200);
  } catch (error) {
    next(error);
  }
};
