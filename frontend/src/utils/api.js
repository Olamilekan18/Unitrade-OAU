const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export async function fetchProducts() {
  const response = await fetch(`${API_BASE_URL}/products`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to load products');
  return response.json();
}

export async function createListing(formData) {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(formData)
  });

  if (!response.ok) {
    const payload = await response.json();
    throw new Error(payload.message || 'Failed to create listing');
  }

  return response.json();
}
