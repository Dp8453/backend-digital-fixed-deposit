import UserRepository from '../repositories/user.repository.js';
import RefreshTokenRepository from '../repositories/refreshToken.repository.js';
import JWTService from './jwt.service.js';
import EmailService from './email.service.js';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';

class AuthService {
  generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(userData) {
    const existingUser = await UserRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new AppError('An account with this email address already exists.', 400);
    }

    const existingPhone = await UserRepository.findByPhone(userData.phone);
    if (existingPhone) {
      throw new AppError('An account with this phone number already exists.', 400);
    }

    const otpCode = this.generateOtpCode();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const newUser = await UserRepository.create({
      ...userData,
      role: userData.role || 'CUSTOMER',
      status: 'PENDING_VERIFICATION',
      isEmailVerified: false,
      otp: {
        code: otpCode,
        expiresAt: otpExpiresAt,
      },
    });

    await EmailService.sendOtpEmail(newUser.email, otpCode, newUser.firstName);

    logger.info(`👤 User registered successfully: [${newUser.email}]`);

    return {
      userId: newUser._id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      status: newUser.status,
      message: 'Registration successful. Please verify the OTP sent to your email.',
    };
  }

  async verifyOtp(email, otpCode) {
    const user = await UserRepository.findByEmail(email, true);
    if (!user) {
      throw new AppError('User account not found.', 404);
    }

    if (user.isEmailVerified && user.status === 'ACTIVE') {
      return { message: 'Email address is already verified.' };
    }

    if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
      throw new AppError('No OTP request found. Please request a new OTP.', 400);
    }

    if (user.otp.expiresAt < new Date()) {
      throw new AppError('OTP has expired. Please request a new OTP.', 400);
    }

    if (user.otp.code !== otpCode) {
      throw new AppError('Invalid OTP code. Please check and try again.', 400);
    }

    await UserRepository.verifyEmail(user._id);

    logger.info(`✅ Email verified successfully for: [${user.email}]`);

    return {
      message: 'Email address verified successfully. You can now log in.',
    };
  }

  async resendOtp(email) {
    const user = await UserRepository.findByEmail(email, true);
    if (!user) {
      throw new AppError('User account not found.', 404);
    }

    if (user.isEmailVerified && user.status === 'ACTIVE') {
      throw new AppError('Email address is already verified.', 400);
    }

    const otpCode = this.generateOtpCode();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await UserRepository.updateOtp(user._id, otpCode, otpExpiresAt);
    await EmailService.sendOtpEmail(user.email, otpCode, user.firstName);

    return {
      message: 'A new verification OTP has been dispatched to your email.',
    };
  }

  async login(email, password, deviceInfo = {}) {
    const user = await UserRepository.findByEmail(email, true);
    if (!user) {
      throw new AppError('Invalid email address or password.', 401);
    }

    if (user.isLocked()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      throw new AppError(
        `Account locked due to multiple failed login attempts. Try again in ${remainingMinutes} minutes.`,
        423
      );
    }

    if (user.status === 'PENDING_VERIFICATION' || !user.isEmailVerified) {
      throw new AppError('Email verification required. Please verify your email via OTP before logging in.', 403);
    }

    if (user.status === 'DEACTIVATED') {
      throw new AppError('Account has been deactivated. Please contact support.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await UserRepository.incrementFailedLogin(user);
      throw new AppError('Invalid email address or password.', 401);
    }

    await UserRepository.resetFailedLogin(user);

    const accessToken = JWTService.generateAccessToken(user);
    const refreshToken = await JWTService.generateRefreshToken(user, deviceInfo);

    logger.info(`🔑 User logged in successfully: [${user.email}] Role: [${user.role}]`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    };
  }

  async refreshTokens(refreshTokenStr, deviceInfo = {}) {
    if (!refreshTokenStr) {
      throw new AppError('Refresh token is required.', 400);
    }

    JWTService.verifyRefreshToken(refreshTokenStr);

    const storedToken = await RefreshTokenRepository.findByToken(refreshTokenStr);
    if (!storedToken || !storedToken.user) {
      throw new AppError('Invalid or revoked refresh token.', 401);
    }

    const user = storedToken.user;
    if (user.status !== 'ACTIVE') {
      throw new AppError('User account is not active.', 403);
    }

    await RefreshTokenRepository.revokeToken(refreshTokenStr);

    const newAccessToken = JWTService.generateAccessToken(user);
    const newRefreshToken = await JWTService.generateRefreshToken(user, deviceInfo);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshTokenStr, userId) {
    if (refreshTokenStr) {
      await RefreshTokenRepository.revokeToken(refreshTokenStr);
    }
    if (userId) {
      await RefreshTokenRepository.revokeAllUserTokens(userId);
    }
    return { message: 'Logged out successfully.' };
  }

  async getCurrentUser(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404);
    }
    return user;
  }
}

export default new AuthService();
