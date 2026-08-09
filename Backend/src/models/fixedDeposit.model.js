import mongoose from 'mongoose';

const fixedDepositSchema = new mongoose.Schema(
  {
    fdNumber: {
      type: String,
      required: [true, 'FD Number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    principalAmount: {
      type: Number,
      required: [true, 'Principal amount is required'],
      min: [1000, 'Minimum Fixed Deposit amount is ₹1,000'],
    },
    interestRate: {
      type: Number,
      required: [true, 'Interest rate is required'],
      min: [0.1, 'Interest rate must be positive'],
    },
    tenureMonths: {
      type: Number,
      required: [true, 'Tenure in months is required'],
      min: [1, 'Minimum tenure is 1 month'],
      max: [120, 'Maximum tenure is 120 months (10 years)'],
    },
    compoundingFrequency: {
      type: String,
      enum: {
        values: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'AT_MATURITY'],
        message: 'Invalid compounding frequency',
      },
      default: 'QUARTERLY',
    },
    payoutMode: {
      type: String,
      enum: {
        values: ['REINVEST', 'MONTHLY_PAYOUT', 'QUARTERLY_PAYOUT', 'AT_MATURITY'],
        message: 'Invalid payout mode',
      },
      default: 'AT_MATURITY',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    maturityDate: {
      type: Date,
      required: [true, 'Maturity date is required'],
      index: true,
    },
    maturityAmount: {
      type: Number,
      required: [true, 'Maturity amount is required'],
    },
    totalInterestPayable: {
      type: Number,
      required: [true, 'Total interest payable is required'],
    },
    accruedInterest: {
      type: Number,
      default: 0,
    },
    penaltyRate: {
      type: Number,
      default: 1.0, // 1% interest penalty on premature closure
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'MATURED', 'CLOSED', 'PREMATURELY_CLOSED'],
        message: 'Invalid FD status',
      },
      default: 'ACTIVE',
      index: true,
    },
    nominee: {
      name: { type: String, required: [true, 'Nominee name is required'] },
      relationship: { type: String, required: [true, 'Nominee relationship is required'] },
      age: { type: Number, required: [true, 'Nominee age is required'] },
      phone: { type: String, required: [true, 'Nominee phone is required'] },
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedAmount: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performant portfolio & admin queries
fixedDepositSchema.index({ user: 1, status: 1 });
fixedDepositSchema.index({ status: 1, maturityDate: 1 });

const FixedDeposit = mongoose.model('FixedDeposit', fixedDepositSchema);
export default FixedDeposit;
