import User from '../../models/User.js';
import ErrorResponse from '../../utils/errorResponse.js';
import { sendSuccess } from '../../utils/responseFormatter.js';
import { generateMfaSecret, getOtpauthUrl, verifyTotp } from '../../utils/mfaHelper.js';
import { encrypt, decrypt } from '../../utils/cryptoHelper.js';
import { logSecurityEvent } from '../../utils/logger.js';

/**
 * @desc    Initialize MFA / Request MFA secret & setup URL
 * @route   POST /api/v1/auth/mfa/enable
 * @access  Private (Auth required)
 */
export const enableMfa = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (user.isMfaEnabled) {
      return next(new ErrorResponse('MFA is already enabled for this account.', 400));
    }

    // Generate secret
    const rawSecret = generateMfaSecret();

    // Encrypt secret for database storage
    const encryptedSecret = encrypt(rawSecret);

    // Temporarily save encrypted secret, keeping isMfaEnabled as false
    user.mfaSecret = encryptedSecret;
    await user.save();

    const otpauthUrl = getOtpauthUrl(user.email, rawSecret);

    logSecurityEvent('MFA_ENABLE_REQUEST', { userId: user._id });

    return sendSuccess(
      res,
      {
        secret: rawSecret,
        otpauthUrl
      },
      'MFA initialization successful. Please scan the QR code or enter the code manually, then confirm verification.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Confirm MFA setup using a code
 * @route   POST /api/v1/auth/mfa/confirm
 * @access  Private (Auth required)
 */
export const confirmMfa = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return next(new ErrorResponse('MFA verification code is required', 400));
    }

    const user = await User.findById(req.user.id).select('+mfaSecret');
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (!user.mfaSecret) {
      return next(new ErrorResponse('MFA has not been initialized. Please call enable first.', 400));
    }

    // Decrypt standard secret key
    const decryptedSecret = decrypt(user.mfaSecret);

    // Verify TOTP code
    const isValid = verifyTotp(decryptedSecret, code);
    if (!isValid) {
      logSecurityEvent('MFA_CONFIRM_FAILED', { userId: user._id, ip: req.ip });
      return next(new ErrorResponse('Invalid authentication code. Verification failed.', 400));
    }

    // Enable MFA status
    user.isMfaEnabled = true;
    await user.save();

    logSecurityEvent('MFA_CONFIRM_SUCCESS', { userId: user._id });

    return sendSuccess(res, {}, 'Multi-Factor Authentication enabled successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Disable MFA
 * @route   POST /api/v1/auth/mfa/disable
 * @access  Private (Auth required)
 */
export const disableMfa = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return next(new ErrorResponse('Password confirmation is required to disable MFA', 400));
    }

    const user = await User.findById(req.user.id).select('+password +mfaSecret');
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (!user.isMfaEnabled) {
      return next(new ErrorResponse('MFA is not enabled for this account.', 400));
    }

    // Confirm password before disabling MFA (defense in depth)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logSecurityEvent('MFA_DISABLE_FAILED_PASSWORD', { userId: user._id, ip: req.ip });
      return next(new ErrorResponse('Invalid password. MFA could not be disabled.', 401));
    }

    // Disable and clear secrets
    user.isMfaEnabled = false;
    user.mfaSecret = undefined;
    await user.save();

    logSecurityEvent('MFA_DISABLE_SUCCESS', { userId: user._id });

    return sendSuccess(res, {}, 'Multi-Factor Authentication disabled successfully.');
  } catch (error) {
    next(error);
  }
};
