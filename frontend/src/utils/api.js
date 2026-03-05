const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed');
  }

  return payload;
}

/* ── Products ── */
export async function fetchProducts() {
  return apiFetch('/products');
}

export async function fetchProduct(id) {
  return apiFetch(`/products/${id}`);
}

export async function fetchSellerProducts(sellerId) {
  return apiFetch(`/products/seller/${sellerId}`);
}

export async function createListing(formData) {
  return apiFetch('/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
}

/* ── Categories ── */
export async function fetchCategories() {
  return apiFetch('/categories');
}

/* ── Access Requests (Register) ── */
export async function requestAccess(data) {
  return apiFetch('/access-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/* ── Image Upload ── */
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || 'Image upload failed');
  }

  return payload;
}

/* ── Sessions (Auth) ── */
export async function login(email, password) {
  return apiFetch('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return apiFetch('/sessions', { method: 'DELETE' });
}

export async function getSession() {
  return apiFetch('/sessions/me');
}

/* ── User Profiles ── */
export async function getProfile(userId) {
  return apiFetch(`/users/${userId}`);
}

export async function updateMyProfile(data) {
  return apiFetch('/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/* ── Reviews ── */
export async function fetchReviews(productId) {
  return apiFetch(`/products/${productId}/reviews`);
}

export async function createReview(productId, data) {
  return apiFetch(`/products/${productId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/* ── Verification ── */
export async function requestVerification(reason) {
  return apiFetch('/verification-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

/* ── Notifications ── */
export async function fetchNotifications() {
  return apiFetch('/notifications');
}

export async function markNotificationRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
}

export async function markAllNotificationsRead() {
  return apiFetch('/notifications/read-all', { method: 'PUT' });
}
