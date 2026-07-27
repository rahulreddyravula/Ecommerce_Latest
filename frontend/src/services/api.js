const BASE_URL = 'http://localhost:5000/api/v1';

// Retrieve or generate a persistent device fingerprint
const getDeviceFingerprint = () => {
  let fingerprint = localStorage.getItem('device_fingerprint');
  if (!fingerprint) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      fingerprint = window.crypto.randomUUID();
    } else {
      fingerprint = Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    localStorage.setItem('device_fingerprint', fingerprint);
  }
  return fingerprint;
};

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    'X-Device-Fingerprint': getDeviceFingerprint()
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Queue for resolving retries during refresh token rotation
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  refreshQueue = [];
};

export const apiCall = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  
  // Set default headers
  const headers = getHeaders();
  if (options.body && options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const mergedOptions = {
    credentials: 'include', // Mandated for HttpOnly cookies (refresh token)
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, mergedOptions);
    
    // Check if unauthorized and try token refresh, but NOT for auth endpoints
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh-token') && !endpoint.includes('/auth/verify-mfa')) {
      if (isRefreshing) {
        // Enqueue request while token is refreshing
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (newToken) => {
              mergedOptions.headers['Authorization'] = `Bearer ${newToken}`;
              resolve(apiCall(endpoint, options));
            },
            reject: (err) => reject(err)
          });
        });
      }

      isRefreshing = true;

      try {
        // Request token refresh
        const refreshResponse = await fetch(`${BASE_URL}/auth/refresh-token`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Fingerprint': getDeviceFingerprint()
          }
        });
        
        const refreshResult = await refreshResponse.json();

        if (refreshResponse.ok && refreshResult.success && refreshResult.data.accessToken) {
          const newToken = refreshResult.data.accessToken;
          localStorage.setItem('token', newToken);
          isRefreshing = false;
          processQueue(null, newToken);
          
          // Retry the original request with new token
          mergedOptions.headers['Authorization'] = `Bearer ${newToken}`;
          return apiCall(endpoint, options);
        } else {
          throw new Error('Refresh failed');
        }
      } catch (refreshErr) {
        isRefreshing = false;
        processQueue(refreshErr, null);
        // Clear tokens and redirect/reject
        localStorage.removeItem('token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth_session_expired'));
        }
        throw new Error('Your session has expired. Please log in again.');
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    throw error;
  }
};
