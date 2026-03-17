import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSpinner, FaCheckCircle, FaUser } from 'react-icons/fa';
import { fetchSellerBids, acceptBid } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function BidsPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [bids, setBids] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [actionBid, setActionBid] = useState(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    async function loadBids() {
      try {
        setStatus({ loading: true, error: '' });
        const res = await fetchSellerBids();
        setBids(res.data || []);
      } catch (err) {
        setStatus({ loading: false, error: err.message });
        return;
      }
      setStatus({ loading: false, error: '' });
    }
    if (isAuthenticated) loadBids();
  }, [isAuthenticated]);

  async function handleAccept(bidId) {
    try {
      setActionBid(bidId);
      const res = await acceptBid(bidId);
      const accepted = res.data;
      setBids((prev) =>
        prev.map((bid) => {
          if (bid.id === accepted.id) {
            return { ...bid, status: 'accepted', product: accepted.product || bid.product };
          }
          if (bid.product?.id === accepted.product?.id && bid.status === 'pending') {
            return { ...bid, status: 'rejected' };
          }
          return bid;
        })
      );
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    } finally {
      setActionBid(null);
    }
  }

  if (loading) return null;

  const grouped = bids.reduce((acc, bid) => {
    const productId = bid.product?.id || 'unknown';
    if (!acc[productId]) {
      acc[productId] = { product: bid.product, bids: [] };
    }
    acc[productId].bids.push(bid);
    return acc;
  }, {});

  return (
    <div className="create-listing-page">
      <div className="container" style={{ maxWidth: 960 }}>
        <div className="create-listing-card fade-in-up" style={{ padding: 'var(--space-8)' }}>
          <h1>Free Item Bids</h1>
          <p className="listing-subtitle">
            Review bids on your free listings and choose who gets the item.
          </p>

          {status.error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>
              {status.error}
            </div>
          )}

          {status.loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-gray-500)' }}>
              <FaSpinner className="spinner" /> Loading bids...
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-gray-500)', padding: 'var(--space-8)' }}>
              No bids yet.
            </div>
          ) : (
            Object.values(grouped).map(({ product, bids: productBids }) => {
              const isSold = product?.status === 'sold' || product?.quantity <= 0;
              return (
                <div key={product?.id} style={{ marginBottom: 'var(--space-8)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    {product?.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--color-gray-100)' }}
                        onError={(e) => { e.target.src = 'https://placehold.co/120x120/e5e7eb/9ca3af?text=No+Image'; }}
                      />
                    )}
                    <div>
                      <h3 style={{ marginBottom: 4 }}>{product?.title || 'Listing'}</h3>
                      <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
                        {productBids.length} bid{productBids.length === 1 ? '' : 's'} submitted
                      </p>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      {isSold ? (
                        <span className="badge badge-accent">Sold</span>
                      ) : (
                        <span className="badge badge-primary">Available</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                    {productBids.map((bid) => (
                      <div key={bid.id} style={{ border: '1px solid var(--color-gray-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', background: 'var(--color-white)', boxShadow: 'var(--shadow-xs)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                            <FaUser />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 600 }}>
                              {bid.bidder?.store_name || bid.bidder?.name || 'Student'}
                              {bid.bidder?.is_verified && <FaCheckCircle style={{ color: '#1d9bf0', fontSize: '0.8rem', marginLeft: 6 }} />}
                            </p>
                            <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-xs)' }}>
                              {bid.bidder?.department || 'OAU'}
                            </p>
                          </div>
                          <span className={`badge ${bid.status === 'accepted' ? 'badge-primary' : bid.status === 'rejected' ? 'badge-accent' : ''}`}>
                            {bid.status}
                          </span>
                        </div>

                        {bid.note && (
                          <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-gray-600)' }}>
                            {bid.note}
                          </p>
                        )}

                        {bid.status === 'pending' && !isSold && (
                          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-primary"
                              onClick={() => handleAccept(bid.id)}
                              disabled={actionBid === bid.id}
                            >
                              {actionBid === bid.id ? <><FaSpinner className="spinner" /> Accepting...</> : 'Accept Bid'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <Link to={`/product/${product?.id}`} className="btn btn-outline">
                      View Listing
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default BidsPage;
