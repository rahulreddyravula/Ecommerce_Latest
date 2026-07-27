import crypto from 'crypto';

// Derive a 256-bit encryption key from JWT_SECRET or fallback
const getEncryptionKey = () => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key_for_local_encryption_32_bytes_long';
  return crypto.createHash('sha256').update(secret).digest();
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM

/**
 * Encrypts a plain-text string using AES-256-GCM.
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted string in format hexIv:hexAuthTag:hexEncrypted
 */
export const encrypt = (text) => {
  if (!text) return text;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');
  
  return `${ivHex}:${authTag}:${encrypted}`;
};

/**
 * Decrypts a hex-formatted encrypted string back to plaintext.
 * @param {string} encryptedText - Formatted string (hexIv:hexAuthTag:hexEncrypted)
 * @returns {string} Decrypted plaintext
 */
export const decrypt = (encryptedText) => {
  if (!encryptedText) return encryptedText;
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    throw new Error('Security decryption failed');
  }
};
