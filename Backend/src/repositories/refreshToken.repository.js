import RefreshToken from '../models/refreshToken.model.js';

class RefreshTokenRepository {
  async create(tokenData) {
    return await RefreshToken.create(tokenData);
  }

  async findByToken(token) {
    return await RefreshToken.findOne({ token, isRevoked: false }).populate('user');
  }

  async revokeToken(token) {
    return await RefreshToken.findOneAndUpdate(
      { token },
      { isRevoked: true },
      { new: true }
    );
  }

  async revokeAllUserTokens(userId) {
    return await RefreshToken.updateMany(
      { user: userId, isRevoked: false },
      { isRevoked: true }
    );
  }
}

export default new RefreshTokenRepository();
