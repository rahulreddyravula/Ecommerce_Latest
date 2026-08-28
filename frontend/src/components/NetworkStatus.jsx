import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const NetworkStatus = () => {
  const toast = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isVisible, setIsVisible] = useState(!navigator.onLine);
  const [animationClass, setAnimationClass] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const animTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const clearTimeouts = () => {
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const triggerOnlineTransition = () => {
    clearTimeouts();
    setIsOnline(true);
    setAnimationClass('');
    setIsVisible(true);

    animTimeoutRef.current = setTimeout(() => {
      setAnimationClass('slide-out');
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 400); // Matches the slideOutUp CSS animation duration
    }, 3000);
  };

  const triggerOfflineTransition = () => {
    clearTimeouts();
    setIsOnline(false);
    setAnimationClass('');
    setIsVisible(true);
  };

  useEffect(() => {
    const handleOnline = () => {
      triggerOnlineTransition();
    };

    const handleOffline = () => {
      triggerOfflineTransition();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeouts();
    };
  }, []);

  // Function to manually check actual connectivity
  const checkRealConnectivity = async () => {
    // List of reliable public endpoints to test real internet connectivity
    const pingEndpoints = [
      'https://www.google.com/favicon.ico',
      'https://www.cloudflare.com/favicon.ico'
    ];

    for (const endpoint of pingEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout per endpoint

        // Use a cache-buster query parameter to bypass service worker/browser caches
        await fetch(`${endpoint}?t=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-store',
          mode: 'no-cors',
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return true; // Successfully reached one of the public endpoints
      } catch (err) {
        // Fall through to the next endpoint if one fails
      }
    }

    return false; // All endpoints failed
  };

  const handleRetryCheck = async () => {
    if (isChecking) return;
    setIsChecking(true);

    // Artificial delay of 600ms for a smoother UI check transition
    const [hasConnection] = await Promise.all([
      checkRealConnectivity(),
      new Promise((resolve) => setTimeout(resolve, 600))
    ]);

    setIsChecking(false);

    if (hasConnection) {
      triggerOnlineTransition();
    } else {
      toast.error('Still offline. Please check your internet connection.');
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`network-status-bar ${isOnline ? 'online' : 'offline'} ${animationClass}`}
    >
      <div className={`network-status-icon ${!isOnline ? 'pulse' : ''}`}>
        {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
      </div>
      <span>
        {isOnline
          ? 'Internet connection restored. You are online!'
          : 'No internet connection. You are offline.'}
      </span>
      {!isOnline && (
        <button
          onClick={handleRetryCheck}
          disabled={isChecking}
          className="network-status-retry-btn"
          aria-label="Retry connection check"
        >
          {isChecking ? (
            <>
              <RefreshCw size={12} className="network-status-spinner" />
              Checking...
            </>
          ) : (
            'Check Connection'
          )}
        </button>
      )}
    </div>
  );
};

export default NetworkStatus;
