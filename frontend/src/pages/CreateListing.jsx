import { useState } from 'react';
import { FaCloudUploadAlt, FaSpinner } from 'react-icons/fa';
import { createListing } from '../utils/api';

function CreateListing() {
  const [form, setForm] = useState({ title: '', price: '', image_url: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    try {
      setSubmitting(true);
      await createListing({ ...form, price: Number(form.price) });
      setMessage('Listing created successfully.');
      setForm({ title: '', price: '', image_url: '' });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="listing-form" onSubmit={handleSubmit}>
      <h2>Create Listing</h2>
      <label htmlFor="title">Title</label>
      <input id="title" name="title" value={form.title} onChange={handleChange} required />

      <label htmlFor="price">Price (₦)</label>
      <input id="price" name="price" type="number" min="0" value={form.price} onChange={handleChange} required />

      <label htmlFor="image_url">Image URL (Supabase Storage public URL)</label>
      <input id="image_url" name="image_url" value={form.image_url} onChange={handleChange} required />

      <button type="submit" disabled={submitting}>
        {submitting ? <FaSpinner className="spin" /> : <FaCloudUploadAlt />} {submitting ? 'Submitting...' : 'Publish Listing'}
      </button>

      {message && <p className="form-message">{message}</p>}
    </form>
  );
}

export default CreateListing;
