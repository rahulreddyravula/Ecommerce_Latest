import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiCall } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Star, ShoppingCart, Heart, Calendar } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, toggleWishlist, wishlist } = useCart();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Review states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const isWishlisted = wishlist?.products?.some(
    (item) => (item._id || item) === product?._id
  );

  const fetchProductData = async () => {
    try {
      setLoading(true);
      // Fetch product by slug
      const prodRes = await apiCall(`/products/${slug}`);
      if (!prodRes.success) {
        navigate('/products');
        return;
      }
      const prod = prodRes.data;
      setProduct(prod);
      setActiveImage(prod.images && prod.images.length > 0 ? prod.images[0] : '');

      // Fetch reviews
      const revRes = await apiCall(`/reviews/product/${prod._id}`);
      if (revRes.success) {
        setReviews(revRes.data);
      }

      // Fetch related products
      const relRes = await apiCall(`/products?category=${prod.category?._id || prod.category}&limit=4`);
      if (relRes.success) {
        setRelatedProducts(relRes.data.products.filter(p => p._id !== prod._id));
      }

    } catch (err) {
      console.error(err.message);
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductData();
  }, [slug]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-secondary)' }}>Loading product data details...</div>;
  }

  if (!product) return null;

  const handleAddToCart = () => {
    if (!user) {
      toast.warn('Please log in to add items to your cart.');
      return;
    }
    addToCart(product._id, quantity)
      .then(() => toast.success(`${product.title} added to cart.`))
      .catch((err) => toast.error(err.message));
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setReviewError('Please write a review comment');
      return;
    }
    setReviewError('');
    setReviewSuccess('');

    try {
      const res = await apiCall('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId: product._id,
          rating,
          comment
        })
      });
      if (res.success) {
        setReviewSuccess('Review posted successfully!');
        setComment('');
        // Reload reviews & product statistics
        const revRes = await apiCall(`/reviews/product/${product._id}`);
        if (revRes.success) setReviews(revRes.data);
        const prodRes = await apiCall(`/products/${slug}`);
        if (prodRes.success) setProduct(prodRes.data);
      }
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review');
    }
  };

  const hasDiscount = product.discountPrice && product.discountPrice < product.price;

  return (
    <div className="container fade-in" style={{ padding: '3rem 1.5rem' }}>
      {/* Product Details Row */}
      <div className="product-detail-grid" style={{ marginBottom: '5rem' }}>
        
        {/* Images Slideshow */}
        <div>
          <div className="glass-card" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 0 }}>
            <img 
              src={activeImage ? (activeImage.startsWith('http') ? activeImage : `http://localhost:5000/${activeImage}`) : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'} 
              alt={product.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Thumbnail slides */}
          {product.images && product.images.length > 1 && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', overflowX: 'auto', padding: '4px' }}>
              {product.images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImage(img)}
                  style={{
                    width: '70px',
                    height: '70px',
                    border: activeImage === img ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: '#000',
                    padding: 0
                  }}
                >
                  <img src={img.startsWith('http') ? img : `http://localhost:5000/${img}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Column */}
        <div>
          <span style={{ textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>{product.brand}</span>
          <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', margin: '0.5rem 0 1rem 0' }}>{product.title}</h1>

          {/* Ratings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', color: 'var(--warning)' }}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={18} style={{ fill: i < Math.round(product.ratings || 5) ? 'var(--warning)' : 'none' }} />
              ))}
            </div>
            <span style={{ fontWeight: 'bold' }}>{product.ratings || '5.0'}</span>
            <span style={{ color: 'var(--text-muted)' }}>({reviews.length} customer reviews)</span>
          </div>

          {/* Price */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            {hasDiscount ? (
              <>
                <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)' }}>${product.discountPrice}</span>
                <span style={{ fontSize: '1.25rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>${product.price}</span>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Save ${Math.round(product.price - product.discountPrice)}
                </span>
              </>
            ) : (
              <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-primary)' }}>${product.price}</span>
            )}
          </div>

          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{product.description}</p>

          {/* Quantity and Actions */}
          {product.stock > 0 ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.25rem' }}>
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 0.8rem', border: 'none' }}
                >-</button>
                <span style={{ padding: '0 1rem', fontWeight: 'bold' }}>{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 0.8rem', border: 'none' }}
                >+</button>
              </div>

              <button onClick={handleAddToCart} className="btn btn-primary">
                <ShoppingCart size={18} /> Add to Cart
              </button>

              <button 
                onClick={() => toggleWishlist(product._id)}
                className="btn btn-secondary"
                style={{ padding: '0.75rem' }}
              >
                <Heart size={20} style={{ fill: isWishlisted ? 'var(--danger)' : 'none', color: isWishlisted ? 'var(--danger)' : 'currentColor' }} />
              </button>
            </div>
          ) : (
            <div className="badge badge-danger" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', marginBottom: '2rem' }}>
              Temporarily Out of Stock
            </div>
          )}

          {/* Product metadata */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <div><span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>SKU:</span> {product.SKU}</div>
            <div><span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Category:</span> {product.category?.name || 'Standard'}</div>
            <div><span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Availability:</span> {product.stock > 0 ? `In Stock (${product.stock} units left)` : 'Out of Stock'}</div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <section className="responsive-grid-checkout" style={{ gap: '4rem', marginBottom: '5rem', borderTop: '1px solid var(--border)', paddingTop: '3rem' }}>
        
        {/* Review list */}
        <div>
          <h2 style={{ marginBottom: '2rem' }}>Customer Reviews ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No reviews yet for this product. Be the first to share your thoughts!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {reviews.map((rev) => (
                <div key={rev._id} className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {rev.user?.name || 'Anonymous User'}
                    </h4>
                    <div style={{ display: 'flex', color: 'var(--warning)' }}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} size={14} style={{ fill: i < rev.rating ? 'var(--warning)' : 'none' }} />
                      ))}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{rev.comment}</p>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                    <Calendar size={12} /> {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Review Form */}
        <div>
          <h2 style={{ marginBottom: '2rem' }}>Write a Review</h2>
          {user ? (
            <form onSubmit={handleReviewSubmit} className="glass-card">
              {reviewError && <div className="badge badge-danger" style={{ display: 'block', padding: '0.5rem', marginBottom: '1rem', textTransform: 'none', textAlign: 'center' }}>{reviewError}</div>}
              {reviewSuccess && <div className="badge badge-success" style={{ display: 'block', padding: '0.5rem', marginBottom: '1rem', textTransform: 'none', textAlign: 'center' }}>{reviewSuccess}</div>}

              {/* Rating picker */}
              <div className="form-group">
                <label className="form-label">Overall Rating</label>
                <div style={{ display: 'flex', gap: '8px', color: 'var(--warning)', cursor: 'pointer' }}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <Star 
                      key={num} 
                      size={24} 
                      style={{ fill: num <= rating ? 'var(--warning)' : 'none' }} 
                      onClick={() => setRating(num)} 
                    />
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="form-group">
                <label className="form-label">Review Comment</label>
                <textarea 
                  className="form-input" 
                  style={{ width: '100%', height: '120px', resize: 'vertical' }}
                  placeholder="Share your experience with this item..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Submit Review
              </button>
            </form>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Please log in to submit a review for this product.</p>
              <Link to="/login" className="btn btn-secondary btn-sm">Log In Now</Link>
            </div>
          )}
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section style={{ borderTop: '1px solid var(--border)', paddingTop: '3rem' }}>
          <h2 style={{ marginBottom: '2rem' }}>Related Products</h2>
          <div className="grid grid-cols-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
