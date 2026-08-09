import FixedDepositRepository from '../repositories/fixedDeposit.repository.js';
import FDSchemeRepository from '../repositories/fdScheme.repository.js';
import User from '../models/user.model.js';
import Transaction from '../models/transaction.model.js';
import NotificationService from './notification.service.js';
import EmailService from './email.service.js';
import { calculateMaturity, calculateAccruedInterest, calculatePrematureWithdrawal } from '../utils/interestCalculator.js';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';

class FDService {
  async calculateProjections(payload) {
    const { principalAmount, interestRate, tenureMonths, compoundingFrequency } = payload;

    if (!principalAmount || principalAmount < 1000) {
      throw new AppError('Minimum Fixed Deposit principal amount is ₹1,000.', 400);
    }
    if (!tenureMonths || tenureMonths < 1 || tenureMonths > 120) {
      throw new AppError('Tenure must be between 1 and 120 months.', 400);
    }
    if (!interestRate || interestRate <= 0) {
      throw new AppError('A valid positive interest rate is required.', 400);
    }

    return calculateMaturity(principalAmount, interestRate, tenureMonths, compoundingFrequency || 'QUARTERLY');
  }

  async bookFixedDeposit(userId, payload) {
    const { principalAmount, tenureMonths, compoundingFrequency, payoutMode, nominee, customInterestRate } = payload;

    if (!principalAmount || principalAmount < 1000) {
      throw new AppError('Minimum deposit amount is ₹1,000.', 400);
    }
    if (!tenureMonths || tenureMonths < 1 || tenureMonths > 120) {
      throw new AppError('Tenure must be between 1 and 120 months.', 400);
    }
    if (!nominee || !nominee.name || !nominee.relationship || !nominee.age || !nominee.phone) {
      throw new AppError('Complete nominee details (name, relationship, age, phone) are required.', 400);
    }

    let interestRate = customInterestRate || 7.25;
    if (tenureMonths >= 12 && tenureMonths < 24) interestRate = 7.5;
    if (tenureMonths >= 24 && tenureMonths < 36) interestRate = 7.75;
    if (tenureMonths >= 36) interestRate = 8.0;

    const startDate = new Date();
    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + Number(tenureMonths));

    const maturityCalc = calculateMaturity(principalAmount, interestRate, tenureMonths, compoundingFrequency);
    const fdNumber = await FixedDepositRepository.generateFdNumber();

    const newFD = await FixedDepositRepository.create({
      fdNumber,
      user: userId,
      principalAmount: Number(principalAmount),
      interestRate,
      tenureMonths: Number(tenureMonths),
      compoundingFrequency: compoundingFrequency || 'QUARTERLY',
      payoutMode: payoutMode || 'AT_MATURITY',
      startDate,
      maturityDate,
      maturityAmount: maturityCalc.maturityAmount,
      totalInterestPayable: maturityCalc.totalInterestPayable,
      accruedInterest: 0,
      penaltyRate: 1.0,
      status: 'ACTIVE',
      nominee,
    });

