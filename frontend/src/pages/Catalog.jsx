import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiCall } from '../services/api';
import ProductCard from '../components/ProductCard';
import { Filter, RotateCcw, Search } from 'lucide-react';

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  // Filter States
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '-createdAt');

  // Load categories
  useEffect(() => {
    apiCall('/categories')
      .then((res) => {
        if (res.success) setCategories(res.data);
      })
      .catch((err) => console.error(err.message));
  }, []);

  // Fetch filtered products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (priceMin) params.append('priceMin', priceMin);
      if (priceMax) params.append('priceMax', priceMax);
      if (brand) params.append('brand', brand);
      if (sort) params.append('sort', sort);
      params.append('page', page.toString());
      params.append('limit', '9');

      const data = await apiCall(`/products?${params.toString()}`);
      if (data.success) {
        setProducts(data.data.products);
        setPages(data.data.pages);
      }
    } catch (err) {
      console.error('Error fetching products:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // Update search query params
    const activeParams = {};
    if (search) activeParams.search = search;
    if (category) activeParams.category = category;
    if (priceMin) activeParams.priceMin = priceMin;
    if (priceMax) activeParams.priceMax = priceMax;
    if (brand) activeParams.brand = brand;
    if (sort) activeParams.sort = sort;
    setSearchParams(activeParams);
  }, [category, sort, page]);

  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setPriceMin('');
    setPriceMax('');
    setBrand('');
    setSort('-createdAt');
    setPage(1);
    setSearchParams({});
  };

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      {/* Mobile Filters Toggle Button */}
      <button 
        className="btn btn-secondary mobile-filters-toggle-btn" 
        onClick={() => setShowMobileFilters(!showMobileFilters)}
        style={{ width: '100%', marginBottom: '1.5rem', display: 'none', gap: '8px', alignItems: 'center', justifyContent: 'center' }}
      >
        <Filter size={16} /> {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
      </button>

      <div className="catalog-layout">
        {/* Sidebar Filters */}
        <aside className={`glass-card-no-hover ${showMobileFilters ? 'open' : ''}`} style={{ height: 'fit-content', position: 'sticky', top: '100px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
              <Filter size={18} /> Filters
            </h3>
            <button onClick={handleResetFilters} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
              <RotateCcw size={14} /> Clear
            </button>
          </div>

          <form onSubmit={(e) => { handleApplyFilters(e); setShowMobileFilters(false); }}>
            {/* Search */}
            <div className="form-group">
              <label className="form-label">Search Product</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                  placeholder="Brand, title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button type="submit" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <Search size={16} />
                </button>
              </div>
            </div>

            {/* Categories */}
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" style={{ width: '100%' }} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div className="form-group">
              <label className="form-label">Brand</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Nike, Apple"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>

            {/* Price range */}
            <div className="form-group">
              <label className="form-label">Price Range ($)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  className="form-input"
                  style={{ width: '50%' }}
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
                <input
                  type="number"
                  className="form-input"
                  style={{ width: '50%' }}
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Apply Filters
            </button>
          </form>
        </aside>

        {/* Catalog Grid */}
        <main>
          {/* Top Bar sort */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Showing {products.length} products
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Sort By:</span>
              <select className="form-input" style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem' }} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="-createdAt">Newest Arrival</option>
                <option value="price">Price: Low to High</option>
                <option value="-price">Price: High to Low</option>
                <option value="-ratings">Top Rated</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
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
          ) : products.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '6rem' }}>
              <h3>No Products Match Filters</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Try clearing keywords or adjusting the price range inputs.</p>
              <button onClick={handleResetFilters} className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>Reset Filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '3rem' }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    Previous
                  </button>
                  {Array.from({ length: pages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ minWidth: '36px' }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={page === pages}
                    onClick={() => setPage(page + 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
