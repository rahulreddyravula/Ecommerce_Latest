import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from '../services/api';
import { Package, Truck, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const toast = useToast();
  const detailsRef = useRef(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/orders');
      if (res.success) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleFetchDetails = async (orderId) => {
    if (selectedOrderId === orderId) {
      setSelectedOrderId(null);
      setOrderDetails(null);
      return;
    }
    setSelectedOrderId(orderId);
    setDetailsLoading(true);
    try {
      const res = await apiCall(`/orders/${orderId}`);
      if (res.success) {
        setOrderDetails(res.data);
        setTimeout(() => {
          if (window.innerWidth <= 992 && detailsRef.current) {
            detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    } catch (err) {
      toast.error(`Failed to load details: ${err.message}`);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      const res = await apiCall(`/orders/${orderId}/cancel`, {
        method: 'PUT'
      });
      if (res.success) {
        toast.success('Order cancelled successfully!');
        // Refresh orders list
        fetchOrders();
        // Reset details if the active one is cancelled
        if (selectedOrderId === orderId) {
          setOrderDetails(res.data);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-secondary)' }}>Loading order history...</div>;
  }

  return (
    <div className="container fade-in" style={{ padding: '3rem 1.5rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2.3rem' }}>My Orders</h1>

      {orders.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '500px', margin: '0 auto' }}>
          <Package size={60} color="var(--text-muted)" style={{ marginBottom: '1.5rem' }} />
          <h3>No Orders Placed Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '2rem' }}>You haven't bought anything yet. Browse our inventory to check out!</p>
          <Link to="/products" className="btn btn-primary">Start Browsing</Link>
        </div>
      ) : (
        <div className="responsive-grid-orders">
          
          {/* Order list history */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {orders.map((order) => {
              const isSelected = selectedOrderId === order._id;
              return (
                <div 
                  key={order._id}
                  onClick={() => handleFetchDetails(order._id)}
                  className="glass-card"
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                    padding: '1.5rem',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ORDER ID:</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', marginLeft: '6px' }}>{order._id.slice(-8).toUpperCase()}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--primary)' }}>
                        ${order.totalAmount}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <span className={`badge ${order.orderStatus === 'delivered' ? 'badge-success' : order.orderStatus === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                          {order.orderStatus}
                        </span>
                        <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {(order.orderStatus === 'placed' || order.orderStatus === 'processing') && (
                      <button 
                        onClick={(e) => handleCancelOrder(order._id, e)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)', padding: '0.35rem 0.75rem', display: 'flex', gap: '4px' }}
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Collapsible Order details widget */}
          <div ref={detailsRef}>
            <div className="glass-card-no-hover" style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
              <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Order Details</h3>

              {detailsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Loading order stats...
                </div>
              ) : !orderDetails ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Select an order on the left panel to inspect items and shipping address tracking.
                </div>
              ) : (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Address */}
                  <div>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Shipping Address</h4>
                    <p style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{orderDetails.shippingAddress?.fullName}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {orderDetails.shippingAddress?.city}, {orderDetails.shippingAddress?.state}, {orderDetails.shippingAddress?.country} - {orderDetails.shippingAddress?.pincode}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Contact: {orderDetails.shippingAddress?.mobile}</p>
                  </div>

                  {/* Items */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Items Ordered</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {orderDetails.products?.map((item) => {
                        const prod = item.product || {};
                        return (
                          <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                            <div>
                              <span style={{ fontWeight: 'bold' }}>{prod.title}</span> x {item.quantity}
                            </div>
                            <span style={{ fontWeight: 'bold' }}>${Math.round(item.price * item.quantity * 100) / 100}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment receipt info */}
                  {orderDetails.transactionId && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', background: 'hsla(var(--hue), 20%, 4%, 0.3)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Transaction Receipt</h4>
                      <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Stripe Code:</span>
                        <code>{orderDetails.transactionId}</code>
                      </div>
                      <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span>Card Brand:</span>
                        <span>{orderDetails.paymentDetails?.cardBrand} (•••• {orderDetails.paymentDetails?.last4})</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
