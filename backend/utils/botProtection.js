/**
 * Verifies the bot protection token (Cloudflare Turnstile or Google reCAPTCHA)
 * @param {string} token - The client response token
 * @param {string} ip - The client's IP address
 * @returns {Promise<boolean>} True if user is verified as human
 */
export const verifyBotToken = async (token, ip) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY;
  
  // Local development fallback if keys are not defined
  if (!secretKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Security Warn] Bot protection keys not configured in .env. Bypassing check in development.');
      return true;
    }
    console.error('[Security Critical] Bot protection keys must be configured in production!');
    return false; // Fail secure in production
  }

  if (!token) {
    return false;
  }

  try {
    const isRecaptcha = !!process.env.RECAPTCHA_SECRET_KEY;
    const verifyUrl = isRecaptcha 
      ? 'https://www.google.com/recaptcha/api/siteverify'
      : 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);
    if (ip) {
      params.append('remoteip', ip);
    }

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const result = await response.json();
    
    if (result.success) {
      return true;
    }
    
    console.warn(`[Security Audit] Bot verification failed. Error-codes: ${JSON.stringify(result['error-codes'] || [])}`);
    return false;
  } catch (error) {
    console.error('[Bot Verification Error] Request failed:', error.message);
    return false; // Fail secure on network/service failure
  }
};
