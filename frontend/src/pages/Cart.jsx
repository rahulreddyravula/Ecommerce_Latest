import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { apiCall } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Cart() {
  const { cart, updateCartQty, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();
  const toast = useToast();

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const cartItems = cart?.products || [];
  const rawSubtotal = cart?.totalPrice || 0;

  const handleQtyChange = (productId, currentQty, increment) => {
    const newQty = currentQty + increment;
    if (newQty < 1) return;
    updateCartQty(productId, newQty)
      .catch((err) => toast.error(err.message));
  };

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError('');
    setCouponSuccess('');

    try {
      const res = await apiCall('/orders/apply-coupon', {
        method: 'POST',
        body: JSON.stringify({
          couponCode: couponCode.trim(),
          cartAmount: rawSubtotal
        })
      });
      if (res.success) {
        setCouponDiscount(res.data.discountAmount);
        setAppliedCode(res.data.code);
        setCouponSuccess(`Coupon ${res.data.code} applied! Saved $${res.data.discountAmount}.`);
        setCouponCode('');
      }
    } catch (err) {
      setCouponError(err.message || 'Failed to apply coupon');
      setCouponDiscount(0);
      setAppliedCode('');
    }
  };

  const handleCheckout = () => {
    // Navigate to checkout and pass coupon discount / code details in history state
    navigate('/checkout', {
      state: {
        couponCode: appliedCode,
        discountAmount: couponDiscount
      }
    });
  };

  if (cartItems.length === 0) {
    return (
      <div className="container" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div className="glass-card fade-in" style={{ padding: '4rem 2rem', maxWidth: '500px', margin: '0 auto' }}>
          <ShoppingBag size={64} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
          <h3>Your Shopping Cart is Empty</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '2rem' }}>
            Look around the catalog to find items you like.
          </p>
          <Link to="/products" className="btn btn-primary">Start Shopping</Link>
        </div>
      </div>
    );
  }

  const finalTotal = Math.max(0, rawSubtotal - couponDiscount);

  return (
    <div className="container fade-in" style={{ padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Shopping Cart</h1>
      
      <div className="responsive-grid-checkout">
        {/* Cart Item list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {cartItems.map((item) => {
            const prod = item.product || {};
            const productPrice = prod.discountPrice && prod.discountPrice < prod.price ? prod.discountPrice : prod.price;
            const imageUrl = prod.images && prod.images.length > 0
              ? (prod.images[0].startsWith('http') ? prod.images[0] : `http://localhost:5000/${prod.images[0]}`)
              : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500';

            return (
              <div key={prod._id} className="glass-card-no-hover cart-item-flex">
                <img 
                  src={imageUrl} 
                  alt={prod.title} 
                  style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                />
                
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{prod.brand}</span>
                  <h4 style={{ fontSize: '1.05rem', margin: '2px 0' }}>
                    <Link to={`/products/${prod.slug}`}>{prod.title}</Link>
                  </h4>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>
                    ${productPrice}
                  </div>
                </div>

                {/* Qty edit buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.2rem', width: 'fit-content', margin: '0 auto' }}>
                  <button onClick={() => handleQtyChange(prod._id, item.quantity, -1)} style={{ padding: '0.2rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                  <span style={{ padding: '0 0.75rem', fontSize: '0.9rem', fontWeight: 'bold' }}>{item.quantity}</span>
                  <button onClick={() => handleQtyChange(prod._id, item.quantity, 1)} style={{ padding: '0.2rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                </div>

                <div className="cart-total-price" style={{ fontSize: '1.1rem', fontWeight: '800', minWidth: '70px', textAlign: 'right' }}>
                  ${Math.round(productPrice * item.quantity * 100) / 100}
                </div>

                <button onClick={() => removeFromCart(prod._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.5rem' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <button onClick={clearCart} className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }}>Clear Cart</button>
            <Link to="/products" className="btn btn-secondary btn-sm">Continue Shopping</Link>
          </div>
        </div>

        {/* Cart summary card */}
        <div>
          <div className="glass-card-no-hover">
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Order Summary</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>${rawSubtotal}</span>
              </div>

              {couponDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Discount ({appliedCode})</span>
                  <span>-${couponDiscount}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Shipping</span>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>FREE</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                <span>Total</span>
                <span style={{ color: 'var(--primary)', fontWeight: '900' }}>${finalTotal}</span>
              </div>
            </div>

            {/* Coupon field */}
            <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1, padding: '0.4rem 0.75rem', textTransform: 'uppercase' }}
                placeholder="PROMO CODE"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>Apply</button>
            </form>
            {couponError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '-1rem', marginBottom: '1rem' }}>{couponError}</p>}
            {couponSuccess && <p style={{ color: 'var(--success)', fontSize: '0.8rem', marginTop: '-1rem', marginBottom: '1rem' }}>{couponSuccess}</p>}

            <button onClick={handleCheckout} className="btn btn-primary" style={{ width: '100%' }}>
              Proceed to Checkout <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
