import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiCall } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  // Check if token exists and fetch user profile
  const fetchProfile = async (currentToken) => {
    try {
      setLoading(true);
      const data = await apiCall('/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      if (data.success) {
        setUser(data.data.user);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to load profile:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  // Listen for global auth session expiry events from api interceptor
  useEffect(() => {
    const handleExpired = () => {
      logout();
    };
    window.addEventListener('auth_session_expired', handleExpired);
    return () => window.removeEventListener('auth_session_expired', handleExpired);
  }, []);

  const login = async (email, password, botToken) => {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, botToken })
    });
    // Check if TOTP is required
    if (data.success && data.data && data.data.mfaRequired) {
      return data; // Caller handles MFA verification
    }
    if (data.success && data.data && data.data.accessToken) {
      localStorage.setItem('token', data.data.accessToken);
      setToken(data.data.accessToken);
      setUser(data.data.user);
    }
    return data;
  };

  const verifyMfaCode = async (mfaToken, code) => {
    const data = await apiCall('/auth/verify-mfa', {
      method: 'POST',
      body: JSON.stringify({ mfaToken, code })
    });
    if (data.success && data.data && data.data.accessToken) {
      localStorage.setItem('token', data.data.accessToken);
      setToken(data.data.accessToken);
      setUser(data.data.user);
    }
    return data;
  };

  const register = async (name, email, password, phone, botToken) => {
    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone, botToken })
    });
    // Registration succeeds but does not log in user (inactive until email verification)
    return data;
  };

  const verifyEmailAddress = async (payload) => {
    const data = await apiCall('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (data.success && token) {
      await fetchProfile(token); // refresh user state (isVerified will become true)
    }
    return data;
  };

  const resendEmailVerification = async (email) => {
    const data = await apiCall('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    return data;
  };

  const logout = async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout request failed or user already unauthenticated:', err.message);
    } finally {
      localStorage.removeItem('token');
      setToken('');
      setUser(null);
    }
  };

  const logoutAllDevices = async () => {
    try {
      await apiCall('/auth/logout-all', { method: 'POST' });
    } catch (err) {
      console.error('Logout all devices failed:', err.message);
    } finally {
      localStorage.removeItem('token');
      setToken('');
      setUser(null);
    }
  };

  const updateProfile = async (formData) => {
    const data = await apiCall('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(formData)
    });
    if (data.success) {
      setUser(data.data.user);
    }
    return data;
  };

  const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);

    const data = await apiCall('/auth/avatar', {
      method: 'POST',
      body: formData
    });
    if (data.success) {
      setUser((prev) => ({ ...prev, avatar: data.data.avatar }));
    }
    return data;
  };

  // OTP Mobile logins (phone authentication)
  const sendOtp = async (phone) => {
    const data = await apiCall('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
    return data;
  };

  const resendOtp = async (phone) => {
    const data = await apiCall('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
    return data;
  };

  const loginWithOtp = async (phone, otp) => {
    const data = await apiCall('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp })
    });
    if (data.success && data.data.accessToken) {
      localStorage.setItem('token', data.data.accessToken);
      setToken(data.data.accessToken);
      setUser(data.data.user);
    }
    return data;
  };

  // MFA User Settings (TOTP)
  const initializeMfa = async () => {
    const data = await apiCall('/auth/mfa/enable', {
      method: 'POST'
    });
    return data;
  };

  const confirmMfaSetup = async (code) => {
    const data = await apiCall('/auth/mfa/confirm', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    if (data.success && token) {
      await fetchProfile(token); // refresh user state (isMfaEnabled will become true)
    }
    return data;
  };

  const disableMfaSetup = async (password) => {
    const data = await apiCall('/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    if (data.success && token) {
      await fetchProfile(token); // refresh user state (isMfaEnabled will become false)
    }
    return data;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      verifyMfaCode, 
      register, 
      verifyEmailAddress, 
      resendEmailVerification, 
      logout, 
      logoutAllDevices, 
      updateProfile, 
      uploadAvatar, 
      sendOtp, 
      resendOtp, 
      loginWithOtp, 
      initializeMfa, 
      confirmMfaSetup, 
      disableMfaSetup 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
