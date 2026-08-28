import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Mail, Phone, Shield, UserCheck, AlertOctagon, CheckCircle, RefreshCw } from 'lucide-react';

export default function Profile() {
  const { user, updateProfile, uploadAvatar, verifyEmailAddress, resendEmailVerification } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  // Inline Email Verification states
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleOtpChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const newValues = [...otpValues];
    newValues[index] = val;
    setOtpValues(newValues);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
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

  const handleOtpPaste = (e) => {
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

  const handleSendVerificationCode = async () => {
    if (resendCooldown > 0 || sendingCode) return;
    setSendingCode(true);
    try {
      const result = await resendEmailVerification(user.email);
      if (result.success) {
        toast.success(result.message || 'Verification code sent successfully!');
        setResendCooldown(60);
        setShowOtpInput(true);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        toast.error(result.message || 'Could not send verification code.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send verification code.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otp = otpValues.join('');
    if (otp.length !== 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }
    setVerifyingOtp(true);
    try {
      const result = await verifyEmailAddress({ email: user.email, otp });
      if (result.success) {
        toast.success('Email verified successfully!');
        setShowOtpInput(false);
        setOtpValues(['', '', '', '', '', '']);
      } else {
        toast.error(result.message || 'Verification failed.');
      }
    } catch (err) {
      toast.error(err.message || 'Verification failed. Please check the code.');
      setOtpValues(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleVerifyNowClick = () => {
    const emailField = document.getElementById('email-field-container');
    if (emailField) {
      emailField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    handleSendVerificationCode();
  };
  
  // Profile update form states
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  if (!user) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name || !phone) {
      setError('Please fill in all profile fields');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updateProfile({ name, phone });
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarLoading(true);
    setError('');
    setSuccess('');

    try {
      await uploadAvatar(file);
      setSuccess('Avatar image uploaded successfully!');
    } catch (err) {
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="container fade-in" style={{ padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2.5rem', fontFamily: 'Outfit', fontWeight: '800' }}>My Account Profile</h1>

      <div className="responsive-grid-profile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Profile Card & Avatar */}
        <div className="glass-card-no-hover" style={{ textAlign: 'center', height: 'fit-content' }}>
          <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem auto' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--primary)', background: '#000', boxShadow: 'var(--shadow-md)' }}>
              {user.avatar ? (
                <img 
                  src={user.avatar.startsWith('/') ? `http://localhost:5000${user.avatar}` : `http://localhost:5000/${user.avatar}`} 
                  alt="Avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card-hover)' }}>
                  <User size={60} color="var(--text-secondary)" />
                </div>
              )}
            </div>
            
            {/* Overlay file selector */}
            <label 
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: 'var(--primary)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                fontSize: '1.2rem',
                color: 'white',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              📷
              <input type="file" onChange={handleAvatarChange} style={{ display: 'none' }} accept="image/*" />
            </label>
          </div>

          <h3 style={{ fontSize: '1.4rem', fontFamily: 'Outfit', fontWeight: '700' }}>{user.name}</h3>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
            <span className="badge badge-success" style={{ display: 'inline-flex', gap: '4px' }}>
              <UserCheck size={12} /> {user.role}
            </span>
            {user.status === 'blocked' ? (
              <span className="badge badge-danger" style={{ display: 'inline-flex', gap: '4px' }}>
                <AlertOctagon size={12} /> BLOCKED
              </span>
            ) : (
              <span className="badge badge-success">ACTIVE</span>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', marginTop: '2rem', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Mail size={16} style={{ flexShrink: 0 }} /> 
                <span style={{ wordBreak: 'break-all' }}>{user.email}</span>
              </div>
              <div style={{ marginLeft: '24px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {user.isVerified ? (
                  <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', display: 'inline-flex', gap: '4px', textTransform: 'capitalize', fontWeight: '600' }}>
                    <CheckCircle size={10} /> Verified
                  </span>
                ) : (
                  <>
                    <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', display: 'inline-flex', gap: '4px', textTransform: 'capitalize', fontWeight: '600' }}>
                      <AlertOctagon size={10} /> Unverified
                    </span>
                    <button 
                      onClick={handleVerifyNowClick} 
                      disabled={sendingCode}
                      className="btn-link"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: 0,
                        textDecoration: 'underline',
                        fontWeight: '600',
                        transition: 'var(--transition)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary)'}
                    >
                      {sendingCode ? 'Sending...' : 'Verify Now'}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Phone size={16} /> {user.phone}</div>
          </div>
        </div>

        {/* Update Profile Form */}
        <div className="glass-card-no-hover">
          <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', fontFamily: 'Outfit', fontWeight: '700' }}>Update Personal Details</h3>

          {error && <div className="badge badge-danger" style={{ display: 'block', padding: '0.75rem', marginBottom: '1rem', textTransform: 'none', textAlign: 'center' }}>{error}</div>}
          {success && <div className="badge badge-success" style={{ display: 'block', padding: '0.75rem', marginBottom: '1rem', textTransform: 'none', textAlign: 'center' }}>{success}</div>}

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input 
                type="tel" 
                className="form-input" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group" id="email-field-container">
              <label className="form-label">Email Address (Read-only)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input 
                  type="email" 
                  className="form-input" 
                  value={user.email} 
                  disabled 
                  style={{ opacity: 0.8, cursor: 'not-allowed' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {user.isVerified ? (
                    <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', display: 'inline-flex', gap: '4px', textTransform: 'capitalize', fontWeight: '600' }}>
                      <CheckCircle size={10} /> Verified Email
                    </span>
                  ) : (
                    <>
                      <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', display: 'inline-flex', gap: '4px', textTransform: 'capitalize', fontWeight: '600' }}>
                        <AlertOctagon size={10} /> Unverified Email
                      </span>
                      {!showOtpInput ? (
                        <button 
                          type="button"
                          onClick={handleSendVerificationCode} 
                          disabled={sendingCode}
                          className="btn-link"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            padding: 0,
                            textDecoration: 'underline',
                            fontWeight: '600',
                            transition: 'var(--transition)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary)'}
                        >
                          {sendingCode ? 'Sending...' : 'Verify Now'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShowOtpInput(false);
                            setOtpValues(['', '', '', '', '', '']);
                          }}
                          className="btn-link"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            padding: 0,
                            textDecoration: 'underline',
                            fontWeight: '600',
                            transition: 'var(--transition)'
                          }}
                        >
                          Cancel Verification
                        </button>
                      )}
                    </>
                  )}
                </div>
                {showOtpInput && !user.isVerified && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1.25rem',
                    background: 'var(--bg-card-hover)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    animation: 'fadeIn 0.3s ease'
                  }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={14} color="var(--primary)" />
                      Enter 6-Digit Verification Code
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                      A verification code was sent to {user.email}. Enter it below:
                    </p>

                    <div className="profile-otp-container">
                      {otpValues.map((value, idx) => (
                        <input
                          key={idx}
                          type="text"
                          pattern="\d*"
                          maxLength={1}
                          value={value}
                          ref={(el) => (inputRefs.current[idx] = el)}
                          onChange={(e) => handleOtpChange(e, idx)}
                          onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                          onPaste={handleOtpPaste}
                          disabled={verifyingOtp}
                          className="otp-digit-input"
                          onFocus={(e) => e.target.select()}
                          aria-label={`Digit ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp || !otpValues.every(val => val !== '')}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1 }}
                      >
                        {verifyingOtp ? 'Verifying...' : 'Verify Code'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleSendVerificationCode}
                        disabled={resendCooldown > 0 || sendingCode}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                      >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
              {loading ? 'Saving details...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Security Settings & MFA Card */}
        <div className="glass-card-no-hover" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', fontFamily: 'Outfit', fontWeight: '700' }}>Security Settings</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={18} style={{ color: 'var(--primary)' }} />
                Two-Factor Authentication (2FA)
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
                {user.isMfaEnabled 
                  ? 'Active. Your account is protected with an authenticator app.' 
                  : 'Inactive. Turn on authenticator verification for additional security.'
                }
              </p>
            </div>
            <button 
              onClick={() => navigate('/mfa-setup')} 
              className={`btn ${user.isMfaEnabled ? 'btn-secondary' : 'btn-primary'}`}
            >
              {user.isMfaEnabled ? 'Manage 2FA Settings' : 'Enable 2FA'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
