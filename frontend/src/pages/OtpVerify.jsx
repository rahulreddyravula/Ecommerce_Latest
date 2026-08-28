import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { KeyRound, ArrowLeft, RefreshCw } from 'lucide-react';

export default function OtpVerify() {
  const { loginWithOtp, resendOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Get phone from redirect state
  const phone = location.state?.phone || '';

  // OTP inputs state
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  const inputRefs = useRef([]);

  // Redirect to login if phone is missing
  useEffect(() => {
    if (!phone) {
      toast.error('No phone number session found. Redirecting to login...');
      navigate('/login');
    }
  }, [phone]);

  // Focus the first input on load
  useEffect(() => {
    if (phone) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [phone]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const otpComplete = otpValues.every(val => val !== '');

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const newValues = [...otpValues];
    newValues[index] = val;
    setOtpValues(newValues);

    // Shift focus forward if entered a digit
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        // Clear previous input and move focus back
        const newValues = [...otpValues];
        newValues[index - 1] = '';
        setOtpValues(newValues);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Just clear current input
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
      
      // Focus the appropriate input
      const nextFocusIndex = Math.min(pastedText.length, 5);
      inputRefs.current[nextFocusIndex]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const fullOtp = otpValues.join('');
    if (fullOtp.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP code');
      return;
    }

    setVerifying(true);
    try {
      const result = await loginWithOtp(phone, fullOtp);
      if (result.success) {
        toast.success('Authenticated successfully!');
        if (result.data && result.data.user && !result.data.user.isVerified) {
          navigate('/verify-email');
        } else {
          navigate('/');
        }
      } else {
        toast.error(result.message || 'OTP verification failed');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to verify OTP. Please try again.');
      
      // On severe validation/attempt errors, clear inputs and focus the first box
      const errMsg = err.message || '';
      if (
        errMsg.includes('Too many failed') ||
        errMsg.includes('expired') ||
        errMsg.includes('active OTP request') ||
        errMsg.includes('limit')
      ) {
        setOtpValues(['', '', '', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 50);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    try {
      const result = await resendOtp(phone);
      if (result.success) {
        toast.success('A new OTP has been sent successfully!');
        setCooldown(30);
        setOtpValues(['', '', '', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 50);
      } else {
        toast.error(result.message || 'Could not resend OTP');
      }
    } catch (err) {
      toast.error(err.message || 'Resend request failed');
    } finally {
      setResending(false);
    }
  };

  if (!phone) return null;

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '2rem 1.5rem' }}>
      <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '460px', position: 'relative' }}>
        
        {/* Back Link */}
        <button 
          onClick={() => navigate('/login')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            padding: 0,
            transition: 'var(--transition)'
          }}
          className="back-btn-hover"
        >
          <ArrowLeft size={16} />
          Back to Login
        </button>

        {/* Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '1rem',
            background: 'var(--primary-glow)',
            borderRadius: '50%',
            color: 'var(--primary)',
            marginBottom: '1rem'
          }}>
            <KeyRound size={28} />
          </div>
          <h2 style={{ marginBottom: '0.5rem', fontFamily: 'Outfit', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Verify Code
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            We sent a 6-digit verification code to <br />
            <strong style={{ color: 'var(--text-primary)' }}>{phone}</strong>
          </p>
        </div>

        {/* OTP Input Form */}
        <form onSubmit={handleVerify}>
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
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
                  disabled={verifying}
                  className="otp-digit-input"
                  onFocus={(e) => e.target.select()}
                />
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} 
            disabled={!otpComplete || verifying}
          >
            {verifying ? 'Verifying OTP...' : 'Verify Code'}
          </button>
        </form>

        {/* Resend Cooldown & Controls */}
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
                gap: '0.3rem',
                transition: 'var(--transition)'
              }}
            >
              {resending ? (
                <>
                  <RefreshCw size={12} className="spin" />
                  Resending...
                </>
              ) : cooldown > 0 ? (
                `Resend OTP in ${cooldown}s`
              ) : (
                <>
                  <RefreshCw size={12} />
                  Resend OTP
                </>
              )}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

