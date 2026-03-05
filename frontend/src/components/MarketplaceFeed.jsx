import { useEffect, useState } from 'react';
import { FaBoxOpen, FaSpinner } from 'react-icons/fa';
import { fetchProducts } from '../utils/api';

function MarketplaceFeed() {
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

  if (loading) {
    return (
      <div className="state-block">
        <FaSpinner className="spin" /> Loading listings...
      </div>
    );
  }

  if (error) {
    return <div className="state-block error">{error}</div>;
  }

  if (!products.length) {
    return (
      <div className="state-block">
        <FaBoxOpen /> No products available yet.
      </div>
    );
  }

  return (
    <section className="feed-grid">
      {products.map((product) => (
        <article key={product.id} className="card">
          <img src={product.image_url} alt={product.title} className="card-image" />
          <div className="card-body">
            <h3>{product.title}</h3>
            <p className="price">₦{Number(product.price).toLocaleString()}</p>
            <p className="meta">{product.categories?.name || 'General'} • {product.users?.department || 'OAU'}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

export default MarketplaceFeed;
