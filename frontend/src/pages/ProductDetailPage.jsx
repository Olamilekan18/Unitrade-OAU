import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    FaStar, FaRegStar, FaSpinner, FaMapMarkerAlt, FaCheckCircle,
    FaArrowLeft, FaPaperPlane, FaTag, FaClock, FaUser,
} from 'react-icons/fa';
import { fetchProduct, fetchReviews, createReview } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function ProductDetailPage() {
    const { id } = useParams();
    const { user, isAuthenticated } = useAuth();
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState({ average: 0, count: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Review form state
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [reviewMessage, setReviewMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const [productRes, reviewsRes] = await Promise.all([
                    fetchProduct(id),
                    fetchReviews(id),
                ]);
                setProduct(productRes.data);
                setReviews(reviewsRes.data.reviews);
                setStats(reviewsRes.data.stats);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id]);

    async function handleReviewSubmit(e) {
        e.preventDefault();
        if (rating === 0) {
            setReviewMessage({ type: 'error', text: 'Please select a rating.' });
            return;
        }

        try {
            setSubmitting(true);
            setReviewMessage({ type: '', text: '' });
            const res = await createReview(id, { rating, comment });
            setReviews((prev) => [res.data, ...prev]);
            setStats((prev) => ({
                count: prev.count + 1,
                average: Math.round(((prev.average * prev.count + rating) / (prev.count + 1)) * 10) / 10,
            }));
            setRating(0);
            setComment('');
            setReviewMessage({ type: 'success', text: 'Review submitted!' });
        } catch (err) {
            setReviewMessage({ type: 'error', text: err.message });
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="auth-page">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-gray-500)' }}>
                    <FaSpinner className="spinner" /> Loading product...
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="auth-page">
                <div className="auth-card fade-in-up" style={{ textAlign: 'center' }}>
                    <h1>Product Not Found</h1>
                    <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)' }}>{error}</p>
                    <Link to="/marketplace" className="btn btn-primary btn-lg">
                        <FaArrowLeft /> Back to Marketplace
                    </Link>
                </div>
            </div>
        );
    }

    const seller = product.users || {};
    const category = product.categories || {};
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.name || 'S')}&background=059669&color=fff&size=48`;
    const timeAgo = getTimeAgo(product.created_at);

    return (
        <div className="product-detail-page" style={{ minHeight: '80vh', paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-10)' }}>
            <div className="container" style={{ maxWidth: 960 }}>
                {/* Back link */}
                <Link to="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)', textDecoration: 'none' }}>
                    <FaArrowLeft /> Back to Marketplace
                </Link>

                {/* Main content grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-8)' }}>

                    {/* Product Hero */}
                    <div className="fade-in-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-8)', background: 'white', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
                        {/* Image */}
                        <div style={{ position: 'relative', minHeight: 320 }}>
                            <img
                                src={product.image_url}
                                alt={product.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 320 }}
                                onError={(e) => { e.target.src = 'https://placehold.co/600x400/e5e7eb/9ca3af?text=No+Image'; }}
                            />
                            <span
                                className="badge badge-accent"
                                style={{ position: 'absolute', top: 16, left: 16 }}
                            >
                                <FaTag /> {category.name || 'General'}
                            </span>
                        </div>

                        {/* Info */}
                        <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, lineHeight: 1.2 }}>
                                {product.title}
                            </h1>

                            <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-primary)' }}>
                                ₦{Number(product.price).toLocaleString()}
                            </p>

                            {/* Rating summary */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <RatingStars value={stats.average} />
                                <span style={{ fontWeight: 600, color: 'var(--color-gray-700)' }}>{stats.average}</span>
                                <span style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>
                                    ({stats.count} {stats.count === 1 ? 'review' : 'reviews'})
                                </span>
                            </div>

                            {product.description && (
                                <p style={{ color: 'var(--color-gray-600)', lineHeight: 1.6 }}>
                                    {product.description}
                                </p>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-400)' }}>
                                <FaClock /> Listed {timeAgo}
                            </div>

                            {/* Seller Card */}
                            <div style={{ marginTop: 'auto', padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <img
                                    src={seller.avatar_url || defaultAvatar}
                                    alt={seller.name}
                                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.src = defaultAvatar; }}
                                />
                                <div style={{ flex: 1 }}>
                                    <Link
                                        to={`/users/${seller.id}`}
                                        style={{ fontWeight: 700, color: 'var(--color-gray-800)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                                    >
                                        {seller.store_name || seller.name}
                                        {seller.is_verified && (
                                            <FaCheckCircle style={{ color: '#1d9bf0', fontSize: '0.9rem' }} title="Verified Seller" />
                                        )}
                                    </Link>
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <FaMapMarkerAlt /> {seller.department}
                                    </p>
                                </div>
                                {seller.phone && (
                                    <a href={`tel:${seller.phone}`} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                                        Contact
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Reviews Section */}
                    <div className="fade-in-up" style={{ background: 'white', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', padding: 'var(--space-6)' }}>
                        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
                            Reviews & Ratings
                        </h2>

                        {/* Write a review */}
                        {isAuthenticated && product.users?.id !== user?.id && (
                            <form onSubmit={handleReviewSubmit} style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
                                <p style={{ fontWeight: 600, marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
                                    Leave a Review
                                </p>

                                {/* Star picker */}
                                <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-3)' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: '1.5rem', color: (hoverRating || rating) >= star ? '#f59e0b' : 'var(--color-gray-300)', transition: 'color 0.15s' }}
                                        >
                                            {(hoverRating || rating) >= star ? <FaStar /> : <FaRegStar />}
                                        </button>
                                    ))}
                                    {rating > 0 && (
                                        <span style={{ alignSelf: 'center', marginLeft: 8, fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                                            {rating}/5
                                        </span>
                                    )}
                                </div>

                                <textarea
                                    className="input"
                                    placeholder="Share your thoughts about this product..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={3}
                                    style={{ marginBottom: 'var(--space-3)' }}
                                />

                                {reviewMessage.text && (
                                    <div className={`alert ${reviewMessage.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 'var(--space-3)' }}>
                                        {reviewMessage.text}
                                    </div>
                                )}

                                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ fontSize: '0.85rem' }}>
                                    {submitting ? <><FaSpinner className="spinner" /> Submitting...</> : <><FaPaperPlane /> Submit Review</>}
                                </button>
                            </form>
                        )}

                        {!isAuthenticated && (
                            <div style={{ padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-5)', textAlign: 'center' }}>
                                <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
                                    <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Log in</Link> to leave a review.
                                </p>
                            </div>
                        )}

                        {/* Reviews list */}
                        {reviews.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: 'var(--space-6)' }}>
                                No reviews yet. Be the first to review this product!
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                {reviews.map((review) => (
                                    <ReviewCard key={review.id} review={review} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function RatingStars({ value }) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        stars.push(
            i <= Math.round(value)
                ? <FaStar key={i} style={{ color: '#f59e0b', fontSize: '0.9rem' }} />
                : <FaRegStar key={i} style={{ color: 'var(--color-gray-300)', fontSize: '0.9rem' }} />
        );
    }
    return <div style={{ display: 'flex', gap: 2 }}>{stars}</div>;
}

function ReviewCard({ review }) {
    const reviewer = review.users || {};
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewer.name || '?')}&background=059669&color=fff&size=36`;

    return (
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-gray-100)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                <img
                    src={reviewer.avatar_url || defaultAvatar}
                    alt={reviewer.name}
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                    onError={(e) => { e.target.src = defaultAvatar; }}
                />
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Link to={`/users/${reviewer.id}`} style={{ fontWeight: 600, color: 'var(--color-gray-800)', fontSize: 'var(--font-size-sm)', textDecoration: 'none' }}>
                            {reviewer.store_name || reviewer.name}
                        </Link>
                        {reviewer.is_verified && (
                            <FaCheckCircle style={{ color: '#1d9bf0', fontSize: '0.7rem' }} />
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <RatingStars value={review.rating} />
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                            {getTimeAgo(review.created_at)}
                        </span>
                    </div>
                </div>
            </div>
            {review.comment && (
                <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--font-size-sm)', lineHeight: 1.6, marginLeft: 48 }}>
                    {review.comment}
                </p>
            )}
        </div>
    );
}

function getTimeAgo(dateString) {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (seconds < 60) return 'just now';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

export default ProductDetailPage;
