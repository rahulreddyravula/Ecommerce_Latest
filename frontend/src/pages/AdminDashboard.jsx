import React, { useState, useEffect } from 'react';
import { apiCall } from '../services/api';
import { Layout, Package, ShoppingCart, UserCheck, TrendingUp, Plus, Edit, Trash, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Tabs: 'stats' | 'orders' | 'products' | 'users'
  const [activeTab, setActiveTab] = useState('stats');

  // Product Create/Edit States
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('');
  const [SKU, setSKU] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [imageFile, setImageFile] = useState(null);

  // Category States
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryParent, setCategoryParent] = useState('');
  const [categoryStatus, setCategoryStatus] = useState('active');
  const [categoryImageFile, setCategoryImageFile] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch stats
      const statsRes = await apiCall('/admin/dashboard');
      if (statsRes.success) setStats(statsRes.data);

      // Fetch orders
      const ordersRes = await apiCall('/admin/orders');
      if (ordersRes.success) setOrders(ordersRes.data);

      // Fetch products (public view bypasses pagination for simple dropdown/management)
      const productsRes = await apiCall('/products?limit=100');
      if (productsRes.success) setProducts(productsRes.data.products);

      // Fetch categories
      const categoriesRes = await apiCall('/categories');
      if (categoriesRes.success) setCategories(categoriesRes.data);

      // Fetch users
      const usersRes = await apiCall('/admin/users');
      if (usersRes.success) setUsers(usersRes.data);

    } catch (err) {
      console.error('Error fetching dashboard statistics:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleUpdateOrderStatus = async (orderId, currentStatus) => {
    let nextStatus = 'placed';
    if (currentStatus === 'placed') nextStatus = 'processing';
    else if (currentStatus === 'processing') nextStatus = 'shipped';
    else if (currentStatus === 'shipped') nextStatus = 'delivered';
    else return;

    try {
      const res = await apiCall(`/admin/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ orderStatus: nextStatus })
      });
      if (res.success) {
        toast.success('Order status advanced!');
        loadDashboardData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update order status');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      const res = await apiCall(`/admin/orders/${orderId}/cancel`, {
        method: 'PUT'
      });
      if (res.success) {
        toast.success('Order cancelled!');
        loadDashboardData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order');
    }
  };

  const handleBlockUser = async (userId) => {
    if (!window.confirm('Are you sure you want to block this user?')) return;
    try {
      const res = await apiCall(`/admin/users/${userId}/block`, {
        method: 'PUT'
      });
      if (res.success) {
        toast.success('User blocked successfully!');
        loadDashboardData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to block user');
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      const res = await apiCall(`/admin/users/${userId}/unblock`, {
        method: 'PUT'
      });
      if (res.success) {
        toast.success('User unblocked successfully!');
        loadDashboardData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to unblock user');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!title || !price || !SKU || !category || !brand) {
      toast.warn('All marked fields are required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('discountPrice', discountPrice || 0);
      formData.append('stock', stock || 0);
      formData.append('SKU', SKU);
      formData.append('category', category);
      formData.append('brand', brand);
      if (imageFile) {
        // Appends image files to multipart request
        formData.append('images', imageFile);
      }

      let res;
      if (editingProduct) {
        res = await apiCall(`/admin/products/${editingProduct._id}`, {
          method: 'PUT',
          body: formData
        });
      } else {
        res = await apiCall('/admin/products', {
          method: 'POST',
          body: formData
        });
      }

      if (res.success) {
        toast.success(editingProduct ? 'Product edited successfully!' : 'Product added successfully!');
        setShowProductForm(false);
        setEditingProduct(null);
        // Clear fields
        setTitle('');
        setDescription('');
        setPrice('');
        setDiscountPrice('');
        setStock('');
        setSKU('');
        setCategory('');
        setBrand('');
        setImageFile(null);
        loadDashboardData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save product');
    }
  };

  const handleEditClick = (prod) => {
    setEditingProduct(prod);
    setTitle(prod.title);
    setDescription(prod.description);
    setPrice(prod.price);
    setDiscountPrice(prod.discountPrice || '');
    setStock(prod.stock);
    setSKU(prod.SKU);
    setCategory(prod.category?._id || prod.category || '');
    setBrand(prod.brand);
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await apiCall(`/admin/products/${productId}`, {
        method: 'DELETE'
      });
      if (res.success) {
        toast.success('Product deleted successfully');
        loadDashboardData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast.warn('Category name is required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', categoryName.trim());
      formData.append('description', categoryDescription.trim());
      formData.append('status', categoryStatus);
      formData.append('parent', categoryParent || '');
      if (categoryImageFile) {
        formData.append('image', categoryImageFile);
      }

      let res;
      if (editingCategory) {
        res = await apiCall(`/admin/categories/${editingCategory._id}`, {
          method: 'PUT',
          body: formData
        });
      } else {
        res = await apiCall('/admin/categories', {
          method: 'POST',
          body: formData
        });
      }

      if (res.success) {
        toast.success(editingCategory ? 'Category updated successfully!' : 'Category created successfully!');
        setShowCategoryForm(false);
        setEditingCategory(null);
        setCategoryName('');
        setCategoryDescription('');
        setCategoryParent('');
        setCategoryStatus('active');
        setCategoryImageFile(null);
        loadDashboardData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save category');
    }
  };

  const handleEditCategoryClick = (cat) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDescription(cat.description || '');
    setCategoryParent(cat.parent?._id || cat.parent || '');
    setCategoryStatus(cat.status || 'active');
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Are you sure you want to delete this category? Child categories will be moved to its parent.')) return;
    try {
      const res = await apiCall(`/admin/categories/${catId}`, {
        method: 'DELETE'
      });
      if (res.success) {
        toast.success('Category deleted successfully');
        loadDashboardData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete category');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-secondary)' }}>Loading dashboard portal...</div>;

  return (
    <div className="container fade-in" style={{ padding: '3rem 1.5rem' }}>
      
      {/* Dashboard Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem' }}>Admin Control Center</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Overview e-commerce operations, catalog manager, and support lines.</p>
        </div>
        <Link to="/admin/chat" className="btn btn-secondary">
          💬 Support Chat Console
        </Link>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('stats')} className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-secondary'}`}>
          <TrendingUp size={16} /> Sales & Metrics
        </button>
        <button onClick={() => setActiveTab('orders')} className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}>
          <ShoppingCart size={16} /> Orders ({orders.length})
        </button>
        <button onClick={() => setActiveTab('products')} className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}`}>
          <Package size={16} /> Catalog Inventory
        </button>
        <button onClick={() => setActiveTab('users')} className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}>
          <UserCheck size={16} /> User Management ({users.length})
        </button>
        <button onClick={() => setActiveTab('categories')} className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`}>
          <Layout size={16} /> Category Manager ({categories.length})
        </button>
      </div>

      {/* STATS TAB */}
      {activeTab === 'stats' && stats && (
        <div className="fade-in">
          {/* Dashboard Stats Panel */}
          <div className="grid grid-cols-4" style={{ gap: '1.5rem', marginBottom: '3rem' }}>
            <div className="glass-card-no-hover">
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Gross Revenue</div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)', marginTop: '6px' }}>${stats.revenue}</div>
            </div>
            <div className="glass-card-no-hover">
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Sales (Non-Cancelled)</div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-primary)', marginTop: '6px' }}>${stats.totalSales}</div>
            </div>
            <div className="glass-card-no-hover">
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Fulfillment Queue</div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--warning)', marginTop: '6px' }}>{stats.pendingOrders}</div>
            </div>
            <div className="glass-card-no-hover">
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Registered Customers</div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--success)', marginTop: '6px' }}>{stats.totalUsers}</div>
            </div>
          </div>

          {/* Simple HTML bar chart breakdown */}
          <div className="glass-card-no-hover" style={{ overflowX: 'auto' }}>
            <h3 style={{ marginBottom: '2rem' }}>Monthly Sales Report</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '240px', paddingTop: '1.5rem', minWidth: '600px' }}>
              {stats.monthlySales?.map((m, idx) => {
                const maxVal = Math.max(...stats.monthlySales.map(i => i.sales), 100);
                const heightPercent = `${(m.sales / maxVal) * 80 + 5}%`;
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: 'auto' }}>${m.sales}</div>
                    <div style={{
                      width: '32px',
                      background: 'var(--grad-primary)',
                      borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                      height: heightPercent,
                      boxShadow: 'var(--shadow-glow)',
                      marginTop: '6px'
                    }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      {m.month.slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="table-container fade-in">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>User Details</th>
                <th>Grand Total</th>
                <th>Fulfillment State</th>
                <th>Payment State</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => (
                <tr key={ord._id}>
                  <td style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{ord._id.slice(-8).toUpperCase()}</td>
                  <td>
                    <div>{ord.shippingAddress?.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mobile: {ord.shippingAddress?.mobile}</div>
                  </td>
                  <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>${ord.totalAmount}</td>
                  <td>
                    <span className={`badge ${ord.orderStatus === 'delivered' ? 'badge-success' : ord.orderStatus === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                      {ord.orderStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${ord.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                      {ord.paymentStatus}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    {ord.orderStatus !== 'delivered' && ord.orderStatus !== 'cancelled' && (
                      <button onClick={() => handleUpdateOrderStatus(ord._id, ord.orderStatus)} className="btn btn-secondary btn-sm" style={{ display: 'flex', gap: '4px' }}>
                        <Check size={14} /> Next Step
                      </button>
                    )}
                    {ord.orderStatus !== 'delivered' && ord.orderStatus !== 'cancelled' && (
                      <button onClick={() => handleCancelOrder(ord._id)} className="btn btn-danger btn-sm">Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Products Inventory Management</h3>
            <button onClick={() => { setEditingProduct(null); setShowProductForm(true); }} className="btn btn-primary btn-sm" style={{ display: 'flex', gap: '4px' }}>
              <Plus size={16} /> Add Product
            </button>
          </div>

          {/* Product form overlay modal */}
          {showProductForm && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                  {editingProduct ? 'Edit Catalog Product' : 'Add New Product'}
                </h3>
                
                <form onSubmit={handleSaveProduct}>
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">SKU (Unique Code) *</label>
                    <input type="text" className="form-input" value={SKU} onChange={(e) => setSKU(e.target.value)} required />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Price ($) *</label>
                      <input type="number" className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Discount Price ($)</label>
                      <input type="number" className="form-input" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Category *</label>
                      <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)} required>
                        <option value="">Select Category</option>
                        {categories.map(c => (
                          <option key={c._id} value={c._id}>
                            {c.parent ? `${c.parent.name} -> ` : ''}{c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Brand Name *</label>
                      <input type="text" className="form-input" value={brand} onChange={(e) => setBrand(e.target.value)} required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Stock Quantity</label>
                    <input type="number" className="form-input" value={stock} onChange={(e) => setStock(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-input" style={{ height: '80px' }} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Product Image File</label>
                    <input type="file" onChange={(e) => setImageFile(e.target.files[0])} accept="image/*" />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                    <button type="submit" className="btn btn-primary">Save Product</button>
                    <button type="button" onClick={() => setShowProductForm(false)} className="btn btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Product list table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Image</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Discount Price</th>
                  <th>Stock</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => (
                  <tr key={prod._id}>
                    <td><code>{prod.SKU}</code></td>
                    <td>
                      <img 
                        src={prod.images && prod.images.length > 0 ? (prod.images[0].startsWith('http') ? prod.images[0] : `http://localhost:5000/${prod.images[0]}`) : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100'} 
                        alt="" 
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} 
                      />
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{prod.title}</td>
                    <td>${prod.price}</td>
                    <td style={{ color: 'var(--primary)' }}>{prod.discountPrice ? `$${prod.discountPrice}` : '-'}</td>
                    <td>
                      <span className={`badge ${prod.stock < 10 ? 'badge-danger' : 'badge-success'}`}>
                        {prod.stock} units
                      </span>
                    </td>
                    <td>{prod.category?.name || 'Standard'}</td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEditClick(prod)} className="btn btn-secondary btn-sm" style={{ display: 'flex', gap: '4px' }}>
                        <Edit size={12} /> Edit
                      </button>
                      <button onClick={() => handleDeleteProduct(prod._id)} className="btn btn-danger btn-sm" style={{ display: 'flex', gap: '4px' }}>
                        <Trash size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="table-container fade-in">
          <table>
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((usr) => (
                <tr key={usr._id}>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>{usr.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{usr.email}</div>
                  </td>
                  <td>
                    <span className={`badge ${usr.role === 'Admin' ? 'badge-primary' : 'badge-secondary'}`}>
                      {usr.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${usr.status === 'blocked' ? 'badge-danger' : 'badge-success'}`}>
                      {usr.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(usr.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    {usr.role !== 'Admin' && (
                      usr.status === 'blocked' ? (
                        <button
                          onClick={() => handleUnblockUser(usr._id)}
                          className="btn btn-secondary btn-sm"
                          style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
                        >
                          Unblock User
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBlockUser(usr._id)}
                          className="btn btn-secondary btn-sm"
                          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        >
                          Block User
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>E-Commerce Categories Tree</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Organize nested parent-child categories like Amazon and Flipkart.
              </p>
            </div>
            <button 
              onClick={() => { setEditingCategory(null); setCategoryName(''); setCategoryDescription(''); setCategoryParent(''); setCategoryStatus('active'); setCategoryImageFile(null); setShowCategoryForm(true); }} 
              className="btn btn-primary btn-sm" 
              style={{ display: 'flex', gap: '4px' }}
            >
              <Plus size={16} /> Add Category
            </button>
          </div>

          {/* Category Form Overlay Modal */}
          {showCategoryForm && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ maxWidth: '500px' }}>
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h3>
                
                <form onSubmit={handleSaveCategory}>
                  <div className="form-group">
                    <label className="form-label">Category Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={categoryName} 
                      onChange={(e) => setCategoryName(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Parent Category</label>
                    <select 
                      className="form-input" 
                      value={categoryParent} 
                      onChange={(e) => setCategoryParent(e.target.value)}
                    >
                      <option value="">None (Top-Level Category)</option>
                      {categories
                        .filter(c => !editingCategory || (c._id !== editingCategory._id)) // Prevent selecting itself
                        .map(c => (
                          <option key={c._id} value={c._id}>
                            {c.parent ? `${c.parent.name || c.parent} -> ` : ''}{c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select 
                      className="form-input" 
                      value={categoryStatus} 
                      onChange={(e) => setCategoryStatus(e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea 
                      className="form-input" 
                      style={{ height: '80px' }} 
                      value={categoryDescription} 
                      onChange={(e) => setCategoryDescription(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category Banner / Image</label>
                    <input 
                      type="file" 
                      onChange={(e) => setCategoryImageFile(e.target.files[0])} 
                      accept="image/*" 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                    <button type="submit" className="btn btn-primary">Save Category</button>
                    <button type="button" onClick={() => setShowCategoryForm(false)} className="btn btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Hierarchy Tree & Table side-by-side or stacked */}
          <div className="grid grid-cols-2" style={{ gap: '2rem', alignItems: 'start' }}>
            {/* Visual Tree */}
            <div className="glass-card-no-hover" style={{ padding: '1.5rem' }}>
              <h4 style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Visual Tree View</h4>
              {(() => {
                const buildCategoryTree = (flatCategories) => {
                  const map = {};
                  const roots = [];
                  
                  flatCategories.forEach(cat => {
                    map[cat._id] = { ...cat, children: [] };
                  });

                  flatCategories.forEach(cat => {
                    const parentId = cat.parent?._id || cat.parent;
                    if (parentId && map[parentId]) {
                      map[parentId].children.push(map[cat._id]);
                    } else {
                      roots.push(map[cat._id]);
                    }
                  });
                  return roots;
                };

                const categoryTree = buildCategoryTree(categories);

                if (categoryTree.length === 0) {
                  return <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No categories found.</div>;
                }

                const renderNode = (node, depth = 0) => {
                  return (
                    <div key={node._id} style={{ marginLeft: `${depth * 20}px`, borderLeft: depth > 0 ? '1px dashed var(--border)' : 'none', paddingLeft: depth > 0 ? '12px' : '0', marginTop: '8px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: 'rgba(255,255,255,0.03)', 
                        padding: '10px 14px', 
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-sm)'
                      }}>
                        <div>
                          <span style={{ fontWeight: '600' }}>{node.name}</span>
                          <span style={{ opacity: 0.5, fontSize: '0.75rem', marginLeft: '8px' }}>/{node.slug}</span>
                          {node.status === 'inactive' && (
                            <span className="badge badge-danger" style={{ marginLeft: '8px', fontSize: '0.65rem' }}>inactive</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleEditCategoryClick(node)} className="btn btn-secondary btn-xs" style={{ padding: '3px 8px', fontSize: '0.75rem' }}>Edit</button>
                          <button onClick={() => handleDeleteCategory(node._id)} className="btn btn-danger btn-xs" style={{ padding: '3px 8px', fontSize: '0.75rem' }}>Delete</button>
                        </div>
                      </div>
                      {node.children && node.children.map(child => renderNode(child, depth + 1))}
                    </div>
                  );
                };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {categoryTree.map(root => renderNode(root))}
                  </div>
                );
              })()}
            </div>

            {/* List Table with Images */}
            <div className="table-container">
              <h4 style={{ margin: '1rem 0 1.25rem 1rem', fontSize: '1rem' }}>Flat Categories Registry</h4>
              <table>
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Parent Category</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c._id}>
                      <td>
                        <img 
                          src={c.image ? (c.image.startsWith('http') ? c.image : `http://localhost:5000/${c.image}`) : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100'} 
                          alt="" 
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} 
                        />
                      </td>
                      <td style={{ fontWeight: 'bold' }}>{c.name}</td>
                      <td><code>{c.slug}</code></td>
                      <td>
                        {c.parent ? (
                          <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
                            {c.parent.name || c.parent}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Root</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
