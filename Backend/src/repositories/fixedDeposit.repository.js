import FixedDeposit from '../models/fixedDeposit.model.js';

class FixedDepositRepository {
  async create(fdData) {
    return await FixedDeposit.create(fdData);
  }

  async findByUserId(userId, status = null) {
    const query = { user: userId };
    if (status) {
      query.status = status;
    }
    return await FixedDeposit.find(query).sort({ createdAt: -1 }).exec();
  }

  async findByIdAndUser(id, userId) {
    return await FixedDeposit.findOne({ _id: id, user: userId }).populate('user', 'firstName lastName email phone').exec();
  }

  async findById(id) {
    return await FixedDeposit.findById(id).populate('user', 'firstName lastName email phone').exec();
  }

  async updateStatus(id, status, extraData = {}) {
    return await FixedDeposit.findByIdAndUpdate(
      id,
      { status, ...extraData },
      { new: true }
    );
  }

  async countUserFDs(userId) {
    return await FixedDeposit.countDocuments({ user: userId, status: 'ACTIVE' });
  }

  async generateFdNumber() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await FixedDeposit.countDocuments();
    const sequence = String(count + 1).padStart(4, '0');
    return `FD${dateStr}${sequence}`;
  }
}

export default new FixedDepositRepository();
