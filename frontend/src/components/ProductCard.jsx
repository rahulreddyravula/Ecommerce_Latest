import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const { addToCart, toggleWishlist, wishlist } = useCart();
  const toast = useToast();

  const isWishlisted = wishlist?.products?.some(
    (item) => (item._id || item) === product._id
  );

  const activePrice = product.discountPrice && product.discountPrice < product.price
    ? product.discountPrice
    : product.price;

  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const imageUrl = product.images && product.images.length > 0
    ? (product.images[0].startsWith('http') ? product.images[0] : `http://localhost:5000/${product.images[0]}`)
    : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80';

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!user) {
      toast.warn('Please log in to add items to your cart.');
      return;
    }
    addToCart(product._id, 1)
      .then(() => toast.success(`${product.title} added to cart.`))
      .catch((err) => toast.error(err.message));
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    if (!user) {
      toast.warn('Please log in to manage your wishlist.');
      return;
    }
    toggleWishlist(product._id);
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Discount Badge */}
      {hasDiscount && (
        <span style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          background: 'var(--danger)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          zIndex: 2
        }}>-{discountPercent}%</span>
      )}

      {/* Wishlist Button */}
      <button 
        onClick={handleToggleWishlist}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'hsla(var(--hue), 20%, 6%, 0.6)',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 2,
          transition: 'var(--transition)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Heart 
          size={18} 
          style={{ 
            fill: isWishlisted ? 'var(--danger)' : 'none', 
            color: isWishlisted ? 'var(--danger)' : 'var(--text-primary)' 
          }} 
        />
      </button>

      {/* Product Image Link */}
      <Link to={`/products/${product.slug}`} style={{ display: 'block', overflow: 'hidden', borderRadius: 'var(--radius-md)', height: '200px', background: '#000', marginBottom: '1rem' }}>
        <img 
          src={imageUrl} 
          alt={product.title} 
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'var(--transition)' }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        />
      </Link>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{product.brand}</span>
        <h4 className="product-card-title">
          <Link to={`/products/${product.slug}`}>{product.title}</Link>
        </h4>

        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '0.5rem 0 1rem 0' }}>
          <Star size={14} style={{ fill: 'var(--warning)', color: 'var(--warning)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{product.ratings || '5.0'}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>({product.reviews?.length || 0})</span>
        </div>

        {/* Price & Action */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {hasDiscount ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>${product.price}</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>${product.discountPrice}</span>
              </div>
            ) : (
              <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>${product.price}</span>
            )}
          </div>

          {product.stock > 0 ? (
            <button onClick={handleAddToCart} className="btn btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)' }}>
              <ShoppingCart size={16} /> Add
            </button>
          ) : (
            <span className="badge badge-danger">Out of Stock</span>
          )}
        </div>
      </div>
    </div>
  );
}
