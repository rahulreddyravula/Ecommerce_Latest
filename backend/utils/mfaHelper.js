import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodes a Base32 string into a Buffer.
 * @param {string} base32Str - Base32 string
 * @returns {Buffer} Decoded bytes
 */
const base32Decode = (base32Str) => {
  const cleaned = base32Str.toUpperCase().replace(/[=\s]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  
  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error('Invalid base32 character in MFA secret');
    }
    
    value = (value << 5) | idx;
    bits += 5;
    
    if (bits >= 8) {
      bytes.push((value >> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  
  return Buffer.from(bytes);
};

/**
 * Generates a cryptographically secure random Base32 secret for MFA.
 * @returns {string} Base32 secret (32 characters, 160-bit key)
 */
export const generateMfaSecret = () => {
  const bytes = crypto.randomBytes(20); // 160 bits is the standard recommended length for TOTP
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += BASE32_ALPHABET[bytes[i] % 32];
  }
  return secret;
};

/**
 * Generates the standard otpauth URL for QR codes.
 * @param {string} email - User's email
 * @param {string} secret - Base32 secret
 * @returns {string} URL
 */
export const getOtpauthUrl = (email, secret) => {
  const issuer = encodeURIComponent('SecureStore');
  const label = encodeURIComponent(email);
  return `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
};

/**
 * Verifies a TOTP 6-digit verification code.
 * Implements dynamic truncation and window validation for clock drift.
 * @param {string} secret - Base32 encoded secret
 * @param {string} code - Submitted 6-digit code
 * @param {number} window - Lookback/lookahead window steps (default: 1 step of 30 seconds)
 * @returns {boolean} True if code is valid
 */
export const verifyTotp = (secret, code, window = 1) => {
  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    return false;
  }
  
  try {
    const key = base32Decode(secret);
    const timeStep = 30 * 1000; // 30-second intervals
    const currentTime = Date.now();
    
    for (let i = -window; i <= window; i++) {
      const counter = Math.floor((currentTime + i * timeStep) / timeStep);
      
      // Counter must be represented as an 8-byte big-endian buffer
      const buffer = Buffer.alloc(8);
      let temp = counter;
      for (let j = 7; j >= 0; j--) {
        buffer[j] = temp & 0xff;
        temp = temp >> 8;
      }
      
      // Calculate HMAC-SHA1 of the counter buffer using the decoded secret key
      const hmac = crypto.createHmac('sha1', key);
      hmac.update(buffer);
      const hmacResult = hmac.digest();
      
      // RFC 4226 dynamic truncation
      const offset = hmacResult[hmacResult.length - 1] & 0xf;
      const binary = 
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff);
        
      const otp = (binary % 1000000).toString().padStart(6, '0');
      
      if (otp === code) {
        return true;
      }
    }
  } catch (err) {
    console.error('TOTP verification error:', err.message);
  }
  
  return false;
};
