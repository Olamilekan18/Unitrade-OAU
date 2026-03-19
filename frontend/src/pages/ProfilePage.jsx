import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import {
    FaUser, FaEnvelope, FaBuilding, FaPhone, FaMapMarkerAlt,
    FaEdit, FaSave, FaSpinner, FaCloudUploadAlt, FaTimes, FaCheckCircle,
    FaStore, FaShieldAlt,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { fetchMyProducts, updateMyProfile, uploadImage, requestVerification } from '../utils/api';

function ProfilePage() {
    const { user, loading, isAuthenticated, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [form, setForm] = useState({});
    const [verifyReason, setVerifyReason] = useState('');
    const [showVerifyForm, setShowVerifyForm] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verifyProofUrl, setVerifyProofUrl] = useState('');
    const [uploadingProof, setUploadingProof] = useState(false);
    const [verifyProofPreview, setVerifyProofPreview] = useState('');
    const [localAvatarUrl, setLocalAvatarUrl] = useState(null);
    const [myProducts, setMyProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const fileInputRef = useRef(null);

    if (loading) return null;
    if (!isAuthenticated) {
        navigate('/login');
        return null;
    }

    useEffect(() => {
        if (!isAuthenticated) return;
        async function loadMyProducts() {
            try {
                setLoadingProducts(true);
                const payload = await fetchMyProducts();
                setMyProducts(payload.data || []);
            } catch {
                // Silently fail
            } finally {
                setLoadingProducts(false);
            }
        }
        loadMyProducts();
    }, [isAuthenticated]);

    function startEditing() {
        setForm({
            name: user.name || '',
            store_name: user.store_name || '',
            bio: user.bio || '',
            phone: user.phone || '',
            address: user.address || '',
        });
        setEditing(true);
        setMessage({ type: '', text: '' });
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    async function handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Show instant preview while uploading
        const previewUrl = URL.createObjectURL(file);
        setLocalAvatarUrl(previewUrl);

        try {
            setUploading(true);
            const payload = await uploadImage(file);
            const newUrl = payload.data.url + '?t=' + Date.now();
            const updated = await updateMyProfile({ avatar_url: payload.data.url });
            refreshUser({ ...updated.data, avatar_url: newUrl });
            setLocalAvatarUrl(newUrl);
            setMessage({ type: 'success', text: '✅ Profile photo updated!' });
        } catch (err) {
            setLocalAvatarUrl(null);
            setMessage({ type: 'error', text: err.message });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        try {
            setSaving(true);
            const payload = await updateMyProfile(form);
            refreshUser(payload.data);
            setEditing(false);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    }

    async function handleVerifyRequest(e) {
        e.preventDefault();
        if (!verifyReason.trim()) return;
        if (uploadingProof) {
            setMessage({ type: 'error', text: 'Please wait for the proof image to finish uploading.' });
            return;
        }

        try {
            setVerifying(true);
            await requestVerification({ reason: verifyReason.trim(), proof_url: verifyProofUrl });
            setShowVerifyForm(false);
            setVerifyReason('');
            setVerifyProofUrl('');
            setVerifyProofPreview('');
            setMessage({ type: 'success', text: 'Verification request submitted! You\'ll be notified once reviewed.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setVerifying(false);
        }
    }

    async function handleProofUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const preview = URL.createObjectURL(file);
        setVerifyProofPreview(preview);
        setVerifyProofUrl('');

        try {
            setUploadingProof(true);
            const payload = await uploadImage(file);
            setVerifyProofUrl(payload.data.url);
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
            setVerifyProofPreview('');
            setVerifyProofUrl('');
        } finally {
            setUploadingProof(false);
        }
    }

    const avatarStyle = {
        width: 100,
        height: 100,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '4px solid var(--color-primary-200)',
        background: 'var(--color-gray-100)',
    };

    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=059669&color=fff&size=100`;

    return (
        <div className="create-listing-page">
            <div className="container">
                <div className="create-listing-card fade-in-up">
                    {/* Avatar section */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-6, 1.5rem)' }}>
                        <div style={{ position: 'relative', marginBottom: 'var(--space-4, 1rem)' }}>
                            <img
                                src={localAvatarUrl || user.avatar_url || defaultAvatar}
                                alt={user.name}
                                style={avatarStyle}
                                onError={(e) => { e.target.src = defaultAvatar; }}
                            />
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                style={{
                                    position: 'absolute', bottom: 0, right: 0,
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: 'var(--color-primary)', color: 'white',
                                    border: '3px solid white', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', fontSize: '0.75rem',
                                }}
                            >
                                {uploading ? <FaSpinner className="spinner" /> : <FaCloudUploadAlt />}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="btn btn-outline"
                            style={{ fontSize: '0.8rem', padding: '6px 16px', marginBottom: 'var(--space-3, 0.75rem)' }}
                        >
                            <FaCloudUploadAlt /> {uploading ? 'Uploading...' : 'Update Photo'}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <h1 style={{ fontSize: 'var(--font-size-2xl)', margin: 0 }}>
                                {user.store_name || user.name}
                            </h1>
                            {user.is_verified && (
                                <FaCheckCircle style={{ color: '#1d9bf0', fontSize: '1.1rem' }} title="Verified" />
                            )}
                        </div>

                        {user.store_name && (
                            <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>{user.name}</p>
                        )}
                        <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
                            {user.department}
                        </p>
                    </div>

                    {message.text && (
                        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 'var(--space-5, 1.25rem)' }}>
                            {message.type === 'success' && <FaCheckCircle />} {message.text}
                        </div>
                    )}

                    {!editing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 1rem)' }}>
                            <ProfileField icon={<FaUser />} label="Name" value={user.name} />
                            <ProfileField icon={<FaStore />} label="Store Name" value={user.store_name || 'Not set'} muted={!user.store_name} />
                            <ProfileField icon={<FaEnvelope />} label="Email" value={user.oau_email} />
                            <ProfileField icon={<FaBuilding />} label="Department" value={user.department} />
                            <ProfileField icon={<FaPhone />} label="Phone" value={user.phone || 'Not set'} muted={!user.phone} />
                            <ProfileField icon={<FaMapMarkerAlt />} label="Address" value={user.address || 'Not set'} muted={!user.address} />

                            {user.bio && (
                                <div style={{ padding: 'var(--space-4, 1rem)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md, 10px)' }}>
                                    <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: 4 }}>Bio</p>
                                    <p style={{ color: 'var(--color-gray-700)' }}>{user.bio}</p>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 'var(--space-3, 0.75rem)', marginTop: 'var(--space-2, 0.5rem)', flexWrap: 'wrap' }}>
                                <button className="btn btn-lg btn-outline" onClick={startEditing} style={{ flex: 1, minWidth: 160 }}>
                                    <FaEdit /> Edit Profile
                                </button>

                                {!user.is_verified && (
                                    <button
                                        className="btn btn-lg"
                                        onClick={() => setShowVerifyForm(!showVerifyForm)}
                                        style={{ flex: 1, minWidth: 160, background: 'linear-gradient(135deg, #1d9bf0, #0066cc)', color: 'white', border: 'none' }}
                                    >
                                        <FaShieldAlt /> Request Verification
                                    </button>
                                )}
                            </div>

                            {/* Verification Form */}
                            {showVerifyForm && (
                                <form onSubmit={handleVerifyRequest} style={{ marginTop: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
                                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                        Why should you be verified?
                                    </label>
                                    <textarea
                                        className="input"
                                        placeholder="e.g. I'm an active seller with 50+ sales, my store is registered..."
                                        value={verifyReason}
                                        onChange={(e) => setVerifyReason(e.target.value)}
                                        rows={3}
                                        required
                                        style={{ marginBottom: 'var(--space-3)' }}
                                    />
                                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                        Upload ID card or portal screenshot (optional)
                                    </label>
                                    <input type="file" accept="image/*" onChange={handleProofUpload} disabled={uploadingProof} />
                                    {uploadingProof && (
                                        <p style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <FaSpinner className="spinner" /> Uploading proof...
                                        </p>
                                    )}
                                    {!uploadingProof && verifyProofUrl && (
                                        <p style={{ color: 'var(--color-success, #059669)', fontSize: 'var(--font-size-sm)', marginTop: 8 }}>
                                            ✅ Proof uploaded
                                        </p>
                                    )}
                                    {verifyProofPreview && (
                                        <img
                                            src={verifyProofPreview}
                                            alt="Verification proof"
                                            style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12, marginTop: 12, border: '1px solid var(--color-gray-200)' }}
                                        />
                                    )}
                                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                        <button type="submit" className="btn btn-primary" disabled={verifying || uploadingProof} style={{ fontSize: '0.85rem' }}>
                                            {verifying ? <><FaSpinner className="spinner" /> Submitting...</> : uploadingProof ? <><FaSpinner className="spinner" /> Uploading proof...</> : <><FaShieldAlt /> Submit Request</>}
                                        </button>
                                        <button type="button" className="btn btn-outline" onClick={() => setShowVerifyForm(false)} style={{ fontSize: '0.85rem' }}>
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div style={{ marginTop: 'var(--space-6)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Your Listings</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Link to="/my-listings" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
                                            View All
                                        </Link>
                                        {loadingProducts && (
                                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                                                <FaSpinner className="spinner" /> Loading...
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {loadingProducts ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-gray-500)' }}>
                                        <FaSpinner className="spinner" /> Loading your listings...
                                    </div>
                                ) : myProducts.length === 0 ? (
                                    <p style={{ color: 'var(--color-gray-500)' }}>You have no listings yet.</p>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
                                        {myProducts.map((p) => {
                                            const cover = p.image_urls?.[0] || p.image_url;
                                            return (
                                                <div key={p.id} style={{ border: '1px solid var(--color-gray-100)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--color-white)' }}>
                                                    <img
                                                        src={cover || 'https://placehold.co/300x200/e5e7eb/9ca3af?text=No+Image'}
                                                        alt={p.title}
                                                        style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                                                        onError={(e) => { e.target.src = 'https://placehold.co/300x200/e5e7eb/9ca3af?text=No+Image'; }}
                                                    />
                                                    <div style={{ padding: 'var(--space-3)' }}>
                                                        <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {p.title}
                                                        </p>
                                                        <p style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', marginBottom: 8 }}>
                                                            {Number(p.price) === 0 ? 'Free' : `₦${Number(p.price).toLocaleString()}`}
                                                        </p>
                                                        <Link
                                                            to={`/listings/${p.id}/edit`}
                                                            className="btn btn-outline"
                                                            style={{ width: '100%', fontSize: '0.75rem', padding: '6px 10px' }}
                                                        >
                                                            Edit Listing
                                                        </Link>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5, 1.25rem)' }}>
                            <div className="input-group">
                                <label htmlFor="name">Name</label>
                                <input id="name" name="name" className="input" value={form.name} onChange={handleChange} required />
                            </div>

                            <div className="input-group">
                                <label htmlFor="store_name">Store Name</label>
                                <input id="store_name" name="store_name" className="input" placeholder="e.g. OlaBooks Store" value={form.store_name} onChange={handleChange} />
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)', marginTop: 4 }}>
                                    This name will be displayed on your listings instead of your real name.
                                </span>
                            </div>

                            <div className="input-group">
                                <label htmlFor="bio">Bio</label>
                                <textarea id="bio" name="bio" className="input" placeholder="Tell others about yourself..." value={form.bio} onChange={handleChange} rows={3} />
                            </div>

                            <div className="input-group">
                                <label htmlFor="phone">Phone Number</label>
                                <input id="phone" name="phone" className="input" placeholder="e.g. 08012345678" value={form.phone} onChange={handleChange} />
                            </div>

                            <div className="input-group">
                                <label htmlFor="address">Address / Hostel</label>
                                <input id="address" name="address" className="input" placeholder="e.g. Fajuyi Hall, Room 204" value={form.address} onChange={handleChange} />
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--space-3, 0.75rem)' }}>
                                <button type="submit" className="btn btn-lg btn-primary" disabled={saving} style={{ flex: 1 }}>
                                    {saving ? <><FaSpinner className="spinner" /> Saving...</> : <><FaSave /> Save Changes</>}
                                </button>
                                <button type="button" className="btn btn-lg btn-outline" onClick={() => setEditing(false)} style={{ flex: 1 }}>
                                    <FaTimes /> Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

function ProfileField({ icon, label, value, muted }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3, 0.75rem)', padding: '12px 0', borderBottom: '1px solid var(--color-gray-100)' }}>
            <span style={{ color: 'var(--color-primary)', fontSize: '1rem', width: 20, flexShrink: 0 }}>{icon}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ color: muted ? 'var(--color-gray-400)' : 'var(--color-gray-700)', fontStyle: muted ? 'italic' : 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{value}</p>
            </div>
        </div>
    );
}

export default ProfilePage;
