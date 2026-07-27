import Otp from '../models/Otp.js';

/**
 * Creates a new OTP record for a phone number.
 * Automatically deletes any existing OTP records for that number first.
 */
export const createOtp = async (phone, hashedOtp, expiresAt) => {
  await Otp.deleteMany({ phone });
  return await Otp.create({
    phone,
    otp: hashedOtp,
    expiresAt
  });
};

/**
 * Finds the active OTP record for a phone number.
 */
export const findOtpByPhone = async (phone) => {
  return await Otp.findOne({ phone });
};

/**
 * Deletes all OTP records associated with a phone number.
 */
export const deleteOtpByPhone = async (phone) => {
  return await Otp.deleteMany({ phone });
};

/**
 * Increments the verification attempts for an OTP record.
 * Returns the updated document.
 */
export const incrementAttempts = async (phone) => {
  return await Otp.findOneAndUpdate(
    { phone },
    { $inc: { attempts: 1 } },
    { new: true }
  );
};
