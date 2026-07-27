import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '2rem 0',
      textAlign: 'center',
      color: 'var(--text-secondary)',
      fontSize: '0.9rem',
      background: 'hsla(var(--hue), 20%, 4%, 0.4)',
      marginTop: 'auto'
    }}>
      <div className="container">
        <p style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>⚡ VIBE CART E-COMMERCE</p>
        <p>© {new Date().getFullYear()} Vibe Cart Inc. Engineered for speed and beauty.</p>
      </div>
    </footer>
  );
}
