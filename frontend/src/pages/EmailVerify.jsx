import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Mail, CheckCircle, XCircle, ArrowRight, RefreshCw, KeyRound } from 'lucide-react';

export default function EmailVerify() {
  const { verifyEmailAddress, resendEmailVerification } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Search parameters for link verification
  const id = searchParams.get('id');
  const token = searchParams.get('token');

  // Page mode: 'link' if params are present, else 'otp'
  const [mode, setMode] = useState(id && token ? 'link' : 'otp');
  
  // Link verification states
  const [linkVerifying, setLinkVerifying] = useState(mode === 'link');
  const [linkStatus, setLinkStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [linkErrorMsg, setLinkErrorMsg] = useState('');

  // OTP form states
  const [email, setEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef([]);

  // Auto-run verification on mount if in 'link' mode
  useEffect(() => {
    if (mode === 'link') {
      const verifyLink = async () => {
        try {
          const result = await verifyEmailAddress({ userId: id, token });
          if (result.success) {
            setLinkStatus('success');
            toast.success('Email verified successfully!');
          } else {
            setLinkStatus('error');
            setLinkErrorMsg(result.message || 'Verification link is invalid or expired.');
            toast.error(result.message || 'Verification failed.');
          }
        } catch (err) {
          setLinkStatus('error');
          setLinkErrorMsg(err.message || 'Network error occurred. Please try again.');
          toast.error(err.message || 'Verification failed.');
        } finally {
          setLinkVerifying(false);
        }
      };
      verifyLink();
    }
  }, [mode, id, token]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const otpComplete = otpValues.every(val => val !== '') && email;

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const newValues = [...otpValues];
    newValues[index] = val;
    setOtpValues(newValues);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        const newValues = [...otpValues];
        newValues[index - 1] = '';
        setOtpValues(newValues);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newValues = [...otpValues];
        newValues[index] = '';
        setOtpValues(newValues);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedText) {
      const newValues = [...otpValues];
      for (let i = 0; i < 6; i++) {
        newValues[i] = pastedText[i] || '';
      }
      setOtpValues(newValues);
      const nextFocus = Math.min(pastedText.length, 5);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otp = otpValues.join('');
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    if (otp.length !== 6) {
      toast.error('Please enter the full 6-digit verification code');
      return;
    }

    setOtpVerifying(true);
    try {
      const result = await verifyEmailAddress({ email, otp });
      if (result.success) {
        toast.success('Email verified successfully!');
        navigate('/login');
      } else {
        toast.error(result.message || 'OTP verification failed.');
      }
    } catch (err) {
      toast.error(err.message || 'Verification failed. Please check code.');
      // Clear OTP digits on failed attempt
      setOtpValues(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Please enter your email address first to resend code');
      return;
    }
    if (cooldown > 0 || resending) return;

    setResending(true);
    try {
      const result = await resendEmailVerification(email);
      if (result.success) {
        toast.success('A new verification code has been sent!');
        setCooldown(60); // 60 seconds cooldown for email
        setOtpValues(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      } else {
        toast.error(result.message || 'Could not resend code.');
      }
    } catch (err) {
      toast.error(err.message || 'Resend request failed.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '2rem 1.5rem' }}>
      <div className="glass-card-no-hover fade-in" style={{ width: '100%', maxWidth: '480px' }}>
        
        {/* Link Verification Layout */}
        {mode === 'link' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            {linkVerifying && (
              <div>
                <RefreshCw className="spin" size={48} style={{ color: 'var(--primary)', marginBottom: '1.5rem' }} />
                <h3 style={{ marginBottom: '0.5rem' }}>Verifying Email Address</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Please wait while we verify your cryptographic signature...</p>
              </div>
            )}

            {!linkVerifying && linkStatus === 'success' && (
              <div>
                <CheckCircle size={56} style={{ color: 'var(--success)', marginBottom: '1.5rem' }} />
                <h3 style={{ marginBottom: '0.5rem' }}>Verification Complete!</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                  Thank you! Your email address has been securely verified.
                </p>
                <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
                  Go to Login <ArrowRight size={16} />
                </Link>
              </div>
            )}

            {!linkVerifying && linkStatus === 'error' && (
              <div>
                <XCircle size={56} style={{ color: 'var(--danger)', marginBottom: '1.5rem' }} />
                <h3 style={{ marginBottom: '0.5rem' }}>Verification Failed</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  {linkErrorMsg}
                </p>
                <button 
                  onClick={() => setMode('otp')} 
                  className="btn btn-secondary" 
                  style={{ width: '100%', marginBottom: '1rem' }}
                >
                  Verify using Email OTP code
                </button>
                <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem' }}>
                  Back to Login
                </Link>
              </div>
            )}
          </div>
        )}

        {/* OTP Input Form Layout */}
        {mode === 'otp' && (
          <form onSubmit={handleOtpSubmit}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-flex',
                padding: '1rem',
                background: 'var(--primary-glow)',
                borderRadius: '50%',
                color: 'var(--primary)',
                marginBottom: '1rem'
              }}>
                <Mail size={28} />
              </div>
              <h2 style={{ marginBottom: '0.5rem', fontFamily: 'Outfit', fontWeight: '800' }}>
                Verify Your Email
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Enter your email address and the 6-digit code sent to you.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email-input">Email Address</label>
              <input
                id="email-input"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={otpVerifying}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">6-Digit Code</label>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                {otpValues.map((value, idx) => (
                  <input
                    key={idx}
                    type="text"
                    pattern="\d*"
                    maxLength={1}
                    value={value}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    onChange={(e) => handleChange(e, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    onPaste={handlePaste}
                    disabled={otpVerifying}
                    className="otp-digit-input"
                    onFocus={(e) => e.target.select()}
                    aria-label={`Digit ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1.5rem' }} 
              disabled={!otpComplete || otpVerifying}
            >
              {otpVerifying ? 'Verifying Code...' : 'Verify Email'}
            </button>

            {/* Resend Cooldown controls */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: cooldown > 0 ? 'var(--text-muted)' : 'var(--primary)',
                    cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    textDecoration: cooldown > 0 ? 'none' : 'underline',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  {resending ? (
                    <>
                      <RefreshCw size={12} className="spin" />
                      Resending...
                    </>
                  ) : cooldown > 0 ? (
                    `Resend in ${cooldown}s`
                  ) : (
                    <>
                      <RefreshCw size={12} />
                      Resend Code
                    </>
                  )}
                </button>
              </p>
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <Link to="/login" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
