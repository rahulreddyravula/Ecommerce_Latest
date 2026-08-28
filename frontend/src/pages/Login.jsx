import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Phone, Mail } from 'lucide-react';

export default function Login() {
  const { login, sendOtp } = useAuth();
  const navigate = useNavigate();
  
  // Tabs and general state
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone form state
  const [phone, setPhone] = useState('');

  // Bot Protection Token
  const [botToken, setBotToken] = useState('');

  // Load Cloudflare Turnstile bot verification script
  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    
    if (!siteKey) {
      // In development fallback, provide a simulated token
      setBotToken('simulated-dev-bot-token');
      return;
    }

    // Register callback globally
    window.onloadTurnstileCallback = () => {
      if (window.turnstile) {
        window.turnstile.render('#turnstile-login-container', {
          sitekey: siteKey,
          callback: (token) => {
            setBotToken(token);
          },
          'expired-callback': () => {
            setBotToken('');
          },
          'error-callback': () => {
            setBotToken('');
            setError('Bot protection widget failed to load. Please reload.');
          }
        });
      }
    };

    const scriptId = 'cf-turnstile-script';
    let script = document.getElementById(scriptId);
    
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else {
      // Script already exists, trigger manually if turnstile loaded
      if (window.turnstile) {
        window.onloadTurnstileCallback();
      }
    }

    return () => {
      // Clean up script-injected elements safely when switching routes
      const turnstileIframe = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
      if (turnstileIframe && turnstileIframe.parentNode) {
        turnstileIframe.parentNode.removeChild(turnstileIframe);
      }
    };
  }, [loginMethod]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password, botToken);
      if (result.success && result.data && result.data.mfaRequired) {
        // Redirect to MFA challenge verification screen
        navigate('/mfa-verify', { 
          state: { mfaToken: result.data.mfaToken } 
        });
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      // Reset Turnstile widget on failed login
      if (window.turnstile && document.getElementById('turnstile-login-container')) {
        window.turnstile.reset('#turnstile-login-container');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!phone) {
      setError('Please enter your phone number');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await sendOtp(phone);
      if (data.success) {
        navigate('/otp-verify', {
          state: { phone }
        });
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '2rem 1.5rem' }}>
      <div className="glass-card-no-hover fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.75rem', fontFamily: 'Outfit', fontWeight: '800', letterSpacing: '-0.5px' }}>
          Welcome Back
        </h2>

        {/* Tab Controls */}
        <div className="tab-group" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={loginMethod === 'email'}
            className={`tab-btn ${loginMethod === 'email' ? 'active' : ''}`}
            onClick={() => {
              setLoginMethod('email');
              setError('');
              setSuccess('');
            }}
          >
            <Mail size={16} />
            Email
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={loginMethod === 'phone'}
            className={`tab-btn ${loginMethod === 'phone' ? 'active' : ''}`}
            onClick={() => {
              setLoginMethod('phone');
              setError('');
              setSuccess('');
            }}
          >
            <Phone size={16} />
            Phone OTP
          </button>
        </div>
        
        {/* Messages */}
        {error && (
          <div className="badge badge-danger" style={{ display: 'block', width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', textTransform: 'none', textAlign: 'center' }} role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="badge badge-success" style={{ display: 'block', width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', textTransform: 'none', textAlign: 'center' }} role="status">
            {success}
          </div>
        )}

        {/* Email Login Form */}
        {loginMethod === 'email' && (
          <form onSubmit={handleEmailSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{ paddingRight: '3rem', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Turnstile Container */}
            {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
              <div 
                id="turnstile-login-container" 
                style={{ display: 'flex', justifyContent: 'center', margin: '1.25rem 0' }} 
              />
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading || !botToken}>
              {loading ? 'Logging In...' : 'Log In'}
            </button>
          </form>
        )}

        {/* Phone Login Form */}
        {loginMethod === 'phone' && (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-phone">Phone Number</label>
              <input
                id="login-phone"
                type="tel"
                className="form-input"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={loading}
              />
              <small style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                Include country code (e.g. +1 or +91)
              </small>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
