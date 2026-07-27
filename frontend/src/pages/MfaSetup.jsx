import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldCheck, ShieldAlert, Copy, Check, Eye, EyeOff, Loader } from 'lucide-react';

export default function MfaSetup() {
  const { user, initializeMfa, confirmMfaSetup, disableMfaSetup } = useAuth();
  const toast = useToast();

  const [setupStep, setSetupStep] = useState('status'); // 'status', 'setup', 'disable_confirm'
  const [loading, setLoading] = useState(false);
  
  // Setup details
  const [secret, setSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Disable details
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const result = await initializeMfa();
      if (result.success) {
        setSecret(result.data.secret);
        // Standard, privacy-preserving QR code rendering service URL
        const encodedUrl = encodeURIComponent(result.data.otpauthUrl);
        setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}&ecc=M`);
        setSetupStep('setup');
      } else {
        toast.error(result.message || 'Failed to initialize MFA');
      }
    } catch (err) {
      toast.error(err.message || 'MFA setup error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success('Secret key copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmSetup = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const result = await confirmMfaSetup(code);
      if (result.success) {
        toast.success('MFA enabled successfully!');
        setSetupStep('status');
        setCode('');
      } else {
        toast.error(result.message || 'Verification failed');
      }
    } catch (err) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error('Password is required');
      return;
    }

    setLoading(true);
    try {
      const result = await disableMfaSetup(password);
      if (result.success) {
        toast.success('MFA disabled successfully');
        setSetupStep('status');
        setPassword('');
      } else {
        toast.error(result.message || 'Failed to disable MFA');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '2rem 1.5rem' }}>
      <div className="glass-card-no-hover fade-in" style={{ width: '100%', maxWidth: '500px' }}>
        
        {/* Step 1: MFA Status */}
        {setupStep === 'status' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            {user.isMfaEnabled ? (
              <>
                <div style={{
                  display: 'inline-flex',
                  padding: '1.25rem',
                  background: 'var(--success-glow)',
                  borderRadius: '50%',
                  color: 'var(--success)',
                  marginBottom: '1.5rem'
                }}>
                  <ShieldCheck size={48} />
                </div>
                <h2 style={{ marginBottom: '0.75rem', fontFamily: 'Outfit', fontWeight: '800' }}>
                  2FA is Active
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                  Your account is protected by an Authenticator App. You will be prompted to enter verification codes when you log in.
                </p>
                <button
                  onClick={() => setSetupStep('disable_confirm')}
                  className="btn btn-danger"
                  style={{ width: '100%' }}
                >
                  Disable 2-Factor Authentication
                </button>
              </>
            ) : (
              <>
                <div style={{
                  display: 'inline-flex',
                  padding: '1.25rem',
                  background: 'var(--primary-glow)',
                  borderRadius: '50%',
                  color: 'var(--primary)',
                  marginBottom: '1.5rem'
                }}>
                  <ShieldAlert size={48} />
                </div>
                <h2 style={{ marginBottom: '0.75rem', fontFamily: 'Outfit', fontWeight: '800' }}>
                  MFA is Disabled
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                  Add an extra layer of security. Protect your banking transactions by linking an authenticator app (Google Authenticator, Authy, Microsoft Authenticator).
                </p>
                <button
                  onClick={handleStartSetup}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
                >
                  {loading ? <Loader className="spin" size={18} /> : 'Setup Authenticator App'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 2: MFA Setup Process */}
        {setupStep === 'setup' && (
          <div>
            <h3 style={{ marginBottom: '0.5rem', textAlign: 'center', fontFamily: 'Outfit', fontWeight: '800' }}>
              Link Authenticator
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              Scan the QR code or enter the key manually into your app.
            </p>

            {/* QR Code Container */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', background: '#fff', padding: '1rem', borderRadius: 'var(--radius-md)', width: 'fit-content', margin: '0 auto 1.5rem' }}>
              {qrUrl ? (
                <img src={qrUrl} alt="Scan to link 2FA" style={{ display: 'block', maxWidth: '200px' }} />
              ) : (
                <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                  Loading QR Code...
                </div>
              )}
            </div>

            {/* Manual Secret Key */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Secret Key</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  value={secret}
                  readOnly
                  style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '1px', fontSize: '0.9rem', textAlign: 'center' }}
                />
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="btn btn-secondary"
                  style={{ padding: '0.75rem', minWidth: '44px' }}
                  aria-label="Copy key"
                >
                  {copied ? <Check size={18} style={{ color: 'var(--success)' }} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {/* Code Confirmation Form */}
            <form onSubmit={handleConfirmSetup}>
              <div className="form-group">
                <label className="form-label" htmlFor="mfa-code">Verification Code</label>
                <input
                  id="mfa-code"
                  type="text"
                  pattern="\d*"
                  maxLength={6}
                  className="form-input"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.5rem', fontWeight: 'bold' }}
                  required
                  disabled={loading}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button
                  type="button"
                  onClick={() => setSetupStep('status')}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={code.length !== 6 || loading}
                >
                  {loading ? 'Confirming...' : 'Verify & Enable'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Disable Confirmation */}
        {setupStep === 'disable_confirm' && (
          <form onSubmit={handleDisableMfa}>
            <h3 style={{ marginBottom: '0.75rem', textAlign: 'center', color: 'var(--danger)', fontFamily: 'Outfit', fontWeight: '800' }}>
              Disable 2-Factor Authentication?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              Warning: Disabling 2FA makes your account less secure. Please enter your account password to confirm.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="password-input">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{ width: '100%', paddingRight: '3rem' }}
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
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                type="button"
                onClick={() => setSetupStep('status')}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                style={{ flex: 1 }}
                disabled={!password || loading}
              >
                {loading ? 'Disabling...' : 'Confirm Disable'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
