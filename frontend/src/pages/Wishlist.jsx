import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Heart } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function Wishlist() {
  const { wishlist } = useCart();
  const wishlistItems = wishlist?.products || [];

  if (wishlistItems.length === 0) {
    return (
      <div className="container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div className="glass-card fade-in" style={{ padding: '4rem 2rem', maxWidth: '500px', margin: '0 auto' }}>
          <Heart size={64} color="var(--danger)" style={{ marginBottom: '1.5rem', fill: 'var(--danger-glow)' }} />
          <h3>Your Wishlist is Empty</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '2rem' }}>
            Tap the heart icon on any product to save it here.
          </p>
          <Link to="/products" className="btn btn-primary">Discover Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container fade-in" style={{ padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Saved Items</h1>
      
      <div className="grid grid-cols-4">
        {wishlistItems.map((prod) => (
          <ProductCard key={prod._id} product={prod} />
        ))}
      </div>
    </div>
  );
}
