import { Router } from 'express';
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  refreshToken,
  logout,
  getMe,
  adminTest,
} from '../controllers/auth.controller.js';
import {
  registerValidationRules,
  verifyOtpValidationRules,
  loginValidationRules,
  resendOtpValidationRules,
} from '../validators/auth.validator.js';
import validate from '../middlewares/validate.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Public Routes
router.post('/register', validate(registerValidationRules), register);
router.post('/verify-otp', validate(verifyOtpValidationRules), verifyOtp);
router.post('/resend-otp', validate(resendOtpValidationRules), resendOtp);
router.post('/login', validate(loginValidationRules), login);
router.post('/refresh-token', refreshToken);
router.post('/logout', authenticate, logout);

// Protected User/Customer Routes
router.get('/me', authenticate, getMe);

// Protected Admin Routes
router.get('/admin-test', authenticate, authorize('ADMIN'), adminTest);

export default router;
