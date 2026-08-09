import FDScheme from '../models/fdScheme.model.js';

class FDSchemeRepository {
  async getAllActive() {
    let schemes = await FDScheme.find({ isActive: true }).exec();

    // Auto-seed default schemes if DB is empty
    if (!schemes || schemes.length === 0) {
      schemes = await FDScheme.insertMany([
        {
          name: 'Regular Growth Fixed Deposit',
          code: 'REGULAR_GROWTH',
          description: 'Standard compounding growth scheme with quarterly interest reinvestment.',
          minAmount: 1000,
          maxAmount: 5000000,
          minTenureMonths: 6,
          maxTenureMonths: 60,
          standardInterestRate: 7.25,
          seniorCitizenInterestRate: 7.75,
        },
        {
          name: 'Senior Citizen Special Deposit',
          code: 'SENIOR_SPECIAL',
          description: 'High-yield deposit scheme offering additional interest benefits for seniors.',
          minAmount: 5000,
          maxAmount: 10000000,
          minTenureMonths: 12,
          maxTenureMonths: 120,
          standardInterestRate: 7.75,
          seniorCitizenInterestRate: 8.5,
        },
        {
          name: 'Tax Saver Fixed Deposit',
          code: 'TAX_SAVER',
          description: 'Tax exemption under Section 80C with 5-year lock-in period.',
          minAmount: 10000,
          maxAmount: 150000,
          minTenureMonths: 60,
          maxTenureMonths: 60,
          standardInterestRate: 7.1,
          seniorCitizenInterestRate: 7.6,
        },
      ]);
    }

    return schemes;
  }

  async findByCode(code) {
    return await FDScheme.findOne({ code: code.toUpperCase(), isActive: true });
  }

  async findById(id) {
    return await FDScheme.findById(id);
  }
}

export default new FDSchemeRepository();
