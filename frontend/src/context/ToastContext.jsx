import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type, duration };
    
    setToasts((prevToasts) => [...prevToasts, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast]);
  const error = useCallback((msg, dur) => addToast(msg, 'error', dur), [addToast]);
  const info = useCallback((msg, dur) => addToast(msg, 'info', dur), [addToast]);
  const warn = useCallback((msg, dur) => addToast(msg, 'warning', dur), [addToast]);

  const toast = useMemo(() => ({
    success,
    error,
    info,
    warn,
    add: addToast,
    remove: removeToast
  }), [success, error, info, warn, addToast, removeToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Internal Toast Container component
const ToastContainer = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
};

// Internal Toast Item component
const ToastItem = ({ toast, onClose }) => {
  const { message, type } = toast;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="toast-icon success" />;
      case 'error':
        return <AlertCircle size={20} className="toast-icon error" />;
      case 'warning':
        return <AlertTriangle size={20} className="toast-icon warning" />;
      case 'info':
      default:
        return <Info size={20} className="toast-icon info" />;
    }
  };

  return (
    <div className={`toast-item ${type}`}>
      <div className="toast-content-wrapper">
        {getIcon()}
        <span className="toast-message">{message}</span>
      </div>
      <button onClick={onClose} className="toast-close-btn" aria-label="Close notification">
        <X size={16} />
      </button>
    </div>
  );
};
