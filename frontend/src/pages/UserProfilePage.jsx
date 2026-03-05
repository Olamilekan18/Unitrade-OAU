import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    FaBuilding, FaPhone, FaMapMarkerAlt, FaCheckCircle,
    FaSpinner, FaArrowLeft, FaStore, FaCalendarAlt,
} from 'react-icons/fa';
import { getProfile, fetchSellerProducts } from '../utils/api';

function UserProfilePage() {
    const { id } = useParams();
    const [profile, setProfile] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadProfile() {
            try {
                setLoading(true);
                const [profileRes, productsRes] = await Promise.all([
                    getProfile(id),
                    fetchSellerProducts(id),
                ]);
                setProfile(profileRes.data);
                setProducts(productsRes.data || []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [id]);

    if (loading) {
        return (
            <div className="auth-page">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-gray-500)' }}>
                    <FaSpinner className="spinner" /> Loading profile...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="auth-page">
                <div className="auth-card fade-in-up" style={{ textAlign: 'center' }}>
                    <h1 style={{ marginBottom: 'var(--space-4, 1rem)' }}>User Not Found</h1>
                    <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-6, 1.5rem)' }}>{error}</p>
                    <Link to="/marketplace" className="btn btn-primary btn-lg">
                        <FaArrowLeft /> Back to Marketplace
                    </Link>
                </div>
            </div>
        );
    }

    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=059669&color=fff&size=100`;
    const joined = new Date(profile.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'long' });

    return (
        <div className="create-listing-page">
            <div className="container" style={{ maxWidth: 720 }}>
                <div className="create-listing-card fade-in-up">
                    {/* Avatar & Name */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-6, 1.5rem)' }}>
                        <img
                            src={profile.avatar_url || defaultAvatar}
                            alt={profile.name}
                            style={{
                                width: 100, height: 100, borderRadius: '50%',
                                objectFit: 'cover', border: '4px solid var(--color-primary-200)',
                                background: 'var(--color-gray-100)', marginBottom: 'var(--space-4, 1rem)',
                            }}
                            onError={(e) => { e.target.src = defaultAvatar; }}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <h1 style={{ fontSize: 'var(--font-size-2xl)', margin: 0 }}>
                                {profile.store_name || profile.name}
                            </h1>
                            {profile.is_verified && (
                                <FaCheckCircle style={{ color: '#1d9bf0', fontSize: '1.1rem' }} title="Verified Seller" />
                            )}
                        </div>

                        {profile.store_name && (
                            <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>{profile.name}</p>
                        )}
                        <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
                            {profile.department}
                        </p>

                        <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
                            <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                                <FaStore /> {products.length} Listing{products.length !== 1 ? 's' : ''}
                            </span>
                            <span className="badge" style={{ fontSize: '0.75rem', background: 'var(--color-gray-100)', color: 'var(--color-gray-600)' }}>
                                <FaCalendarAlt /> Joined {joined}
                            </span>
                        </div>
                    </div>

                    {/* Profile Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}>
                        {profile.bio && (
                            <div style={{ padding: 'var(--space-4, 1rem)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md, 10px)' }}>
                                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: 4 }}>About</p>
                                <p style={{ color: 'var(--color-gray-700)' }}>{profile.bio}</p>
                            </div>
                        )}

                        <ProfileField icon={<FaBuilding />} label="Department" value={profile.department} />
                        {profile.phone && <ProfileField icon={<FaPhone />} label="Phone" value={profile.phone} />}
                        {profile.address && <ProfileField icon={<FaMapMarkerAlt />} label="Location" value={profile.address} />}

                        {/* Seller's Products */}
                        {products.length > 0 && (
                            <div style={{ marginTop: 'var(--space-4)' }}>
                                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                                    Listings ({products.length})
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
                                    {products.map((p) => (
                                        <Link
                                            key={p.id}
                                            to={`/product/${p.id}`}
                                            style={{ textDecoration: 'none', color: 'inherit', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-gray-100)', transition: 'box-shadow 0.2s' }}
                                        >
                                            <img
                                                src={p.image_url}
                                                alt={p.title}
                                                style={{ width: '100%', height: 120, objectFit: 'cover' }}
                                                onError={(e) => { e.target.src = 'https://placehold.co/200x120/e5e7eb/9ca3af?text=No+Image'; }}
                                            />
                                            <div style={{ padding: 'var(--space-3)' }}>
                                                <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                                                <p style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)' }}>₦{Number(p.price).toLocaleString()}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ textAlign: 'center', marginTop: 'var(--space-4, 1rem)' }}>
                            <Link to="/marketplace" className="btn btn-lg btn-outline">
                                <FaArrowLeft /> Back to Marketplace
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProfileField({ icon, label, value }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3, 0.75rem)', padding: '12px 0', borderBottom: '1px solid var(--color-gray-100)' }}>
            <span style={{ color: 'var(--color-primary)', fontSize: '1rem', width: 20, flexShrink: 0 }}>{icon}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ color: 'var(--color-gray-700)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{value}</p>
            </div>
        </div>
    );
}

export default UserProfilePage;
