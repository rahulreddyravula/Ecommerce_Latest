import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../../models/User.js';
import Session from '../../models/Session.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/token.js';
import { deleteFile } from '../../utils/fileHelper.js';
import { decrypt } from '../../utils/cryptoHelper.js';
import { verifyTotp } from '../../utils/mfaHelper.js';
import { verifyBotToken } from '../../utils/botProtection.js';
import { logSecurityEvent } from '../../utils/logger.js';

// Helper to hash string with SHA-256 for token storage
const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

// Normalize E.164 phone numbers
const normalizePhone = (phone) => {
  // Strip spaces, dashes, parentheses. Ensure starts with +
  let cleaned = phone.trim().replace(/[\s()+-]/g, '');
  return `+${cleaned}`;
};

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  let session = null;
  try {
    const { name, email, password, phone, botToken } = req.body;

    // Validate bot protection in production
    const isHuman = await verifyBotToken(botToken, req.ip);
    if (!isHuman) {
      logSecurityEvent('BOT_ATTEMPT_BLOCKED', { ip: req.ip, email });
      return next(new ErrorResponse('Failed security verification. Automated requests blocked.', 403));
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);

    // Try starting a transaction session if database topology supports it
    let useTransaction = false;
    const topologyType = mongoose.connection?.client?.topology?.description?.type;
    const supportsTransactions = topologyType && topologyType !== 'Single' && topologyType !== 'Unknown';

    if (supportsTransactions) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      } catch (err) {
        useTransaction = false;
        if (session) session.endSession();
        session = null;
      }
    }

    // Check if user already exists
    const queryOptions = session ? { session } : {};
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }]
    }, null, queryOptions);

    if (existingUser) {
      // MITIGATE USER ENUMERATION:
      // Return a generic success response and log the event.
      // Send a simulated email notifying the existing account of the duplicate attempt.
      if (useTransaction && session) {
        await session.commitTransaction();
      }
      
      logSecurityEvent('DUPLICATE_REGISTRATION_ATTEMPT', {
        email: normalizedEmail,
        phone: normalizedPhone,
        ip: req.ip
      });

      console.log(`\n=======================================`);
      console.log(`[EMAIL SEND SIMULATOR] TO: ${normalizedEmail}`);
      console.log(`[EMAIL SEND SIMULATOR] SUBJECT: Security Notice: Duplicate Registration Attempt`);
      console.log(`[EMAIL SEND SIMULATOR] BODY: Someone tried to register with your email. If it was you, please log in. If not, ignore this email.`);
      console.log(`=======================================\n`);

      return sendSuccess(
        res,
        {},
        'Registration successful! Please check your email to verify your account.',
        201
      );
    }

    // Create user object
    const user = new User({
      name,
      email: normalizedEmail,
      password,
      phone: normalizedPhone,
      isVerified: false
    });

    // Generate cryptographically secure verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = sha256(emailVerificationToken);
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Generate alternative email OTP
    const emailOtpCode = crypto.randomInt(100000, 1000000).toString();
    user.emailOtp = await bcrypt.hash(emailOtpCode, 10);
    user.emailOtpExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    user.emailOtpAttempts = 0;

    await user.save(queryOptions);

    if (useTransaction && session) {
      await session.commitTransaction();
    }

    logSecurityEvent('USER_REGISTERED', {
      userId: user._id,
      email: normalizedEmail,
      ip: req.ip
    });

    // Log simulated verification email delivery
    console.log(`\n=======================================`);
    console.log(`[EMAIL SEND SIMULATOR] TO: ${normalizedEmail}`);
    console.log(`[EMAIL SEND SIMULATOR] Verification URL: http://localhost:3000/verify-email?id=${user._id}&token=${emailVerificationToken}`);
    console.log(`[EMAIL SEND SIMULATOR] Verification OTP: ${emailOtpCode}`);
    console.log(`=======================================\n`);

    return sendSuccess(
      res,
      {},
      'Registration successful! Please check your email to verify your account.',
      201
    );
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    // Handle double-check on unique constraints
    if (error.code === 11000) {
      logSecurityEvent('DUPLICATE_REGISTRATION_ATTEMPT_DB_INDEX', { ip: req.ip });
      return sendSuccess(
        res,
        {},
        'Registration successful! Please check your email to verify your account.',
        201
      );
    }
    next(error);
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password, botToken } = req.body;

    // Validate bot protection in production
    const isHuman = await verifyBotToken(botToken, req.ip);
    if (!isHuman) {
      logSecurityEvent('BOT_LOGIN_BLOCKED', { ip: req.ip, email });
      return next(new ErrorResponse('Failed security verification. Automated requests blocked.', 403));
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user and select password and history
    const user = await User.findOne({ email: normalizedEmail }).select('+password +loginAttempts +lockUntil');
    
    // Account Lockout check
    if (user && user.lockUntil && user.lockUntil > Date.now()) {
      logSecurityEvent('AUTH_LOCKOUT_BLOCKED', { userId: user._id, ip: req.ip });
      const waitMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return next(new ErrorResponse(`Account is temporarily locked due to too many failed attempts. Please try again after ${waitMinutes} minutes.`, 403));
    }

    // Mitigation for Timing Attacks: Run dummy comparison if user doesn't exist
    if (!user) {
      // Salt and work factor matching standard
      const dummySalt = '$2b$12$dummyhashforprotectiondu';
      const dummyHash = await bcrypt.hash('dummypassword', dummySalt);
      await bcrypt.compare(password, dummyHash);
      
      logSecurityEvent('AUTH_FAIL_NON_EXISTENT_EMAIL', { email: normalizedEmail, ip: req.ip });
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 minutes
        user.loginAttempts = 0;
        logSecurityEvent('ACCOUNT_LOCKED', { userId: user._id, ip: req.ip });
      }
      
      await user.save();
      logSecurityEvent('AUTH_FAIL_INCORRECT_PASSWORD', { userId: user._id, ip: req.ip });
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if account blocked
    if (user.status === 'blocked') {
      logSecurityEvent('AUTH_BLOCKED_ACCOUNT_ATTEMPT', { userId: user._id, ip: req.ip });
      return next(new ErrorResponse('Your account is blocked. Contact support.', 403));
    }

    // Check email verification status
    if (!user.isVerified) {
      logSecurityEvent('AUTH_FAIL_UNVERIFIED_EMAIL', { userId: user._id, ip: req.ip });
      return next(new ErrorResponse('Please verify your email address to activate your account.', 401));
    }

    // Reset login attempts on successful credentials match
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Check Multi-Factor Authentication status
    if (user.isMfaEnabled) {
      // Issue short-lived challenge token (expires in 5 minutes)
      const mfaToken = jwt.sign(
        { id: user._id, mfaChallenge: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      
      logSecurityEvent('MFA_CHALLENGE_ISSUED', { userId: user._id, ip: req.ip });
      
      return sendSuccess(
        res,
        { mfaRequired: true, mfaToken },
        'MFA verification code is required to complete authentication.'
      );
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save active Session record
    const tokenHash = sha256(refreshToken);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    await Session.create({
      userId: user._id,
      tokenHash,
      deviceFingerprint: sha256(userAgent),
      ipAddress: req.ip || 'unknown',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days matching refresh token expiry
    });

    // Set refresh token in HttpOnly secure cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logSecurityEvent('AUTH_SUCCESS', { userId: user._id, ip: req.ip });

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

/**
 * @desc    Verify TOTP MFA code
 * @route   POST /api/v1/auth/verify-mfa
 * @access  Public
 */
export const verifyMfa = async (req, res, next) => {
  try {
    const { mfaToken, code } = req.body;

    if (!mfaToken || !code) {
      return next(new ErrorResponse('Verification token and code are required', 400));
    }

    // Verify MFA token
    let decoded;
    try {
      decoded = jwt.verify(mfaToken, process.env.JWT_SECRET);
    } catch (err) {
      return next(new ErrorResponse('MFA challenge session expired. Please log in again.', 401));
    }

    if (!decoded.mfaChallenge) {
      return next(new ErrorResponse('Invalid authentication context', 401));
    }

    // Retrieve user and their MFA secret key
    const user = await User.findById(decoded.id).select('+mfaSecret');
    if (!user || !user.isMfaEnabled || !user.mfaSecret) {
      return next(new ErrorResponse('User record not found or MFA is not enabled', 401));
    }

    // Decrypt standard base32 key
    const mfaSecretDecrypted = decrypt(user.mfaSecret);

    // Verify TOTP token
    const isTotpValid = verifyTotp(mfaSecretDecrypted, code);
    if (!isTotpValid) {
      logSecurityEvent('MFA_VERIFICATION_FAILED', { userId: user._id, ip: req.ip });
      return next(new ErrorResponse('Invalid authentication code', 401));
    }

    // Clear verification attempts and generate normal session tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const tokenHash = sha256(refreshToken);
    const userAgent = req.headers['user-agent'] || 'unknown';

    await Session.create({
      userId: user._id,
      tokenHash,
      deviceFingerprint: sha256(userAgent),
      ipAddress: req.ip || 'unknown',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logSecurityEvent('MFA_VERIFICATION_SUCCESS', { userId: user._id, ip: req.ip });

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
      'Authenticated successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email address
 * @route   POST /api/v1/auth/verify-email
 * @access  Public
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { userId, token, email, otp } = req.body;

    // Handle signed URL / token verification
    if (userId && token) {
      const hashedToken = sha256(token);
      const user = await User.findOne({
        _id: userId,
        verificationToken: hashedToken,
        verificationTokenExpires: { $gt: Date.now() }
      });

      if (!user) {
        return next(new ErrorResponse('Invalid or expired verification link.', 400));
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      user.emailOtp = undefined;
      user.emailOtpExpires = undefined;
      user.emailOtpAttempts = 0;
      await user.save();

      logSecurityEvent('EMAIL_VERIFICATION_SUCCESS_LINK', { userId: user._id });

      return sendSuccess(res, {}, 'Your email has been verified successfully! You can now log in.');
    }

    // Handle OTP verification
    if (email && otp) {
      const normalizedEmail = email.trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail }).select('+emailOtp +emailOtpExpires +emailOtpAttempts');

      if (!user) {
        // Prevent revealing user existence
        return next(new ErrorResponse('Invalid verification request.', 400));
      }

      if (user.isVerified) {
        return next(new ErrorResponse('Email is already verified.', 400));
      }

      if (!user.emailOtp || !user.emailOtpExpires || user.emailOtpExpires < Date.now()) {
        return next(new ErrorResponse('Verification code has expired or is invalid. Please request a new one.', 400));
      }

      if (user.emailOtpAttempts >= 3) {
        user.emailOtp = undefined;
        user.emailOtpExpires = undefined;
        await user.save();
        return next(new ErrorResponse('Too many failed verification attempts. Please request a new verification code.', 400));
      }

      // Increment attempt count
      user.emailOtpAttempts += 1;

      const isOtpMatch = await bcrypt.compare(otp, user.emailOtp);
      if (!isOtpMatch) {
        await user.save();
        const remaining = 3 - user.emailOtpAttempts;
        return next(new ErrorResponse(`Invalid verification code. You have ${remaining} attempts remaining.`, 400));
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      user.emailOtp = undefined;
      user.emailOtpExpires = undefined;
      user.emailOtpAttempts = 0;
      await user.save();

      logSecurityEvent('EMAIL_VERIFICATION_SUCCESS_OTP', { userId: user._id });

      return sendSuccess(res, {}, 'Your email has been verified successfully! You can now log in.');
    }

    return next(new ErrorResponse('Verification parameters are missing.', 400));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend Email verification OTP
 * @route   POST /api/v1/auth/resend-verification
 * @access  Public
 */
export const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new ErrorResponse('Email address is required.', 400));
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // User enumeration protection
    if (!user) {
      return sendSuccess(res, {}, 'If this account is registered, a verification link has been resent.');
    }

    if (user.isVerified) {
      return next(new ErrorResponse('Account is already verified.', 400));
    }

    // Limit cooldown checks using previous token expires
    // Generate new secure verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = sha256(emailVerificationToken);
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    // Alternative OTP
    const emailOtpCode = crypto.randomInt(100000, 1000000).toString();
    user.emailOtp = await bcrypt.hash(emailOtpCode, 10);
    user.emailOtpExpires = Date.now() + 15 * 60 * 1000;
    user.emailOtpAttempts = 0;

    await user.save();

    console.log(`\n=======================================`);
    console.log(`[EMAIL SEND SIMULATOR RESEND] TO: ${normalizedEmail}`);
    console.log(`[EMAIL SEND SIMULATOR RESEND] Verification URL: http://localhost:3000/verify-email?id=${user._id}&token=${emailVerificationToken}`);
    console.log(`[EMAIL SEND SIMULATOR RESEND] Verification OTP: ${emailOtpCode}`);
    console.log(`=======================================\n`);

    logSecurityEvent('EMAIL_VERIFICATION_RESENT', { userId: user._id });

    return sendSuccess(res, {}, 'If this account is registered, a verification link has been resent.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user / Clear session
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    
    if (token) {
      const hash = sha256(token);
      await Session.deleteOne({ tokenHash: hash });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    if (req.user) {
      logSecurityEvent('LOGOUT_SUCCESS', { userId: req.user._id });
    }
    
    return sendSuccess(res, {}, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout all devices
 * @route   POST /api/v1/auth/logout-all
 * @access  Private
 */
export const logoutAll = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Revoke all sessions
    await Session.deleteMany({ userId });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    logSecurityEvent('LOGOUT_ALL_DEVICES', { userId });

    return sendSuccess(res, {}, 'Successfully logged out of all devices');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token (Token rotation + Theft detection)
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;

    if (!token) {
      return next(new ErrorResponse('Refresh token is required', 400));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      // Expired or bad JWT syntax
      return next(new ErrorResponse('Invalid or expired refresh token. Please login again.', 401));
    }

    const currentHash = sha256(token);

    // Look up current refresh token hash in DB
    const sessionRecord = await Session.findOne({ tokenHash: currentHash });

    // THEFT DETECTION:
    // If the token is valid but no session is active or it has been revoked:
    // This implies that either the token was already used (reuse) or the session was force revoked.
    // In either case, standard security protocol is to force-revoke all tokens for the user.
    if (!sessionRecord || sessionRecord.isRevoked) {
      await Session.deleteMany({ userId: decoded.id });
      res.clearCookie('refreshToken');
      
      logSecurityEvent('TOKEN_REUSE_THEFT_DETECTED', {
        userId: decoded.id,
        ip: req.ip,
        tokenHash: currentHash
      });

      return next(new ErrorResponse('Security breach detected. All sessions revoked. Please log in again.', 401));
    }

    // Retrieve user
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new ErrorResponse('Invalid refresh token, user not found', 401));
    }

    if (user.status === 'blocked') {
      return next(new ErrorResponse('Your account is blocked. Contact support.', 403));
    }

    // Generate new Access and Refresh tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    const newHash = sha256(newRefreshToken);

    // Rotate current session: mark it revoked and track replacement
    sessionRecord.isRevoked = true;
    sessionRecord.replacedByToken = newHash;
    await sessionRecord.save();

    // Create the new session
    const userAgent = req.headers['user-agent'] || 'unknown';
    await Session.create({
      userId: user._id,
      tokenHash: newHash,
      deviceFingerprint: sha256(userAgent),
      ipAddress: req.ip || 'unknown',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Update refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logSecurityEvent('TOKEN_ROTATED', { userId: user._id, ip: req.ip });

    return sendSuccess(
      res, 
      { accessToken: newAccessToken }, 
      'Token refreshed successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    
    // User enumeration protection
    if (!user) {
      return sendSuccess(res, {}, 'If the email matches a registered account, you will receive a reset password link.');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash and set on user schema
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expiration to 10 minutes
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    console.log(`\n=======================================`);
    console.log(`[PASSWORD RESET SIMULATOR] TO: ${normalizedEmail}`);
    console.log(`[PASSWORD RESET SIMULATOR] Reset URL: http://localhost:3000/reset-password/${resetToken}`);
    console.log(`=======================================\n`);

    logSecurityEvent('PASSWORD_RESET_REQUEST', { userId: user._id });

    return sendSuccess(
      res, 
      {}, 
      'If the email matches a registered account, you will receive a reset password link.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password
 * @route   POST /api/v1/auth/reset-password/:resetToken
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { resetToken } = req.params;
    const { password } = req.body;

    if (!password) {
      return next(new ErrorResponse('Password is required', 400));
    }

    // Hash token to match database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password +passwordHistory');

    if (!user) {
      return next(new ErrorResponse('Invalid or expired reset token', 400));
    }

    // Enforce Password Reuse Prevention: Check past 5 password hashes in history
    const isReused = await bcrypt.compare(password, user.password) ||
      (await Promise.all(user.passwordHistory.map(hash => bcrypt.compare(password, hash))))
      .some(result => result === true);

    if (isReused) {
      return next(new ErrorResponse('Security policy prevents reuse of recent passwords. Please choose a different password.', 400));
    }

    // Push previous password hash to history
    user.passwordHistory.push(user.password);
    if (user.passwordHistory.length > 5) {
      user.passwordHistory.shift(); // keep only last 5
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Revoke all existing sessions for this user on password reset!
    await Session.deleteMany({ userId: user._id });

    logSecurityEvent('PASSWORD_RESET_SUCCESS', { userId: user._id, ip: req.ip });

    return sendSuccess(res, {}, 'Password reset successfully. Please log in again.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return next(new ErrorResponse('Old and new passwords are required', 400));
    }

    const user = await User.findById(req.user.id).select('+password +passwordHistory');
    if (!user) {
      return next(new ErrorResponse('User record not found', 404));
    }

    // Verify old password
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return next(new ErrorResponse('Invalid current password', 401));
    }

    // Check Password Reuse Prevention
    const isReused = await bcrypt.compare(newPassword, user.password) ||
      (await Promise.all(user.passwordHistory.map(hash => bcrypt.compare(newPassword, hash))))
      .some(result => result === true);

    if (isReused) {
      return next(new ErrorResponse('Security policy prevents reuse of recent passwords. Please choose a different password.', 400));
    }

    // Update password history
    user.passwordHistory.push(user.password);
    if (user.passwordHistory.length > 5) {
      user.passwordHistory.shift();
    }

    // Set new password
    user.password = newPassword;
    await user.save();

    // Revoke other device sessions on password change
    const activeRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (activeRefreshToken) {
      const activeHash = sha256(activeRefreshToken);
      await Session.deleteMany({ userId: user._id, tokenHash: { $ne: activeHash } });
    } else {
      await Session.deleteMany({ userId: user._id });
    }

    logSecurityEvent('PASSWORD_CHANGED', { userId: user._id });

    return sendSuccess(res, {}, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update profile info
 * @route   PUT /api/v1/auth/profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }
    
    // Prevent Mass Assignment: Only allow specific parameters
    if (name) {
      user.name = name;
    }
    if (phone) {
      user.phone = normalizePhone(phone);
    }
    
    await user.save();

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

    logSecurityEvent('PROFILE_UPDATED', { userId: user._id });

    return sendSuccess(res, { user: userData }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload avatar profile image
 * @route   POST /api/v1/auth/avatar
 * @access  Private
 */
export const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ErrorResponse('Please upload a file', 400));
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }
    
    // Normalize path separator and format URL
    const formattedPath = '/' + req.file.path.replace(/\\/g, '/');
    
    // Delete old avatar
    if (user.avatar) {
      await deleteFile(user.avatar);
    }

    user.avatar = formattedPath;
    await user.save();

    logSecurityEvent('AVATAR_UPLOADED', { userId: user._id });

    return sendSuccess(
      res, 
      { avatar: formattedPath }, 
      'Profile image uploaded successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/profile
 * @access  Private
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

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

    return sendSuccess(res, { user: userData }, 'User profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};
