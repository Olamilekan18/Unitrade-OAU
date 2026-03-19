import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';
import { fetchMyProducts } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function MyListings() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function loadProducts() {
      try {
        setLoadingProducts(true);
        const payload = await fetchMyProducts();
        setProducts(payload.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, [isAuthenticated]);

  if (loading) return null;

  return (
    <div className="create-listing-page">
      <div className="container">
        <div className="create-listing-card fade-in-up">
          <Link to="/sell" className="btn btn-outline" style={{ width: 'fit-content', marginBottom: 'var(--space-4)' }}>
            <FaArrowLeft /> Back to Sell
          </Link>
          <h1>Your Listings</h1>
          <p className="listing-subtitle">Manage all your products and edit any listing.</p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--space-5, 1.25rem)' }}>
              {error}
            </div>
          )}

          {loadingProducts ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-gray-500)' }}>
              <FaSpinner className="spinner" /> Loading...
            </div>
          ) : products.length === 0 ? (
            <p style={{ color: 'var(--color-gray-500)' }}>You have no listings yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
              {products.map((p) => {
                const cover = p.image_urls?.[0] || p.image_url;
                return (
                  <div key={p.id} style={{ border: '1px solid var(--color-gray-100)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--color-white)' }}>
                    <img
                      src={cover || 'https://placehold.co/300x200/e5e7eb/9ca3af?text=No+Image'}
                      alt={p.title}
                      style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }}
                      onError={(e) => { e.target.src = 'https://placehold.co/300x200/e5e7eb/9ca3af?text=No+Image'; }}
                    />
                    <div style={{ padding: 'var(--space-3)' }}>
                      <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.title}
                      </p>
                      <p style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', marginBottom: 8 }}>
                        {Number(p.price) === 0 ? 'Free' : `₦${Number(p.price).toLocaleString()}`}
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link
                          to={`/product/${p.id}`}
                          className="btn btn-outline"
                          style={{ width: '100%', fontSize: '0.75rem', padding: '6px 10px' }}
                        >
                          View
                        </Link>
                        <Link
                          to={`/listings/${p.id}/edit`}
                          className="btn btn-outline"
                          style={{ width: '100%', fontSize: '0.75rem', padding: '6px 10px' }}
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyListings;
