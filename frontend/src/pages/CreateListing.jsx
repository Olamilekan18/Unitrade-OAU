import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { FaCloudUploadAlt, FaSpinner, FaCheckCircle, FaLink, FaImage, FaTimes } from 'react-icons/fa';
import { createListing, fetchCategories, fetchMyProducts, uploadImage } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ImageWithFallback from '../components/ImageWithFallback';

function CreateListing() {
  const [form, setForm] = useState({
    title: '',
    price: '',
    quantity: 1,
    description: '',
    category_id: '',
    is_used: false,
  });
  const [isFree, setIsFree] = useState(false);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [imageMode, setImageMode] = useState('upload');
  const [imageUrls, setImageUrls] = useState([]);
  const [imageInputUrl, setImageInputUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [myProducts, setMyProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [toast, setToast] = useState({ open: false, link: '', copied: false, productId: null });
  const fileInputRef = useRef(null);
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const payload = await fetchCategories();
        setCategories(payload.data || []);
      } catch {
        // Silently fail
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
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
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!toast.open) return;
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false, copied: false }));
    }, 10000);
    return () => clearTimeout(timer);
  }, [toast.open]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    if (name === 'price') {
      const numericValue = Number(value);
      if (!Number.isNaN(numericValue) && numericValue > 0) {
        setIsFree(false);
      }
    }
  }

  async function processFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file.' });
      return;
    }

    try {
      setUploadingCount((count) => count + 1);
      setMessage({ type: '', text: '' });
      const payload = await uploadImage(file);
      setImageUrls((prev) => {
        if (prev.length >= 3) return prev;
        if (prev.includes(payload.data.url)) return prev;
        return [...prev, payload.data.url].slice(0, 3);
      });
      setMessage({ type: 'success', text: 'Image uploaded successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploadingCount((count) => Math.max(0, count - 1));
    }
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    const available = Math.max(0, 3 - imageUrls.length);
    files.slice(0, available).forEach(processFile);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    const available = Math.max(0, 3 - imageUrls.length);
    files.slice(0, available).forEach(processFile);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragging(false);
  }

  function removeImage(index) {
    setImageUrls((prev) => prev.filter((_, idx) => idx !== index));
  }

  function addImageUrl() {
    const trimmed = imageInputUrl.trim();
    if (!trimmed) return;
    if (imageUrls.length >= 3) {
      setMessage({ type: 'error', text: 'You can upload up to 3 images.' });
      return;
    }
    setImageUrls((prev) => [...prev, trimmed].slice(0, 3));
    setImageInputUrl('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!imageUrls.length) {
      setMessage({ type: 'error', text: 'Please upload an image or provide a URL.' });
      return;
    }

    try {
      setSubmitting(true);
      const created = await createListing({
        ...form,
        image_urls: imageUrls,
        price: isFree ? 0 : Number(form.price),
        quantity: Math.max(1, Number(form.quantity) || 1),
        category_id: Number(form.category_id),
      });
      const createdId = created?.data?.id;
      if (createdId) {
        const shareLink = `${window.location.origin}/product/${createdId}`;
        setToast({ open: true, link: shareLink, copied: false, productId: createdId });
      }
      setMessage({ type: '', text: '' });
      setForm({ title: '', price: '', quantity: 1, description: '', category_id: '', is_used: false });
      setIsFree(false);
      setImageUrls([]);
      setImageInputUrl('');
      const productPayload = await fetchMyProducts();
      setMyProducts(productPayload.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  const uploading = uploadingCount > 0;

  const dropZoneStyle = {
    border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--color-gray-300)'}`,
    borderRadius: '12px',
    padding: '32px 16px',
    textAlign: 'center',
    cursor: uploading ? 'wait' : 'pointer',
    background: dragging ? 'var(--color-primary-50)' : 'var(--color-gray-50)',
    transition: 'all 0.2s ease',
  };

  const imageFallback = 'https://placehold.co/300x200/e5e7eb/9ca3af?text=No+Image';

  async function handleCopyLink() {
    if (!toast.link) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(toast.link);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = toast.link;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      setToast((prev) => ({ ...prev, copied: true }));
    } catch {
      setToast((prev) => ({ ...prev, copied: false }));
    }
  }

  return (
    <div className="create-listing-page">
      {toast.open && (
        <div className="toast toast-success">
          <div className="toast-header">
            <span className="toast-title">
              <FaCheckCircle /> Live now
            </span>
            <button
              type="button"
              className="toast-close"
              onClick={() => setToast((prev) => ({ ...prev, open: false }))}
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>
          <p className="toast-text">Your listing is live in the marketplace.</p>
          <div className="toast-actions">
            <input
              className="input toast-input"
              readOnly
              value={toast.link}
              onFocus={(e) => e.target.select()}
            />
            <div className="toast-buttons">
              <button type="button" className="btn btn-outline" onClick={handleCopyLink}>
                <FaLink /> Copy link
              </button>
              {toast.productId && (
                <Link to={`/product/${toast.productId}`} className="btn btn-primary">
                  View listing
                </Link>
              )}
            </div>
            {toast.copied && <span className="toast-note">Link copied</span>}
          </div>
        </div>
      )}
      <div className="container">
        <div className="create-listing-card fade-in-up">
          <h1>Create a Listing</h1>
          <p className="listing-subtitle">
            Fill in the details below to publish your item to the marketplace.
          </p>

          {message.text && (
            <div
              className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}
              style={{ marginBottom: 'var(--space-5, 1.25rem)' }}
            >
              {message.type === 'success' && <FaCheckCircle />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                name="title"
                type="text"
                className="input"
                placeholder="e.g. Engineering Mathematics Textbook"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="price">Price (₦)</label>
              <input
                id="price"
                name="price"
                type="number"
                min="0"
                className="input"
                placeholder="e.g. 3500"
                value={form.price}
                onChange={handleChange}
                required={!isFree}
                disabled={isFree}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input
                  id="freeItem"
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsFree(checked);
                    setForm((prev) => ({ ...prev, price: checked ? '0' : '' }));
                  }}
                />
                <label htmlFor="freeItem" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
                  Mark this item as free
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input
                  id="usedItem"
                  name="is_used"
                  type="checkbox"
                  checked={Boolean(form.is_used)}
                  onChange={handleChange}
                />
                <label htmlFor="usedItem" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
                  Mark as used
                </label>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="quantity">Quantity Available</label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                className="input"
                placeholder="e.g. 1"
                value={form.quantity}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="category_id">Category</label>
              <select
                id="category_id"
                name="category_id"
                className="input"
                value={form.category_id}
                onChange={handleChange}
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                className="input"
                placeholder="Describe your item — condition, reason for selling, etc."
                value={form.description}
                onChange={handleChange}
                rows={4}
              />
            </div>

            {/* Image Mode Toggle */}
            <div className="input-group">
              <label>Product Images (up to 3)</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  type="button"
                  className={`btn ${imageMode === 'upload' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setImageMode('upload')}
                  style={{ flex: 1, fontSize: '0.85rem', padding: '8px' }}
                >
                  <FaImage /> Upload File
                </button>
                <button
                  type="button"
                  className={`btn ${imageMode === 'url' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setImageMode('url')}
                  style={{ flex: 1, fontSize: '0.85rem', padding: '8px' }}
                >
                  <FaLink /> Paste URL
                </button>
              </div>

              {imageMode === 'upload' ? (
                <>
                  {/* Hidden real file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  {/* Custom drop zone */}
                  {imageUrls.length < 3 && (
                    <div
                      style={dropZoneStyle}
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                    >
                      {uploading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
                          <FaSpinner className="spinner" style={{ fontSize: '2rem' }} />
                          <span style={{ fontWeight: 600 }}>Uploading...</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <FaCloudUploadAlt style={{ fontSize: '2.5rem', color: 'var(--color-gray-400)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--color-gray-700)' }}>
                            Click to upload or drag & drop
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)' }}>
                            PNG, JPG, WEBP up to 5MB
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="image_url"
                    name="image_url"
                    type="url"
                    className="input"
                    placeholder="Paste an image URL"
                    value={imageInputUrl}
                    onChange={(e) => setImageInputUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={addImageUrl}
                    disabled={imageUrls.length >= 3}
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Image Preview */}
              {imageUrls.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 12 }}>
                  {imageUrls.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      style={{
                        position: 'relative',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid var(--color-gray-200)',
                      }}
                    >
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-lg btn-primary"
              disabled={submitting || uploading}
            >
              {submitting ? (
                <>
                  <FaSpinner className="spinner" /> Publishing...
                </>
              ) : (
                <>
                  <FaCloudUploadAlt /> Publish Listing
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: 'var(--space-10)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
                {[1, 2, 3].map((n) => (
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
            ) : myProducts.length === 0 ? (
              <p style={{ color: 'var(--color-gray-500)' }}>You have no listings yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
                {myProducts.map((p) => {
                  const cover = p.image_urls?.[0] || p.image_url;
                  return (
                    <div key={p.id} style={{ border: '1px solid var(--color-gray-100)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--color-white)' }}>
                      <ImageWithFallback
                        src={cover}
                        alt={p.title}
                        fallbackSrc={imageFallback}
                        wrapperStyle={{ width: '100%', height: 140 }}
                        imgStyle={{ objectFit: 'cover' }}
                      />
                      <div style={{ padding: 'var(--space-3)' }}>
                        <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </p>
                        <p style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', marginBottom: 8 }}>
                          {Number(p.price) === 0 ? 'Free' : `₦${Number(p.price).toLocaleString()}`}
                        </p>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginBottom: 8 }}>
                          Condition: {p.is_used ? 'Used' : 'New'}
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
      </div>
    </div>
  );
}

export default CreateListing;
