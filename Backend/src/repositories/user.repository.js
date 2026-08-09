import User from '../models/user.model.js';

class UserRepository {
  async create(userData) {
    return await User.create(userData);
  }

  async findByEmail(email, includePassword = false) {
    const query = User.findOne({ email });
    if (includePassword) {
      query.select('+password +otp.code +otp.expiresAt');
    }
    return await query.exec();
  }

  async findById(id, includePassword = false) {
    const query = User.findById(id);
    if (includePassword) {
      query.select('+password +otp.code +otp.expiresAt');
    }
    return await query.exec();
  }

  async findByPhone(phone) {
    return await User.findOne({ phone });
  }

  async updateById(id, updateData) {
    return await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async updateOtp(userId, code, expiresAt) {
    return await User.findByIdAndUpdate(
      userId,
      {
        otp: { code, expiresAt },
      },
      { new: true }
    );
  }

  async verifyEmail(userId) {
    return await User.findByIdAndUpdate(
      userId,
      {
        isEmailVerified: true,
        status: 'ACTIVE',
        $unset: { otp: 1 },
      },
      { new: true }
    );
  }

  async incrementFailedLogin(user) {
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes lock

    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.status = 'LOCKED';
      user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
    }
    return await user.save();
  }

  async resetFailedLogin(user) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    if (user.status === 'LOCKED') {
      user.status = 'ACTIVE';
    }
    return await user.save();
  }
}

export default new UserRepository();
