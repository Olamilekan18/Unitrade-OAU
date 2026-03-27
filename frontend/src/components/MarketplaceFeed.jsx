import { useEffect, useMemo, useState } from 'react';
import { FaBoxOpen, FaSpinner } from 'react-icons/fa';
import { fetchProducts } from '../utils/api';
import ProductCard from './ProductCard';

function MarketplaceFeed({ searchQuery, selectedCategory, sort, condition, priceType }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const trimmedQuery = useMemo(() => (searchQuery || '').trim(), [searchQuery]);

  useEffect(() => {
    let isActive = true;
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        setError('');
        const payload = await fetchProducts({
          q: trimmedQuery || undefined,
          category: selectedCategory || undefined,
          sort: sort || undefined,
          condition: condition && condition !== 'all' ? condition : undefined,
          price_type: priceType && priceType !== 'all' ? priceType : undefined
        });
        console.log('[MarketplaceFeed] Fetched products with params:', {
          q: trimmedQuery,
          category: selectedCategory,
          sort,
          condition,
          priceType,
          count: payload.data?.length
        });
        if (!isActive) return;
        setProducts(payload.data || []);
      } catch (err) {
        if (!isActive) return;
        const message = err?.message || 'Unable to load products right now.';
        const friendly = message.toLowerCase().includes('fetch')
          ? 'Network error. Please check your connection and try again.'
          : message;
        setError(friendly);
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    }, trimmedQuery ? 300 : 0);

    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [trimmedQuery, selectedCategory, sort, condition, priceType]);

  if (loading) {
    return (
      <div className="product-grid">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="skeleton-card">
            <div className="skeleton-image skeleton" />
            <div className="skeleton-body">
              <div className="skeleton-line skeleton skeleton-line-medium" />
              <div className="skeleton-line skeleton skeleton-line-short" />
              <div className="skeleton-line skeleton skeleton-line-short" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && !products.length) {
    return (
      <div className="state-block">
        <FaSpinner />
        <p>{error}</p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="state-block">
        <FaBoxOpen />
        <p>
          {searchQuery || selectedCategory
            ? 'No products match your filters.'
            : 'No products available yet. Be the first to list!'}
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--space-4, 1rem)' }}>
          {error}
        </div>
      )}
      <div className="product-grid stagger">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}

export default MarketplaceFeed;
