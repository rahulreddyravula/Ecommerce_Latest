import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiCall } from '../services/api';
import { CreditCard, CheckCircle2, AlertCircle, ShieldAlert, Plus, Check } from 'lucide-react';

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, fetchCart } = useCart();
  const { user } = useAuth();
  const toast = useToast();

  // Coupon state passed from Cart.jsx
  const couponCode = location.state?.couponCode || '';
  const discountAmount = location.state?.discountAmount || 0;

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);

  // New Address form states
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [pincode, setPincode] = useState('');

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState('Razorpay'); // COD or Razorpay
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null); // stores order details on success

  // Mock Razorpay Modal state
  const [showMockRzpModal, setShowMockRzpModal] = useState(false);
  const [mockRzpData, setMockRzpData] = useState(null);

  const cartItems = cart?.products || [];
  const rawSubtotal = cart?.totalPrice || 0;
  const finalTotal = Math.max(0, rawSubtotal - discountAmount);

  // Load user addresses
  const loadAddresses = async () => {
    try {
      const res = await apiCall('/addresses');
      if (res.success) {
        setAddresses(res.data);
        if (res.data.length > 0) {
          setSelectedAddressId(res.data[0]._id);
        } else {
          setShowAddressForm(true);
        }
      }
    } catch (err) {
      console.error('Error fetching addresses:', err.message);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  // Dynamically load Razorpay SDK
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    if (!fullName || !mobile || !city || !state || !country || !pincode) {
      setError('Please fill in all address fields');
      return;
    }
    setError('');

    try {
      const res = await apiCall('/addresses', {
        method: 'POST',
        body: JSON.stringify({ fullName, mobile, city, state, country, pincode })
      });
      if (res.success) {
        setAddresses((prev) => [...prev, res.data]);
        setSelectedAddressId(res.data._id);
        setShowAddressForm(false);
        // Clear address fields
        setFullName('');
        setMobile('');
        setCity('');
        setState('');
        setPincode('');
        toast.success('Address added successfully!');
      }
    } catch (err) {
      setError(err.message || 'Failed to save address');
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!selectedAddressId) {
      setError('Please select or add a shipping address');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // 1. Create order in DB (sets paymentMethod: COD/Razorpay)
      const orderRes = await apiCall('/orders', {
        method: 'POST',
        body: JSON.stringify({
          shippingAddressId: selectedAddressId,
          paymentMethod,
          couponCode
        })
      });

      if (orderRes.success) {
        const createdOrder = orderRes.data;

        // 2. If Razorpay checkout, invoke SDK or Mock Popup
        if (paymentMethod === 'Razorpay') {
          try {
            const razorpayOrderRes = await apiCall('/payments/razorpay/order', {
              method: 'POST',
              body: JSON.stringify({
                orderId: createdOrder._id
              })
            });

            if (razorpayOrderRes.success) {
              const rzpData = razorpayOrderRes.data;

              if (rzpData.isMock) {
                // Launch Custom Sandbox Modal Dialog
                setMockRzpData({
                  orderId: createdOrder._id,
                  rzpOrderId: rzpData.rzpOrderId,
                  amount: rzpData.amount,
                  currency: rzpData.currency
                });
                setShowMockRzpModal(true);
              } else {
                // Load script and trigger standard Razorpay Checkout
                const scriptLoaded = await loadRazorpayScript();
                if (!scriptLoaded) {
                  setError('Failed to load Razorpay checkout script. You can pay later from history.');
                  setOrderSuccess(createdOrder);
                  setLoading(false);
                  return;
                }

                const options = {
                  key: rzpData.key,
                  amount: rzpData.amount,
                  currency: rzpData.currency,
                  name: 'Vibe Cart',
                  description: 'Secure Payment Checkout',
                  order_id: rzpData.rzpOrderId,
                  prefill: {
                    name: user?.name,
                    email: user?.email,
                    contact: user?.phone
                  },
                  theme: {
                    color: '#8A2BE2'
                  },
                  handler: async (response) => {
                    try {
                      setLoading(true);
                      const verifyRes = await apiCall('/payments/razorpay/verify', {
                        method: 'POST',
                        body: JSON.stringify({
                          orderId: createdOrder._id,
                          razorpayOrderId: response.razorpay_order_id,
                          razorpayPaymentId: response.razorpay_payment_id,
                          razorpaySignature: response.razorpay_signature,
                          isMock: false
                        })
                      });
                      if (verifyRes.success) {
                        setOrderSuccess(verifyRes.data);
                        toast.success('Payment completed successfully!');
                        fetchCart();
                      }
                    } catch (verifyErr) {
                      setError(`Payment verification failed: ${verifyErr.message}. Contact support.`);
                    } finally {
                      setLoading(false);
                    }
                  },
                  modal: {
                    ondismiss: () => {
                      setError('Payment window closed. You can retry paying from Order History.');
                      setOrderSuccess(createdOrder);
                    }
                  }
                };

                const rzp = new window.Razorpay(options);
                rzp.open();
              }
            }
          } catch (rzpErr) {
            setError(`Order created but payment session initiation failed: ${rzpErr.message}. You can pay later from history.`);
            setOrderSuccess(createdOrder);
          }
        } else {
          // Cash on Delivery
          setOrderSuccess(createdOrder);
          toast.success('Order placed successfully!');
          fetchCart();
        }
      }
    } catch (err) {
      setError(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMockPaymentVerify = async (success) => {
    setShowMockRzpModal(false);
    if (!success) {
      setError('Simulated Razorpay transaction canceled by user.');
      // Find the order that was generated to set success display in unpaid state
      try {
        const orderRes = await apiCall(`/orders/${mockRzpData.orderId}`);
        if (orderRes.success) {
          setOrderSuccess(orderRes.data);
        }
      } catch (err) {
        console.error(err.message);
      }
      return;
    }

    setLoading(true);
    try {
      const verifyRes = await apiCall('/payments/razorpay/verify', {
        method: 'POST',
        body: JSON.stringify({
          orderId: mockRzpData.orderId,
          razorpayOrderId: mockRzpData.rzpOrderId,
          razorpayPaymentId: 'pay_mock_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          razorpaySignature: 'mock_signature_hash',
          isMock: true
        })
      });
      if (verifyRes.success) {
        setOrderSuccess(verifyRes.data);
        toast.success('Mock Razorpay Payment Authorized!');
        fetchCart();
      }
    } catch (err) {
      setError(`Mock Payment failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // If order is completed successfully, render Success Screen
  if (orderSuccess) {
    return (
      <div className="container" style={{ padding: '6rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
        <div className="glass-card-no-hover fade-in" style={{ maxWidth: '550px', width: '100%', textAlign: 'center' }}>
          <CheckCircle2 size={72} color="var(--success)" style={{ display: 'block', margin: '0 auto 1.5rem auto' }} />
          <h2 style={{ fontFamily: 'Outfit', fontSize: '2rem', marginBottom: '1rem' }}>Order Placed Successfully!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Thank you for shopping with Vibe Cart. Your order has been registered and is being prepared.
          </p>

          <div className="glass-card-no-hover" style={{ background: 'hsla(var(--hue), 20%, 4%, 0.3)', textAlign: 'left', padding: '1.25rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Order ID:</span> <span style={{ fontWeight: 'bold' }}>{orderSuccess._id}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Payment Method:</span> <span style={{ fontWeight: 'bold' }}>{orderSuccess.paymentMethod === 'Razorpay' ? 'Razorpay Secure Gateway' : 'Cash on Delivery'}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Payment Status:</span> <span className={`badge ${orderSuccess.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>{orderSuccess.paymentStatus}</span></div>
            {orderSuccess.transactionId && (
              <div><span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span> <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{orderSuccess.transactionId}</code></div>
            )}
            <div><span style={{ color: 'var(--text-muted)' }}>Total Amount:</span> <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>${orderSuccess.totalAmount}</span></div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/orders" className="btn btn-primary" style={{ minWidth: '160px' }}>View My Orders</Link>
            <Link to="/" className="btn btn-secondary" style={{ minWidth: '160px' }}>Back to Store</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container fade-in" style={{ padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Secure Checkout</h1>

      {error && (
        <div className="badge badge-danger" style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '2.5rem', textTransform: 'none' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="responsive-grid-checkout">
        {/* Shipping details */}
        <div>
          {/* Address selector section */}
          <section className="glass-card-no-hover" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>1. Shipping Address</span>
              {!showAddressForm && (
                <button type="button" onClick={() => setShowAddressForm(true)} className="btn btn-secondary btn-sm" style={{ display: 'flex', gap: '4px' }}>
                  <Plus size={16} /> Add New
                </button>
              )}
            </h3>

            {!showAddressForm ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr._id;
                  return (
                    <div 
                      key={addr._id} 
                      onClick={() => setSelectedAddressId(addr._id)}
                      className="glass-card" 
                      style={{ 
                        cursor: 'pointer', 
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                        background: isSelected ? 'var(--primary-glow)' : 'transparent',
                        padding: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: '1rem' }}>{addr.fullName}</h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                          {addr.city}, {addr.state}, {addr.country} - {addr.pincode}
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Mobile: {addr.mobile}</p>
                      </div>
                      {isSelected && <Check size={20} color="var(--primary)" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Add address form */
              <form onSubmit={handleCreateAddress} className="responsive-address-form">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-input" placeholder="Receiver name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input type="tel" className="form-input" placeholder="e.g. 9876543210" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input type="text" className="form-input" placeholder="ZIP or pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input type="text" className="form-input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input type="text" className="form-input" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} required />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Country</label>
                  <input type="text" className="form-input" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} required />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary btn-sm">Save Address</button>
                  {addresses.length > 0 && (
                    <button type="button" onClick={() => setShowAddressForm(false)} className="btn btn-secondary btn-sm">Cancel</button>
                  )}
                </div>
              </form>
            )}
          </section>

          {/* Payment selector section */}
          <section className="glass-card-no-hover">
            <h3 style={{ marginBottom: '1.5rem' }}>2. Payment Method</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div 
                onClick={() => setPaymentMethod('COD')}
                className="glass-card" 
                style={{ 
                  cursor: 'pointer', 
                  borderColor: paymentMethod === 'COD' ? 'var(--primary)' : 'var(--border)', 
                  background: paymentMethod === 'COD' ? 'var(--primary-glow)' : 'transparent',
                  padding: '1.25rem', 
                  textAlign: 'center' 
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💵</div>
                <h4 style={{ fontSize: '1rem' }}>Cash on Delivery</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>Pay with cash upon package receipt.</p>
              </div>

              <div 
                onClick={() => setPaymentMethod('Razorpay')}
                className="glass-card" 
                style={{ 
                  cursor: 'pointer', 
                  borderColor: paymentMethod === 'Razorpay' ? 'var(--primary)' : 'var(--border)', 
                  background: paymentMethod === 'Razorpay' ? 'var(--primary-glow)' : 'transparent',
                  padding: '1.25rem', 
                  textAlign: 'center' 
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💳</div>
                <h4 style={{ fontSize: '1rem' }}>Razorpay Secure</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>Pay with UPI, Cards, Netbanking instantly.</p>
              </div>
            </div>

            {paymentMethod === 'Razorpay' && (
              <div className="glass-card-no-hover fade-in" style={{ background: 'hsla(var(--hue), 20%, 4%, 0.3)', borderStyle: 'dashed', marginTop: '1.5rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', marginBottom: '0.5rem' }}>
                  🛡️ Secure Razorpay Checkout Enabled
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Upon clicking checkout, the secure payment interface will load. Supports real payment verification or automated sandbox simulations.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Order review sidebar */}
        <div>
          <div className="glass-card-no-hover" style={{ height: 'fit-content', position: 'sticky', top: '100px' }}>
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Review Items</h3>
            
            {/* Minimal cart item list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem', maxHeight: '220px', overflowY: 'auto' }}>
              {cartItems.map((item) => {
                const prod = item.product || {};
                const activePrice = prod.discountPrice && prod.discountPrice < prod.price ? prod.discountPrice : prod.price;
                return (
                  <div key={prod._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{prod.title} (x{item.quantity})</span>
                    <span style={{ fontWeight: 'bold' }}>${Math.round(activePrice * item.quantity * 100) / 100}</span>
                  </div>
                );
              })}
            </div>

            {/* Calculations breakdown */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>${rawSubtotal}</span>
              </div>
              
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Discount</span>
                  <span>-${discountAmount}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Shipping</span>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>FREE</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                <span>Grand Total</span>
                <span style={{ color: 'var(--primary)', fontWeight: '900' }}>${finalTotal}</span>
              </div>
            </div>

            <button 
              onClick={handlePlaceOrder}
              disabled={loading || !selectedAddressId}
              className="btn btn-primary" 
              style={{ width: '100%' }}
            >
              {loading ? 'Processing Order...' : `Pay & Place Order ($${finalTotal})`}
            </button>
          </div>
        </div>
      </div>

      {/* Razorpay Sandbox Simulation Modal */}
      {showMockRzpModal && mockRzpData && (
        <div className="rzp-modal-overlay">
          <div className="rzp-modal-content fade-in">
            <div className="rzp-logo">
              💳 razorpay <span>sandbox</span>
            </div>
            
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Authorize Payment</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              You are simulating a secure checkout for order <code style={{ color: 'var(--primary)' }}>{mockRzpData.rzpOrderId}</code>.
            </p>
            
            <div style={{ background: 'hsla(var(--hue), 20%, 4%, 0.4)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Amount Payable</div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)', marginTop: '4px' }}>
                ₹{((mockRzpData.amount) / 100).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                (Simulated INR exchange rate: $1 USD = ₹80 INR)
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={() => handleMockPaymentVerify(true)} 
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                ✅ Authorize Payment (Success)
              </button>
              <button 
                onClick={() => handleMockPaymentVerify(false)} 
                className="btn btn-secondary"
                style={{ width: '100%', color: 'var(--danger)' }}
              >
                ❌ Cancel Payment (Failure)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
