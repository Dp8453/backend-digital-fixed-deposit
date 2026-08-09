import jwt from 'jsonwebtoken';
import RefreshTokenRepository from '../repositories/refreshToken.repository.js';
import AppError from '../utils/appError.js';

class JWTService {
  generateAccessToken(user) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
      expiresIn: process.env.JWT_EXPIRE || '15m',
    });
  }

  async generateRefreshToken(user, deviceInfo = {}) {
    const payload = {
      id: user._id,
    };

    const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret', {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshTokenRepository.create({
      token,
      user: user._id,
      deviceInfo,
      expiresAt,
    });

    return token;
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Access token has expired', 401);
      }
      throw new AppError('Invalid access token', 401);
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret');
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Refresh token has expired', 401);
      }
      throw new AppError('Invalid refresh token', 401);
    }
  }
}

export default new JWTService();
