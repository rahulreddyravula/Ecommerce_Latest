import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, User, LogOut, Layout, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { cart, wishlist } = useCart();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const cartCount = cart?.products?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const wishlistCount = wishlist?.products?.length || 0;

  const renderNavLinks = (isMobile) => (
    <>
      <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        Home
      </NavLink>
      <NavLink to="/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        Explore
      </NavLink>
      
      {user ? (
        <>
          <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            My Orders
          </NavLink>

          <Link to="/wishlist" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Heart size={20} className={wishlistCount > 0 ? 'text-primary' : ''} style={{ fill: wishlistCount > 0 ? 'var(--primary)' : 'none' }} />
            <span>Wishlist</span>
            {wishlistCount > 0 && <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>({wishlistCount})</span>}
          </Link>

          <Link to="/cart" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShoppingCart size={20} />
            <span>Cart</span>
            {cartCount > 0 && (
              <span style={{
                background: 'var(--primary)',
                color: 'white',
                borderRadius: '50%',
                padding: '2px 6px',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>{cartCount}</span>
            )}
          </Link>

          {user.role === 'Admin' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)' }}>
              <Layout size={18} />
              Admin
            </NavLink>
          )}

          <NavLink to="/profile" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user.avatar ? (
              <img src={user.avatar.startsWith('/') ? `http://localhost:5000${user.avatar}` : `http://localhost:5000/${user.avatar}`} alt="Avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)' }} />
            ) : (
              <User size={20} />
            )}
            <span style={{ fontSize: '0.9rem' }}>{user.name.split(' ')[0]}</span>
          </NavLink>

          <button onClick={handleLogout} className={isMobile ? "btn btn-secondary" : "btn btn-secondary btn-sm"} style={{ padding: '0.35rem 0.7rem' }}>
            <LogOut size={16} /> {isMobile && "Log Out"}
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className="nav-link">Login</Link>
          <Link to="/register" className={isMobile ? "btn btn-primary" : "btn btn-primary btn-sm"}>Sign Up</Link>
        </>
      )}
    </>
  );

  return (
    <>
      <header className="glass-header">
        <div className="container navbar" style={{ position: 'relative' }}>
          <Link to="/" className="logo" onClick={() => setIsMobileMenuOpen(false)}>
            ⚡ <span>VIBE CART</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="nav-links desktop-nav">
            {renderNavLinks(false)}
          </nav>

          {/* Hamburger Menu Toggle Button */}
          <button 
            className="hamburger-btn" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Links Drawer (rendered outside header to avoid contain context) */}
      <nav 
        className={`nav-links mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        {renderNavLinks(true)}
      </nav>
    </>
  );
}
