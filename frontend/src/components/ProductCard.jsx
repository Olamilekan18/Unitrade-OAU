import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaCheckCircle, FaStar, FaTags } from 'react-icons/fa';

function ProductCard({ product }) {
    const categoryName = product.categories?.name || 'General';
    const sellerLocation = product.users?.address || product.users?.department || 'OAU';
    const sellerName = product.users?.store_name || product.users?.name || 'Seller';
    const sellerId = product.users?.id;
    const isVerified = product.users?.is_verified;

    const pRating = product.product_rating;
    const pCount = product.product_reviews_count;
    const sRating = product.users?.seller_rating;
    const sCount = product.users?.seller_reviews_count;

    return (
        <article className="product-card">
            <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="product-card-image-wrap">
                    <img
                        src={product.image_url}
                        alt={product.title}
                        loading="lazy"
                        onError={(e) => {
                            e.target.src = 'https://placehold.co/400x300/e5e7eb/9ca3af?text=No+Image';
                        }}
                    />
                    <span className="product-card-category badge badge-accent">
                        {categoryName}
                    </span>
                </div>

                <div className="product-card-body" style={{ paddingBottom: 'var(--space-2)' }}>
                    <h3 className="product-card-title" style={{ marginBottom: 4 }}>{product.title}</h3>
                    {pRating ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-gray-500)', marginBottom: 8 }}>
                            <FaStar color="#f59e0b" /> {pRating} ({pCount})
                        </div>
                    ) : (
                        <div style={{ height: 16, marginBottom: 8 }} />
                    )}
                    <p className="product-card-price" style={{ margin: 0 }}>
                        ₦{Number(product.price).toLocaleString()}
                    </p>
                </div>
            </Link>

            <div className="product-card-meta" style={{ padding: '0 var(--space-4) var(--space-3)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FaMapMarkerAlt />
                    <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sellerLocation}</span>
                    <span style={{ margin: '0 2px' }}>•</span>
                    {sellerId ? (
                        <Link
                            to={`/users/${sellerId}`}
                            style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                        >
                            {sellerName}
                            {isVerified && <FaCheckCircle style={{ color: '#1d9bf0', fontSize: '0.7rem' }} />}
                            {sRating && (
                                <span style={{ color: 'var(--color-gray-500)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 2, marginLeft: 2, fontWeight: 500 }}>
                                    <FaStar color="#f59e0b" /> {sRating}
                                </span>
                            )}
                        </Link>
                    ) : (
                        <span>{sellerName}</span>
                    )}
                </div>
            </div>

            <div style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', gap: 8 }}>
                {sellerId && (
                    <Link
                        to={`/chat?seller=${sellerId}&product=${product.id}&action=offer`}
                        className="btn btn-outline-primary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%', display: 'flex', justifyContent: 'center', gap: 6 }}
                    >
                        <FaTags /> Make Offer
                    </Link>
                )}
            </div>
        </article>
    );
}

export default ProductCard;
