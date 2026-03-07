import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    FaShoppingBag, FaStore, FaSpinner, FaCheckCircle, FaClock,
    FaTruck, FaTimesCircle, FaArrowLeft, FaBoxOpen, FaTrash, FaStar
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { fetchOrders, confirmDelivery, markOrderAsShipped, deleteOrder, createUserReview } from '../utils/api';

const STATUS_CONFIG = {
    pending: { label: 'Pending', icon: <FaClock />, className: 'status-pending' },
    paid: { label: 'Paid', icon: <FaBoxOpen />, className: 'status-paid' },
    shipped: { label: 'Shipped', icon: <FaTruck />, className: 'status-paid' },
    delivered: { label: 'Delivered', icon: <FaCheckCircle />, className: 'status-delivered' },
    cancelled: { label: 'Cancelled', icon: <FaTimesCircle />, className: 'status-cancelled' },
};

function OrdersPage() {
    const { user, loading: authLoading, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('purchases');
    const [purchases, setPurchases] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirmingId, setConfirmingId] = useState(null);
    const [shippingId, setShippingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingOrder, setRatingOrder] = useState(null);
    const [ratingValue, setRatingValue] = useState(5);
    const [ratingComment, setRatingComment] = useState('');
    const [submittingRating, setSubmittingRating] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        loadOrders();
    }, [authLoading, isAuthenticated]);

    async function loadOrders() {
        try {
            setLoading(true);
            const res = await fetchOrders();
            setPurchases(res.data.purchases || []);
            setSales(res.data.sales || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleConfirmDelivery(orderId) {
        try {
            setConfirmingId(orderId);
            await confirmDelivery(orderId);
            setPurchases((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: 'delivered' } : o))
            );
        } catch (err) {
            alert(err.message);
        } finally {
            setConfirmingId(null);
        }
    }

    async function handleMarkShipped(orderId) {
        try {
            setShippingId(orderId);
            await markOrderAsShipped(orderId);
            setSales((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: 'shipped' } : o))
            );
        } catch (err) {
            alert(err.message);
        } finally {
            setShippingId(null);
        }
    }

    async function handleDeleteOrder(orderId) {
        if (!window.confirm("Are you sure you want to delete this order? This will reset the product to available.")) return;

        try {
            setDeletingId(orderId);
            await deleteOrder(orderId);
            setPurchases((prev) => prev.filter(o => o.id !== orderId));
        } catch (err) {
            alert(err.message);
        } finally {
            setDeletingId(null);
        }
    }

    async function handleRateSellerSubmit(e) {
        e.preventDefault();
        if (!ratingOrder) return;
        try {
            setSubmittingRating(true);
            await createUserReview(ratingOrder.seller.id, {
                rating: ratingValue,
                comment: ratingComment
            });
            alert('Review submitted successfully!');
            setShowRatingModal(false);
        } catch (err) {
            alert(err.message || 'Failed to submit review. You may have already reviewed this seller.');
        } finally {
            setSubmittingRating(false);
        }
    }

    if (authLoading || loading) {
        return (
            <div className="auth-page">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-gray-500)' }}>
                    <FaSpinner className="spinner" /> Loading orders...
                </div>
            </div>
        );
    }

    const currentOrders = activeTab === 'purchases' ? purchases : sales;

    return (
        <div className="orders-page">
            <div className="container" style={{ maxWidth: 800 }}>
                {/* Header */}
                <div className="fade-in-up" style={{ marginBottom: 'var(--space-6)' }}>
                    <Link to="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', textDecoration: 'none' }}>
                        <FaArrowLeft /> Back to Marketplace
                    </Link>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FaBoxOpen style={{ color: 'var(--color-primary)' }} /> My Orders
                    </h1>
                </div>

                {/* Tabs */}
                <div className="orders-tabs fade-in-up">
                    <button
                        className={`orders-tab ${activeTab === 'purchases' ? 'active' : ''}`}
                        onClick={() => setActiveTab('purchases')}
                    >
                        <FaShoppingBag /> My Purchases
                        {purchases.length > 0 && <span className="orders-tab-count">{purchases.length}</span>}
                    </button>
                    <button
                        className={`orders-tab ${activeTab === 'sales' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sales')}
                    >
                        <FaStore /> My Sales
                        {sales.length > 0 && <span className="orders-tab-count">{sales.length}</span>}
                    </button>
                </div>

                {/* Orders List */}
                <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {error && (
                        <div className="alert alert-error">{error}</div>
                    )}

                    {currentOrders.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: 'var(--space-16)',
                            background: 'white', borderRadius: 'var(--radius-xl)',
                            boxShadow: 'var(--shadow-md)',
                        }}>
                            <FaBoxOpen style={{ fontSize: '3rem', color: 'var(--color-gray-300)', marginBottom: 'var(--space-4)' }} />
                            <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)' }}>
                                {activeTab === 'purchases'
                                    ? "You haven't purchased anything yet."
                                    : "You haven't received any orders yet."}
                            </p>
                            <Link to="/marketplace" className="btn btn-primary">
                                Browse Marketplace
                            </Link>
                        </div>
                    ) : (
                        currentOrders.map((order) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                type={activeTab}
                                onConfirmDelivery={handleConfirmDelivery}
                                onMarkShipped={handleMarkShipped}
                                onDeleteOrder={handleDeleteOrder}
                                onRateSeller={(order) => {
                                    setRatingOrder(order);
                                    setRatingValue(5);
                                    setRatingComment('');
                                    setShowRatingModal(true);
                                }}
                                confirmingId={confirmingId}
                                shippingId={shippingId}
                                deletingId={deletingId}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Rating Modal */}
            {showRatingModal && ratingOrder && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 400 }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: 16 }}>Rate your experience with {ratingOrder.seller?.store_name || ratingOrder.seller?.name || 'this seller'}</h2>
                        <form onSubmit={handleRateSellerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', gap: 8, fontSize: '1.5rem', justifyContent: 'center' }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <FaStar
                                        key={star}
                                        onClick={() => setRatingValue(star)}
                                        style={{ cursor: 'pointer', color: star <= ratingValue ? '#f59e0b' : 'var(--color-gray-300)' }}
                                    />
                                ))}
                            </div>
                            <textarea
                                className="input"
                                placeholder="What went well? (Optional)"
                                value={ratingComment}
                                onChange={(e) => setRatingComment(e.target.value)}
                                rows={3}
                            />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowRatingModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submittingRating}>
                                    {submittingRating ? <FaSpinner className="spinner" /> : 'Submit Review'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function OrderCard({ order, type, onConfirmDelivery, onMarkShipped, onDeleteOrder, onRateSeller, confirmingId, shippingId, deletingId }) {
    const product = order.products || {};
    const otherUser = type === 'purchases' ? order.seller : order.buyer;
    const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.name || '?')}&background=059669&color=fff&size=40`;

    return (
        <div className="order-card">
            <div className="order-card-inner">
                {/* Product Image */}
                <Link to={`/product/${product.id}`} className="order-card-image">
                    <img
                        src={product.image_url || 'https://placehold.co/120x120/e5e7eb/9ca3af?text=No+Image'}
                        alt={product.title}
                        onError={(e) => { e.target.src = 'https://placehold.co/120x120/e5e7eb/9ca3af?text=No+Image'; }}
                    />
                </Link>

                {/* Order Info */}
                <div className="order-card-info">
                    <Link to={`/product/${product.id}`} className="order-card-title">
                        {product.title || 'Product'}
                    </Link>

                    <p className="order-card-amount">
                        ₦{Number(order.amount).toLocaleString()}
                    </p>

                    {/* Other user */}
                    <div className="order-card-user">
                        <img
                            src={otherUser?.avatar_url || defaultAvatar}
                            alt={otherUser?.name}
                            className="order-card-avatar"
                            onError={(e) => { e.target.src = defaultAvatar; }}
                        />
                        <span>
                            {type === 'purchases' ? 'Seller: ' : 'Buyer: '}
                            <strong>{otherUser?.store_name || otherUser?.name || 'Unknown'}</strong>
                        </span>
                        {otherUser?.is_verified && (
                            <FaCheckCircle style={{ color: '#1d9bf0', fontSize: '0.75rem' }} />
                        )}
                    </div>

                    <div className="order-card-meta">
                        <span className={`order-status-badge ${config.className}`}>
                            {config.icon} {config.label}
                        </span>
                        <span className="order-card-date">
                            {new Date(order.created_at).toLocaleDateString('en-NG', {
                                day: 'numeric', month: 'short', year: 'numeric'
                            })}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="order-card-actions">
                    {type === 'purchases' && (order.status === 'paid' || order.status === 'shipped') && (
                        <button
                            className="btn btn-primary"
                            onClick={() => onConfirmDelivery(order.id)}
                            disabled={confirmingId === order.id}
                            style={{ fontSize: '0.8rem', padding: '8px 16px', whiteSpace: 'nowrap' }}
                        >
                            {confirmingId === order.id
                                ? <><FaSpinner className="spinner" /> Confirming...</>
                                : <><FaCheckCircle /> Confirm Delivery</>}
                        </button>
                    )}
                    {type === 'sales' && order.status === 'paid' && (
                        <button
                            className="btn btn-primary"
                            onClick={() => onMarkShipped(order.id)}
                            disabled={shippingId === order.id}
                            style={{ fontSize: '0.8rem', padding: '8px 16px', whiteSpace: 'nowrap' }}
                        >
                            {shippingId === order.id
                                ? <><FaSpinner className="spinner" /> Marking...</>
                                : <><FaTruck /> Mark as Shipped</>}
                        </button>
                    )}
                    {type === 'purchases' && order.status === 'delivered' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Link
                                to={`/product/${product.id}`}
                                className="btn btn-outline"
                                style={{ fontSize: '0.8rem', padding: '8px 16px', whiteSpace: 'nowrap' }}
                            >
                                Rate Product
                            </Link>
                            <button
                                className="btn btn-primary"
                                onClick={() => onRateSeller(order)}
                                style={{ fontSize: '0.8rem', padding: '8px 16px', whiteSpace: 'nowrap' }}
                            >
                                <FaStar style={{ marginRight: 4 }} /> Rate Seller
                            </button>
                        </div>
                    )}

                    {/* Delete Support (Test purposes) */}
                    {type === 'purchases' && (
                        <button
                            className="btn btn-outline"
                            onClick={() => onDeleteOrder(order.id)}
                            disabled={deletingId === order.id}
                            style={{
                                fontSize: '0.8rem', padding: '8px 16px', whiteSpace: 'nowrap',
                                color: 'var(--color-error, #dc2626)', borderColor: '#f87171'
                            }}
                        >
                            {deletingId === order.id
                                ? <><FaSpinner className="spinner" /> Deleting...</>
                                : <><FaTrash /> Delete</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default OrdersPage;
