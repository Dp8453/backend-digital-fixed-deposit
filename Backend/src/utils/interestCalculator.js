/**
 * Financial Calculation Engine for Digital Fixed Deposit System
 */

const COMPOUNDING_FREQUENCY_MAP = {
  MONTHLY: 12,
  QUARTERLY: 4,
  HALF_YEARLY: 2,
  YEARLY: 1,
  AT_MATURITY: 1,
};

/**
 * Calculates compound maturity amount and total interest payable
 */
export const calculateMaturity = (
  principalAmount,
  interestRate,
  tenureMonths,
  compoundingFrequency = 'QUARTERLY'
) => {
  const P = Number(principalAmount);
  const r = Number(interestRate) / 100;
  const t = Number(tenureMonths) / 12; // Time in years
  const n = COMPOUNDING_FREQUENCY_MAP[compoundingFrequency] || 4; // Compounding frequency per year

  // Compound Interest Formula: A = P * (1 + r/n)^(n*t)
  const maturityAmountRaw = P * Math.pow(1 + r / n, n * t);
  const maturityAmount = Math.round(maturityAmountRaw * 100) / 100;
  const totalInterestPayable = Math.round((maturityAmount - P) * 100) / 100;

  // Monthly yield / breakdown
  const monthlyInterestRate = r / 12;

  return {
    principalAmount: P,
    interestRate,
    tenureMonths,
    compoundingFrequency,
    maturityAmount,
    totalInterestPayable,
    estimatedTds: totalInterestPayable > 40000 ? Math.round(totalInterestPayable * 0.1 * 100) / 100 : 0, // 10% TDS if interest > 40,000
    monthlyYield: Math.round(P * monthlyInterestRate * 100) / 100,
  };
};

/**
 * Calculates interest accrued as of today's date for an active FD
 */
export const calculateAccruedInterest = (
  principalAmount,
  interestRate,
  startDate,
  currentDate = new Date(),
  compoundingFrequency = 'QUARTERLY'
) => {
  const P = Number(principalAmount);
  const r = Number(interestRate) / 100;
  const start = new Date(startDate);
  const now = new Date(currentDate);

  const diffTime = Math.max(0, now - start);
  const elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const tYears = elapsedDays / 365.25;

  const n = COMPOUNDING_FREQUENCY_MAP[compoundingFrequency] || 4;
  const currentAmountRaw = P * Math.pow(1 + r / n, n * tYears);
  const currentAmount = Math.round(currentAmountRaw * 100) / 100;
  const accruedInterest = Math.max(0, Math.round((currentAmount - P) * 100) / 100);

  return {
    elapsedDays,
    elapsedMonths: Math.floor(elapsedDays / 30.4375),
    accruedInterest,
    currentValuation: P + accruedInterest,
  };
};

/**
 * Calculates premature withdrawal penalty and net payout amount
 */
export const calculatePrematureWithdrawal = (fd, closureDate = new Date()) => {
  const P = Number(fd.principalAmount);
  const originalRate = Number(fd.interestRate);
  const penaltyRate = Number(fd.penaltyRate || 1.0);

  const start = new Date(fd.startDate);
  const end = new Date(closureDate);
  const elapsedDays = Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
  const tYears = elapsedDays / 365.25;

  // Effective interest rate after applying premature withdrawal penalty
  const effectiveRate = Math.max(0.5, originalRate - penaltyRate);
  const rEffective = effectiveRate / 100;
  const rOriginal = originalRate / 100;

  const n = COMPOUNDING_FREQUENCY_MAP[fd.compoundingFrequency] || 4;

  // Interest at original rate up to closure date
  const originalInterestEarned = Math.round((P * Math.pow(1 + rOriginal / n, n * tYears) - P) * 100) / 100;

  // Interest at penalized effective rate up to closure date
  const penalizedInterestEarned = Math.round((P * Math.pow(1 + rEffective / n, n * tYears) - P) * 100) / 100;

  // Penalty amount deducted
  const penaltyDeducted = Math.max(0, Math.round((originalInterestEarned - penalizedInterestEarned) * 100) / 100);

  // Net Payout Amount
  const netPayoutAmount = Math.round((P + penalizedInterestEarned) * 100) / 100;

  return {
    fdNumber: fd.fdNumber,
    principalAmount: P,
    originalInterestRate: originalRate,
    penaltyRate,
    effectiveInterestRate: effectiveRate,
    elapsedDays,
    elapsedMonths: Math.floor(elapsedDays / 30.4375),
    originalInterestEarned,
    penalizedInterestEarned,
    penaltyDeducted,
    netPayoutAmount,
    breakDate: end.toISOString(),
  };
};
