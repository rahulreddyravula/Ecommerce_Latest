import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { apiCall } from '../services/api';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        // Fetch categories
        const catRes = await apiCall('/categories');
        if (catRes.success) {
          setCategories(catRes.data);
        }

        // Fetch products (limit to featured/latest items)
        const prodRes = await apiCall('/products?limit=8');
        if (prodRes.success) {
          setFeaturedProducts(prodRes.data.products);
        }
      } catch (err) {
        console.error('Error loading homepage data:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  return (
    <div className="fade-in">
      {/* Hero Banner Section */}
      <section style={{
        background: 'radial-gradient(circle at 80% 20%, hsla(var(--hue), 85%, 60%, 0.15) 0%, transparent 60%)',
        padding: '6rem 0 4rem 0',
        borderBottom: '1px solid var(--border)',
        marginBottom: '4rem'
      }}>
        <div className="container hero-grid">
          <div>
            <span style={{
              background: 'var(--primary-glow)',
              color: 'var(--primary)',
              padding: '6px 12px',
              borderRadius: '99px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              border: '1px solid var(--primary)'
            }}>NEW SEASON DROPS ⚡</span>
            
            <h1 style={{ marginTop: '1.5rem', lineHeight: '1.1', fontWeight: '900' }}>
              Level Up Your <br />
              <span style={{ background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Vibe & Style</span>
            </h1>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(1rem, 3vw, 1.2rem)', margin: '1.5rem 0 2.5rem 0', maxWidth: '600px' }}>
              Discover premium apparel, cutting-edge electronics, and lifestyle products curated just for you. Fast shipping, easy checkout.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'inherit' }}>
              <Link to="/products" className="btn btn-primary">
                Explore Collection <ArrowRight size={18} />
              </Link>
              <a href="#featured" className="btn btn-secondary">
                View Featured
              </a>
            </div>
          </div>

          {/* Interactive banner visual */}
          <div className="glass-card hero-visual" style={{ padding: '2rem', textAlign: 'center', background: 'var(--grad-glass)' }}>
            <span style={{ fontSize: '4rem' }}>🎧</span>
            <h3 style={{ margin: '1rem 0 0.5rem 0' }}>Sonic X1 Headphones</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Experience true spatial audio with immersive noise cancellation.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>$249.99</span>
              <Link to="/products" className="btn btn-primary btn-sm">Shop Now</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Perks Ribbon */}
      <section className="container" style={{ marginBottom: '5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
          <div className="glass-card-no-hover" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Truck size={32} color="var(--primary)" />
            <div>
              <h4 style={{ fontSize: '1rem' }}>Fast Delivery</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Free express shipping on orders over $150</p>
            </div>
          </div>

          <div className="glass-card-no-hover" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <ShieldCheck size={32} color="var(--success)" />
            <div>
              <h4 style={{ fontSize: '1rem' }}>Secure Payments</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Simulated SSL checkout using Stripe</p>
            </div>
          </div>

          <div className="glass-card-no-hover" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <RotateCcw size={32} color="var(--warning)" />
            <div>
              <h4 style={{ fontSize: '1rem' }}>Easy Returns</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>30-day no-hassle customer refund warranty</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories slider */}
      <section className="container" style={{ marginBottom: '5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Browse Categories</h2>
          <Link to="/products" style={{ color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            See All <ArrowRight size={16} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
          {categories.map((cat) => (
            <Link to={`/products?category=${cat.slug}`} key={cat._id} className="glass-card" style={{
              textAlign: 'center',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem'
            }}>
              {cat.image ? (
                <img src={cat.image.startsWith('http') ? cat.image : `http://localhost:5000/${cat.image}`} alt={cat.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '2.5rem' }}>📦</span>
              )}
              <h4 style={{ fontSize: '1.1rem' }}>{cat.name}</h4>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section id="featured" className="container" style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Trending Collection</h2>
          <Link to="/products" className="btn btn-secondary btn-sm">Explore Catalog</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="skeleton-card">
                <div className="skeleton skeleton-image" />
                <div className="skeleton skeleton-text short" />
                <div className="skeleton skeleton-text title" />
                <div className="skeleton skeleton-text" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <div className="skeleton skeleton-text short" style={{ height: '24px' }} />
                  <div className="skeleton skeleton-text short" style={{ height: '36px', width: '60px', borderRadius: 'var(--radius-sm)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No products found. Start listing items in the admin portal!
          </div>
        ) : (
          <div className="grid grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
