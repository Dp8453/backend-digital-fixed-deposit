import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    fixedDeposit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FixedDeposit',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: [
          'FD_BOOKING',
          'INTEREST_CREDIT',
          'MATURITY_PAYOUT',
          'PREMATURE_WITHDRAWAL',
          'PENALTY_DEDUCTION',
        ],
        message: 'Invalid transaction type',
      },
      required: [true, 'Transaction type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be greater than or equal to 0'],
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'SUCCESS', 'FAILED', 'REVERSED'],
        message: 'Invalid transaction status',
      },
      default: 'SUCCESS',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['NET_BANKING', 'UPI', 'BANK_TRANSFER', 'SYSTEM_AUTO'],
      default: 'NET_BANKING',
    },
    referenceNumber: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ user: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
