import * as otpService from '../../services/otpService.js';
import * as userRepository from '../../repositories/userRepository.js';
import Session from '../../models/Session.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/token.js';
import { logSecurityEvent } from '../../utils/logger.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

// Normalize E.164 phone numbers
const normalizePhone = (phone) => {
  let cleaned = phone.trim().replace(/[\s()+-]/g, '');
  return `+${cleaned}`;
};

/**
 * @desc    Send OTP to user's mobile number (User Enumeration Safe)
 * @route   POST /api/v1/auth/send-otp
 * @access  Public
 */
export const sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return next(new ErrorResponse('Phone number is required', 400));
    }

    const normalizedPhone = normalizePhone(phone);

    // Check if the user exists
    const user = await userRepository.findUserByPhone(normalizedPhone);
    if (!user) {
      logSecurityEvent('OTP_SEND_NON_EXISTENT_PHONE', { phone: normalizedPhone, ip: req.ip });
      // Simulate successful request to prevent user enumeration
      return sendSuccess(
        res,
        {},
        'If your mobile number is registered, a secure OTP code has been sent.'
      );
    }

    if (user.status === 'blocked') {
      logSecurityEvent('OTP_SEND_BLOCKED_ACCOUNT', { userId: user._id, ip: req.ip });
      return next(new ErrorResponse('Service temporarily unavailable. Please contact support.', 403));
    }

    // Generate and send OTP via SMS provider
    await otpService.requestOtp(normalizedPhone);

    logSecurityEvent('OTP_SEND_SUCCESS', { userId: user._id, ip: req.ip });

    return sendSuccess(
      res,
      {},
      'If your mobile number is registered, a secure OTP code has been sent.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend OTP to user's mobile number
 * @route   POST /api/v1/auth/resend-otp
 * @access  Public
 */
export const resendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return next(new ErrorResponse('Phone number is required', 400));
    }

    const normalizedPhone = normalizePhone(phone);

    const user = await userRepository.findUserByPhone(normalizedPhone);
    if (!user) {
      logSecurityEvent('OTP_RESEND_NON_EXISTENT_PHONE', { phone: normalizedPhone, ip: req.ip });
      return sendSuccess(
        res,
        {},
        'If your mobile number is registered, a secure OTP code has been sent.'
      );
    }

    if (user.status === 'blocked') {
      logSecurityEvent('OTP_RESEND_BLOCKED_ACCOUNT', { userId: user._id, ip: req.ip });
      return next(new ErrorResponse('Service temporarily unavailable. Please contact support.', 403));
    }

    // Trigger OTP regeneration and SMS sending
    await otpService.requestOtp(normalizedPhone);

    logSecurityEvent('OTP_RESEND_SUCCESS', { userId: user._id, ip: req.ip });

    return sendSuccess(
      res,
      {},
      'If your mobile number is registered, a secure OTP code has been sent.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP and log user in
 * @route   POST /api/v1/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return next(new ErrorResponse('Phone and OTP are required', 400));
    }

    const normalizedPhone = normalizePhone(phone);

    const user = await userRepository.findUserByPhone(normalizedPhone);
    
    // Timing attack defense: compute dummy hash verify if user not found
    if (!user) {
      const dummySalt = '$2b$10$dummyhashforprotectiondu';
      const dummyHash = await bcrypt.hash('123456', dummySalt);
      await bcrypt.compare(otp, dummyHash);
      
      logSecurityEvent('OTP_VERIFY_NON_EXISTENT_USER', { phone: normalizedPhone, ip: req.ip });
      return next(new ErrorResponse('Invalid or expired verification code.', 400));
    }

    if (user.status === 'blocked') {
      logSecurityEvent('OTP_VERIFY_BLOCKED_ACCOUNT', { userId: user._id, ip: req.ip });
      return next(new ErrorResponse('Your account is blocked. Contact support.', 403));
    }

    // Validate the OTP code securely (hashes OTP comparison, increments attempts up to 3)
    try {
      await otpService.verifyOtpCode(normalizedPhone, otp);
    } catch (error) {
      logSecurityEvent('OTP_VERIFY_FAILED', { userId: user._id, ip: req.ip, error: error.message });
      return next(error);
    }

    // Force user as verified upon login with OTP
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    // Generate JWT access and refresh tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save Session in database for tracking & rotation
    const tokenHash = sha256(refreshToken);
    const userAgent = req.headers['user-agent'] || 'unknown';

    await Session.create({
      userId: user._id,
      tokenHash,
      deviceFingerprint: sha256(userAgent),
      ipAddress: req.ip || 'unknown',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Set refresh token in HTTP-only SameSite:strict cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logSecurityEvent('OTP_VERIFY_SUCCESS_LOGIN', { userId: user._id, ip: req.ip });

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
      status: user.status
    };

    return sendSuccess(
      res,
      { user: userData, accessToken },
      'Logged in successfully'
    );
  } catch (error) {
    next(error);
  }
};
