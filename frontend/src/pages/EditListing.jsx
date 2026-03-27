import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle, FaCloudUploadAlt, FaImage, FaLink, FaSpinner, FaTimes } from 'react-icons/fa';
import { fetchCategories, fetchProduct, updateListing, uploadImage } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function EditListing() {
  const { id } = useParams();
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    price: '',
    quantity: 1,
    description: '',
    category_id: '',
    is_used: false,
  });
  const [imageUrls, setImageUrls] = useState([]);
  const [imageInputUrl, setImageInputUrl] = useState('');
  const [imageMode, setImageMode] = useState('upload');
  const [isFree, setIsFree] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingListing, setLoadingListing] = useState(true);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [dragging, setDragging] = useState(false);

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
    async function loadListing() {
      try {
        setLoadingListing(true);
        const payload = await fetchProduct(id);
        const listing = payload.data;
        if (!listing?.users?.id || listing.users.id !== user.id) {
          setMessage({ type: 'error', text: 'You can only edit your own listings.' });
          return;
        }
        setForm({
          title: listing.title || '',
          price: listing.price ?? '',
          quantity: listing.quantity ?? 1,
          description: listing.description || '',
          category_id: listing.categories?.id || listing.category_id || '',
          is_used: Boolean(listing.is_used),
        });
        const images = listing.image_urls?.length ? listing.image_urls : listing.image_url ? [listing.image_url] : [];
        setImageUrls(images);
        setIsFree(Number(listing.price) === 0);
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoadingListing(false);
      }
    }
    loadListing();
  }, [id, isAuthenticated, user?.id]);

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
      setMessage({ type: 'error', text: 'Please upload at least one image.' });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        image_urls: imageUrls,
        price: isFree ? 0 : Number(form.price),
        quantity: Math.max(1, Number(form.quantity) || 1),
        category_id: Number(form.category_id),
      };
      await updateListing(id, payload);
      setMessage({ type: 'success', text: 'Listing updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || loadingListing) return null;

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

  return (
    <div className="create-listing-page">
      <div className="container">
        <div className="create-listing-card fade-in-up">
          <Link to="/marketplace" className="btn btn-outline" style={{ width: 'fit-content', marginBottom: 'var(--space-4)' }}>
            <FaArrowLeft /> Back
          </Link>
          <h1>Edit Listing</h1>
          <p className="listing-subtitle">
            Update your listing details and images.
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

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
                  <FaSpinner className="spinner" /> Saving...
                </>
              ) : (
                <>
                  <FaCloudUploadAlt /> Save Changes
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditListing;
