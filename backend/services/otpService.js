import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as otpRepository from '../repositories/otpRepository.js';
import { sendSmsOtp } from './smsService.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * Generates a secure random 6-digit numeric OTP using crypto.
 */
export const generateNumericOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Handles generating, hashing, and storing a new OTP, and sends it via SMS.
 * Enforces a 30-second request cooldown for duplicate requests.
 * 
 * @param {string} phone - User's mobile number
 */
export const requestOtp = async (phone) => {
  const existingOtp = await otpRepository.findOtpByPhone(phone);
  
  if (existingOtp) {
    const timeElapsed = Date.now() - new Date(existingOtp.createdAt).getTime();
    const cooldownMs = 30 * 1000;
    
    if (timeElapsed < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - timeElapsed) / 1000);
      throw new ErrorResponse(`Please wait ${waitSeconds} seconds before requesting a new OTP`, 429);
    }
  }

  // Generate 6-digit numeric OTP
  const rawOtp = generateNumericOtp();

  if (process.env.NODE_ENV !== 'production') {
    global.latestOtp = rawOtp;
  }

  // Hash the OTP with bcrypt (10 rounds)
  const hashedOtp = await bcrypt.hash(rawOtp, 10);

  // Set expiration to 5 minutes
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Store hashed OTP in database (overwrites existing for this number)
  await otpRepository.createOtp(phone, hashedOtp, expiresAt);

  // Send the raw OTP to the mobile device
  const smsResult = await sendSmsOtp(phone, rawOtp);

  return smsResult;
};

/**
 * Verifies the submitted OTP code against the stored hashed OTP.
 * Enforces a maximum of 3 attempts, invalidating/deleting the record on failure limit.
 * 
 * @param {string} phone - User's mobile number
 * @param {string} otp - The 6-digit OTP code to verify
 */
export const verifyOtpCode = async (phone, otp) => {
  const otpRecord = await otpRepository.findOtpByPhone(phone);
  
  if (!otpRecord) {
    throw new ErrorResponse('No active OTP request found. Please request a new OTP', 400);
  }

  // Check if expired
  if (new Date(otpRecord.expiresAt).getTime() < Date.now()) {
    await otpRepository.deleteOtpByPhone(phone);
    throw new ErrorResponse('OTP has expired. Please request a new OTP', 400);
  }

  // Check if attempts were already exceeded (e.g. race conditions)
  if (otpRecord.attempts >= 3) {
    await otpRepository.deleteOtpByPhone(phone);
    throw new ErrorResponse('Too many failed verification attempts. Please request a new OTP', 400);
  }

  // Increment verification attempt count
  const updatedRecord = await otpRepository.incrementAttempts(phone);
  
  // Secure comparison of plain text input vs stored hash
  const isMatch = await bcrypt.compare(otp, updatedRecord.otp);

  if (isMatch) {
    // Delete OTP on success to prevent reuse
    await otpRepository.deleteOtpByPhone(phone);
    return true;
  } else {
    const remainingAttempts = 3 - updatedRecord.attempts;
    if (remainingAttempts <= 0) {
      // Invalidate and delete OTP record immediately on exceeding 3 failed attempts
      await otpRepository.deleteOtpByPhone(phone);
      throw new ErrorResponse('Too many failed verification attempts. Please request a new OTP', 400);
    }
    throw new ErrorResponse(`Invalid OTP code. You have ${remainingAttempts} attempts remaining`, 400);
  }
};
