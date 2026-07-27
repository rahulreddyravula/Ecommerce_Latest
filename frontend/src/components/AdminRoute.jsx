import React, { useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldAlert } from 'lucide-react';

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!loading && user && user.role !== 'Admin') {
      toast.error('Access denied. Administrator privileges required.');
    }
  }, [user, loading, toast]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-secondary)' }}>
        Verifying administrator privileges...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'Admin') {
    return (
      <div className="container" style={{ padding: '8rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <ShieldAlert size={80} color="var(--danger)" />
        <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '450px' }}>
          This section is restricted to store administrators. If you believe this is an error, please log in with your administrator credentials.
        </p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Return to Storefront
        </Link>
      </div>
    );
  }

  return children;
}
