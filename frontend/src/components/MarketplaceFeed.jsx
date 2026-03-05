import { useEffect, useState } from 'react';
import { FaBoxOpen, FaSpinner } from 'react-icons/fa';
import { fetchProducts } from '../utils/api';
import ProductCard from './ProductCard';

function MarketplaceFeed({ searchQuery, selectedCategory }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const payload = await fetchProducts();
        setProducts(payload.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // Client-side filtering
  const filtered = products.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === null ||
      selectedCategory === undefined ||
      product.categories?.id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

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

  if (error) {
    return (
      <div className="state-block">
        <FaSpinner />
        <p>{error}</p>
      </div>
    );
  }

  if (!filtered.length) {
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
    <div className="product-grid stagger">
      {filtered.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default MarketplaceFeed;
