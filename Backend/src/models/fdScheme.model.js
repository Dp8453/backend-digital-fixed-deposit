import mongoose from 'mongoose';

const fdSchemeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Scheme name is required'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Scheme code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    minAmount: {
      type: Number,
      default: 1000,
    },
    maxAmount: {
      type: Number,
      default: 10000000, // 1 Crore
    },
    minTenureMonths: {
      type: Number,
      default: 3,
    },
    maxTenureMonths: {
      type: Number,
      default: 120,
    },
    standardInterestRate: {
      type: Number,
      required: [true, 'Standard interest rate is required'],
    },
    seniorCitizenInterestRate: {
      type: Number,
      required: [true, 'Senior citizen interest rate is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const FDScheme = mongoose.model('FDScheme', fdSchemeSchema);
export default FDScheme;
