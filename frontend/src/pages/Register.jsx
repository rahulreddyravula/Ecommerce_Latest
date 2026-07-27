import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Bot Protection Token
  const [botToken, setBotToken] = useState('');

  // Dynamically load Cloudflare Turnstile bot verification
  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    
    if (!siteKey) {
      setBotToken('simulated-dev-bot-token');
      return;
    }

    window.onloadTurnstileCallback = () => {
      if (window.turnstile) {
        window.turnstile.render('#turnstile-register-container', {
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
      if (window.turnstile) {
        window.onloadTurnstileCallback();
      }
    }

    return () => {
      const turnstileIframe = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
      if (turnstileIframe && turnstileIframe.parentNode) {
        turnstileIframe.parentNode.removeChild(turnstileIframe);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !phone) {
      setError('All fields are required');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const result = await register(name, email, password, phone, botToken);
      if (result.success) {
        toast.success(result.message || 'Account created successfully! Check your email to verify.');
        // Redirect to email OTP verification page
        navigate('/verify-email');
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
      if (window.turnstile && document.getElementById('turnstile-register-container')) {
        window.turnstile.reset('#turnstile-register-container');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '85vh', padding: '2rem 1.5rem' }}>
      <div className="glass-card-no-hover fade-in" style={{ width: '100%', maxWidth: '450px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.75rem', fontFamily: 'Outfit', fontWeight: '800', letterSpacing: '-0.5px' }}>
          Create Account
        </h2>

        {error && (
          <div className="badge badge-danger" style={{ display: 'block', width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', textTransform: 'none', textAlign: 'center' }} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">Full Name</label>
            <input
              id="register-name"
              type="text"
              className="form-input"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">Email Address</label>
            <input
              id="register-email"
              type="email"
              className="form-input"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-phone">Phone Number</label>
            <input
              id="register-phone"
              type="tel"
              className="form-input"
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="At least 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
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
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
              Must contain 12+ chars, an uppercase/lowercase letter, a digit, and a special character.
            </small>
          </div>

          {/* Turnstile Container */}
          {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
            <div 
              id="turnstile-register-container" 
              style={{ display: 'flex', justifyContent: 'center', margin: '1.25rem 0' }} 
            />
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} disabled={loading || !botToken}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Log In</Link>
        </p>
      </div>
    </div>
  );
}
