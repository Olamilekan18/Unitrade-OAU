import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCloudUploadAlt, FaSpinner, FaCheckCircle, FaLink, FaImage, FaTimes } from 'react-icons/fa';
import { createListing, fetchCategories, uploadImage } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function CreateListing() {
  const [form, setForm] = useState({
    title: '',
    price: '',
    quantity: 1,
    description: '',
    category_id: '',
    image_url: '',
  });
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [imageMode, setImageMode] = useState('upload');
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const { isAuthenticated, loading } = useAuth();
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

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function processFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file.' });
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      setUploading(true);
      setMessage({ type: '', text: '' });
      const payload = await uploadImage(file);
      setForm((prev) => ({ ...prev, image_url: payload.data.url }));
      setMessage({ type: 'success', text: 'Image uploaded successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e) {
    processFile(e.target.files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragging(false);
  }

  function clearImage() {
    setForm((prev) => ({ ...prev, image_url: '' }));
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!form.image_url) {
      setMessage({ type: 'error', text: 'Please upload an image or provide a URL.' });
      return;
    }

    try {
      setSubmitting(true);
      await createListing({
        ...form,
        price: Number(form.price),
        quantity: Math.max(1, Number(form.quantity) || 1),
        category_id: Number(form.category_id),
      });
      setMessage({ type: 'success', text: 'Listing published successfully!' });
      setForm({ title: '', price: '', quantity: 1, description: '', category_id: '', image_url: '' });
      setPreviewUrl('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

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
                required
              />
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
              <label>Product Image</label>
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
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  {/* Custom drop zone */}
                  {!previewUrl && !form.image_url && (
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
                <input
                  id="image_url"
                  name="image_url"
                  type="url"
                  className="input"
                  placeholder="Paste an image URL"
                  value={form.image_url}
                  onChange={(e) => {
                    handleChange(e);
                    setPreviewUrl(e.target.value);
                  }}
                />
              )}

              {/* Image Preview */}
              {(previewUrl || form.image_url) && (
                <div
                  style={{
                    position: 'relative',
                    marginTop: '12px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid var(--color-gray-200)',
                  }}
                >
                  <img
                    src={previewUrl || form.image_url}
                    alt="Preview"
                    style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={clearImage}
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
        </div>
      </div>
    </div>
  );
}

export default CreateListing;
