import AuthService from '../services/auth.service.js';
import { successResponse } from '../utils/apiResponse.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

export const register = async (req, res, next) => {
  try {
    const result = await AuthService.register(req.body);
    return successResponse(res, result.message, result, 201);
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await AuthService.verifyOtp(email, otp);
    return successResponse(res, result.message, null, 200);
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await AuthService.resendOtp(email);
    return successResponse(res, result.message, null, 200);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const deviceInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
    };

    const result = await AuthService.login(email, password, deviceInfo);

    res.cookie('accessToken', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return successResponse(res, 'Login successful', result, 200);
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    const deviceInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
    };

    const result = await AuthService.refreshTokens(token, deviceInfo);

    res.cookie('accessToken', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return successResponse(res, 'Tokens refreshed successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    const userId = req.user?._id;

    await AuthService.logout(token, userId);

    res.clearCookie('accessToken', COOKIE_OPTIONS);
    res.clearCookie('refreshToken', COOKIE_OPTIONS);

    return successResponse(res, 'Logged out successfully', null, 200);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await AuthService.getCurrentUser(req.user._id);
    return successResponse(res, 'User profile retrieved successfully', user, 200);
  } catch (error) {
    next(error);
  }
};

export const adminTest = async (req, res, next) => {
  try {
    return successResponse(
      res,
      'Admin access granted. You have administrative privileges.',
      {
        adminId: req.user._id,
        email: req.user.email,
        role: req.user.role,
        accessGrantedAt: new Date().toISOString(),
      },
      200
    );
  } catch (error) {
    next(error);
  }
};
