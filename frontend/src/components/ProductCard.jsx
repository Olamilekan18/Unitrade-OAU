import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaCheckCircle, FaStar } from 'react-icons/fa';

function ProductCard({ product }) {
    const categoryName = product.categories?.name || 'General';
    const sellerLocation = product.users?.address || product.users?.department || 'OAU';
    const sellerName = product.users?.store_name || product.users?.name || 'Seller';
    const sellerId = product.users?.id;
    const isVerified = product.users?.is_verified;

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

                <div className="product-card-body">
                    <h3 className="product-card-title">{product.title}</h3>
                    <p className="product-card-price">
                        ₦{Number(product.price).toLocaleString()}
                    </p>
                </div>
            </Link>

            <div className="product-card-meta" style={{ padding: '0 var(--space-4) var(--space-4)' }}>
                <FaMapMarkerAlt />
                <span>{sellerLocation}</span>
                <span style={{ margin: '0 4px' }}>•</span>
                {sellerId ? (
                    <Link
                        to={`/users/${sellerId}`}
                        style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                    >
                        {sellerName}
                        {isVerified && <FaCheckCircle style={{ color: '#1d9bf0', fontSize: '0.7rem' }} />}
                    </Link>
                ) : (
                    <span>{sellerName}</span>
                )}
            </div>
        </article>
    );
}

export default ProductCard;
