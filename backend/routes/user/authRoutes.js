import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  logout,
  logoutAll,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  uploadProfileImage,
  getProfile,
  verifyEmail,
  resendVerificationEmail,
  verifyMfa
} from '../../controllers/user/authController.js';
import {
  sendOtp,
  verifyOtp,
  resendOtp
} from '../../controllers/user/otpController.js';
import {
  enableMfa,
  confirmMfa,
  disableMfa
} from '../../controllers/user/mfaController.js';
import { 
  validateRegister, 
  validateLogin, 
  validateSendOtp, 
  validateVerifyOtp 
} from '../../validators/authValidator.js';
import { protect } from '../../middleware/authMiddleware.js';
import { upload } from '../../middleware/uploadMiddleware.js';

const router = express.Router();

// Device Fingerprint + IP based Key Generator for rate limiters
const fingerprintKeyGenerator = (req) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const fingerprint = req.headers['x-device-fingerprint'] || '';
  return `${ip}:${fingerprint}`;
};

// Rate Limiters - Enterprise configuration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit to 5 registration requests per hour
  keyGenerator: fingerprintKeyGenerator,
  message: {
    success: false,
    message: 'Too many accounts created from this device/IP. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 attempts per 15 minutes
  keyGenerator: fingerprintKeyGenerator,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const otpSendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit to 5 requests per 5 minutes
  keyGenerator: fingerprintKeyGenerator,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 5 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const otpVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit to 10 verification attempts per 5 minutes
  keyGenerator: fingerprintKeyGenerator,
  message: {
    success: false,
    message: 'Too many OTP verification attempts. Please try again after 5 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit to 3 reset requests per hour
  keyGenerator: fingerprintKeyGenerator,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Authentication routes
router.post('/register', registerLimiter, validateRegister, register);
router.post('/login', loginLimiter, validateLogin, login);
router.post('/verify-email', otpVerifyLimiter, verifyEmail);
router.post('/resend-verification', otpSendLimiter, resendVerificationEmail);
router.post('/verify-mfa', loginLimiter, verifyMfa);

// OTP routes
router.post('/send-otp', otpSendLimiter, validateSendOtp, sendOtp);
router.post('/verify-otp', otpVerifyLimiter, validateVerifyOtp, verifyOtp);
router.post('/resend-otp', otpSendLimiter, validateSendOtp, resendOtp);

// Session recovery / rotation
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAll);

// Password recovery
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password/:resetToken', passwordResetLimiter, resetPassword);

// Profile and MFA settings (Protected)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/avatar', protect, upload.single('avatar'), uploadProfileImage);

// MFA configuration endpoints
router.post('/mfa/enable', protect, enableMfa);
router.post('/mfa/confirm', protect, confirmMfa);
router.post('/mfa/disable', protect, disableMfa);

export default router;