    // Record Ledger Booking Transaction
    const txnId = `TXN${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    await Transaction.create({
      transactionId: txnId,
      user: userId,
      fixedDeposit: newFD._id,
      type: 'FD_BOOKING',
      amount: Number(principalAmount),
      status: 'SUCCESS',
      paymentMethod: 'NET_BANKING',
      description: `Fixed Deposit ${fdNumber} booked successfully for ${tenureMonths} months at ${interestRate}% p.a.`,
    });

    // Trigger Notification & Email
    const userObj = await User.findById(userId).select('email firstName');
    if (userObj) {
      await NotificationService.createNotification(
        userId,
        `FD #${fdNumber} Booked Successfully!`,
        `Your Fixed Deposit of ₹${Number(principalAmount).toLocaleString('en-IN')} has been created. Maturity Amount: ₹${maturityCalc.maturityAmount.toLocaleString('en-IN')}.`,
        'GENERAL_ALERT'
      );
      await EmailService.sendFdBookingEmail(
        userObj.email,
        userObj.firstName,
        fdNumber,
        Number(principalAmount),
        maturityCalc.maturityAmount,
        maturityDate
      );
    }

    logger.info(`💰 FD Booked: [${fdNumber}] Principal: ₹${principalAmount} User: [${userId}]`);

    return newFD;
  }

  async getUserPortfolio(userId, status = null) {
    const fds = await FixedDepositRepository.findByUserId(userId, status);

    const portfolio = fds.map((fd) => {
      const fdObj = fd.toObject();
      if (fdObj.status === 'ACTIVE') {
        const accrual = calculateAccruedInterest(
          fdObj.principalAmount,
          fdObj.interestRate,
          fdObj.startDate,
          new Date(),
          fdObj.compoundingFrequency
        );
        fdObj.accruedInterest = accrual.accruedInterest;
        fdObj.currentValuation = accrual.currentValuation;
      }
      return fdObj;
    });

    const totalPrincipal = portfolio.reduce((sum, item) => sum + (item.status === 'ACTIVE' ? item.principalAmount : 0), 0);
    const totalAccruedInterest = portfolio.reduce((sum, item) => sum + (item.status === 'ACTIVE' ? (item.accruedInterest || 0) : 0), 0);

    return {
      portfolio,
      summary: {
        totalActiveDeposits: portfolio.filter((i) => i.status === 'ACTIVE').length,
        totalPrincipalInvested: Math.round(totalPrincipal * 100) / 100,
        totalAccruedInterest: Math.round(totalAccruedInterest * 100) / 100,
        currentPortfolioValuation: Math.round((totalPrincipal + totalAccruedInterest) * 100) / 100,
      },
    };
  }

  async getFDDetails(fdId, userId) {
    const fd = await FixedDepositRepository.findByIdAndUser(fdId, userId);
    if (!fd) {
      throw new AppError('Fixed Deposit account not found or access denied.', 404);
    }

    const fdObj = fd.toObject();
    if (fdObj.status === 'ACTIVE') {
      const accrual = calculateAccruedInterest(
        fdObj.principalAmount,
        fdObj.interestRate,
        fdObj.startDate,
        new Date(),
        fdObj.compoundingFrequency
      );
      fdObj.accruedInterest = accrual.accruedInterest;
      fdObj.currentValuation = accrual.currentValuation;
      fdObj.elapsedDays = accrual.elapsedDays;
    }

    const transactions = await Transaction.find({ fixedDeposit: fdId }).sort({ createdAt: -1 }).exec();

    return {
      fixedDeposit: fdObj,
      transactions,
    };
  }

  async simulatePrematureBreak(fdId, userId) {
    const fd = await FixedDepositRepository.findByIdAndUser(fdId, userId);
    if (!fd) {
      throw new AppError('Fixed Deposit account not found or access denied.', 404);
    }

    if (fd.status !== 'ACTIVE') {
      throw new AppError(`Cannot simulate break. Fixed Deposit status is currently ${fd.status}.`, 400);
    }

    return calculatePrematureWithdrawal(fd, new Date());
  }

  async processPrematureBreak(fdId, userId) {
    const fd = await FixedDepositRepository.findByIdAndUser(fdId, userId);
    if (!fd) {
      throw new AppError('Fixed Deposit account not found or access denied.', 404);
    }

    if (fd.status !== 'ACTIVE') {
      throw new AppError(`Cannot close FD. Fixed Deposit is currently ${fd.status}.`, 400);
    }

    const breakResult = calculatePrematureWithdrawal(fd, new Date());

    const updatedFD = await FixedDepositRepository.updateStatus(fdId, 'CLOSED', {
      closedAt: new Date(),
      closedAmount: breakResult.netPayoutAmount,
    });

    const txnId1 = `TXN${Date.now()}1`;
    await Transaction.create({
      transactionId: txnId1,
      user: userId,
      fixedDeposit: fd._id,
      type: 'PREMATURE_WITHDRAWAL',
      amount: breakResult.netPayoutAmount,
      status: 'SUCCESS',
      paymentMethod: 'NET_BANKING',
      description: `Premature closure payout for ${fd.fdNumber} after 1% penalty deduction.`,
    });

    if (breakResult.penaltyDeducted > 0) {
      const txnId2 = `TXN${Date.now()}2`;
      await Transaction.create({
        transactionId: txnId2,
        user: userId,
        fixedDeposit: fd._id,
        type: 'PENALTY_DEDUCTION',
        amount: breakResult.penaltyDeducted,
        status: 'SUCCESS',
        paymentMethod: 'SYSTEM_AUTO',
        description: `1% premature withdrawal penalty applied to ${fd.fdNumber}.`,
      });
    }

    // Trigger Notification & Email
    const userObj = await User.findById(userId).select('email firstName');
    if (userObj) {
      await NotificationService.createNotification(
        userId,
        `FD #${fd.fdNumber} Closed Prematurely`,
        `Net settlement payout of ₹${breakResult.netPayoutAmount.toLocaleString('en-IN')} credited after 1% penalty deduction.`,
        'GENERAL_ALERT'
      );
      await EmailService.sendFdWithdrawalEmail(
        userObj.email,
        userObj.firstName,
        fd.fdNumber,
        breakResult.netPayoutAmount,
        breakResult.penaltyDeducted
      );
    }

    logger.info(`💔 FD Prematurely Closed: [${fd.fdNumber}] Net Payout: ₹${breakResult.netPayoutAmount}`);

    return {
      fixedDeposit: updatedFD,
      settlementDetails: breakResult,
    };
  }

  async getSchemes() {
    return await FDSchemeRepository.getAllActive();
  }
}

export default new FDService();
