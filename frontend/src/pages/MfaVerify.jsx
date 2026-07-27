import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';

export default function MfaVerify() {
  const { verifyMfaCode } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve temporary MFA challenge token from router state
  const mfaToken = location.state?.mfaToken || '';

  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);

  const inputRefs = useRef([]);

  // Redirect if mfaToken session doesn't exist
  useEffect(() => {
    if (!mfaToken) {
      toast.error('No active MFA challenge session found. Please log in again.');
      navigate('/login');
    }
  }, [mfaToken]);

  // Focus the first input on load
  useEffect(() => {
    if (mfaToken) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [mfaToken]);

  const otpComplete = otpValues.every(val => val !== '');

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
      const nextFocusIndex = Math.min(pastedText.length, 5);
      inputRefs.current[nextFocusIndex]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const fullCode = otpValues.join('');
    if (fullCode.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      const result = await verifyMfaCode(mfaToken, fullCode);
      if (result.success) {
        toast.success('Successfully logged in!');
        navigate('/');
      } else {
        toast.error(result.message || 'MFA verification failed');
      }
    } catch (err) {
      toast.error(err.message || 'MFA verification failed. Please check code.');
      setOtpValues(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setVerifying(false);
    }
  };

  if (!mfaToken) return null;

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
            padding: 0
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
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ marginBottom: '0.5rem', fontFamily: 'Outfit', fontWeight: '800', letterSpacing: '-0.5px' }}>
            MFA Verification
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Please enter the 6-digit code from your <br />
            <strong style={{ color: 'var(--text-primary)' }}>Authenticator App</strong>
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
                  aria-label={`Authenticator Digit ${idx + 1}`}
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
            {verifying ? (
              <>
                <RefreshCw size={16} className="spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
