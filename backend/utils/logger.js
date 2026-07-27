import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logDirectory = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDirectory)) {
  try {
    fs.mkdirSync(logDirectory, { recursive: true });
  } catch (err) {
    console.error('Failed to create logs directory:', err.message);
  }
}

const auditLogFile = path.join(logDirectory, 'security_audit.log');

/**
 * Logs a security event to console and to a security audit log file.
 * Automatically ensures no secrets are logged.
 * @param {string} eventType - Category of the security event (e.g. 'AUTH_SUCCESS', 'MFA_FAIL')
 * @param {object} details - Event details (IP, user ID, device details)
 */
export const logSecurityEvent = (eventType, details = {}) => {
  const timestamp = new Date().toISOString();
  
  // Create a safe copy of details, removing sensitive fields if present
  const safeDetails = { ...details };
  const sensitiveFields = ['password', 'otp', 'token', 'secret', 'mfaSecret', 'emailOtp', 'verificationToken'];
  
  sensitiveFields.forEach(field => {
    if (field in safeDetails) {
      safeDetails[field] = '[REDACTED]';
    }
  });

  const logLine = `[${timestamp}] [${eventType}] ${JSON.stringify(safeDetails)}\n`;
  
  // Log to console for real-time monitoring
  console.log(`\x1b[33m[Security Audit - ${eventType}]\x1b[0m`, safeDetails);

  try {
    fs.appendFileSync(auditLogFile, logLine);
  } catch (err) {
    console.error('Failed to write to security audit log file:', err.message);
  }
};
