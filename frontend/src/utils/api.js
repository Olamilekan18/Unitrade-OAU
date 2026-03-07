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

export async function createUserReview(userId, data) {
  return apiFetch(`/users/${userId}/reviews`, {
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

/* ── Chat / Conversations ── */
export async function createConversation(sellerId, productId) {
  return apiFetch('/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sellerId, productId }),
  });
}

export async function fetchConversations() {
  return apiFetch('/conversations');
}

export async function fetchMessages(conversationId) {
  return apiFetch(`/conversations/${conversationId}/messages`);
}

export async function sendMessage(conversationId, content, imageUrl = null, offerPrice = null) {
  return apiFetch(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, imageUrl, offerPrice }),
  });
}

export async function acceptOffer(messageId) {
  return apiFetch(`/messages/${messageId}/accept`, { method: 'PUT' });
}

export async function rejectOffer(messageId) {
  return apiFetch(`/messages/${messageId}/reject`, { method: 'PUT' });
}

export async function markConversationRead(conversationId) {
  return apiFetch(`/conversations/${conversationId}/read`, { method: 'PUT' });
}

/* ── Orders ── */
export async function createOrder(productId, offerId = null) {
  return apiFetch('/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, offerId }),
  });
}

export async function verifyPayment(reference) {
  return apiFetch('/orders/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference }),
  });
}

export async function fetchOrders() {
  return apiFetch('/orders');
}

export async function confirmDelivery(orderId) {
  return apiFetch(`/orders/${orderId}/confirm`, { method: 'PUT' });
}

export async function markOrderAsShipped(orderId) {
  return apiFetch(`/orders/${orderId}/shipped`, { method: 'PUT' });
}

export async function checkPurchase(productId) {
  return apiFetch(`/orders/check-purchase/${productId}`);
}

export async function deleteOrder(orderId) {
  return apiFetch(`/orders/${orderId}`, { method: 'DELETE' });
}

/* ── Wallet & Withdrawals ── */
export async function fetchWalletDetails() {
  return apiFetch('/wallet');
}

export async function fetchBanks() {
  return apiFetch('/wallet/banks');
}

export async function resolveBankAccount(accountNumber, bankCode) {
  return apiFetch('/wallet/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountNumber, bankCode }),
  });
}

export async function updateBankDetails(data) {
  return apiFetch('/wallet/bank', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function requestWithdrawal(amount) {
  return apiFetch('/wallet/withdraw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
}
