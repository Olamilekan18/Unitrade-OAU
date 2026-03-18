const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

async function apiFetch(endpoint, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: 'include',
      ...options,
    });
  } catch (err) {
    throw new Error('Network error. Please check your connection and try again.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed. Please try again.');
  }

  return payload;
}

/* ── Products ── */
export async function fetchProducts(params = {}) {
  const filtered = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
  const query = new URLSearchParams(filtered).toString();
  return apiFetch(`/products${query ? `?${query}` : ''}`);
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

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/uploads`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
  } catch {
    throw new Error('Network error. Unable to upload right now.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || 'Image upload failed. Please try again.');
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
export async function requestVerification(payload) {
  return apiFetch('/verification-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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

export async function deleteNotification(id) {
  return apiFetch(`/notifications/${id}`, { method: 'DELETE' });
}

export async function deleteAllNotifications() {
  return apiFetch('/notifications', { method: 'DELETE' });
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

export async function reportMessage(messageId, reason) {
  return apiFetch(`/messages/${messageId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

export async function reportConversation(conversationId, reason) {
  return apiFetch(`/conversations/${conversationId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

export async function reportUser(userId, reason) {
  return apiFetch(`/users/${userId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

export async function markConversationRead(conversationId) {
  return apiFetch(`/conversations/${conversationId}/read`, { method: 'PUT' });
}

/* ── Admin: Messages & Reports ── */
export async function fetchAdminMessages(params = {}) {
  const filtered = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
  const query = new URLSearchParams(filtered).toString();
  return apiFetch(`/admin/messages${query ? `?${query}` : ''}`);
}

export async function fetchAdminMessageReports() {
  return apiFetch('/admin/message-reports');
}

export async function fetchAdminConversations() {
  return apiFetch('/admin/conversations');
}

export async function fetchAdminConversationMessages(conversationId) {
  return apiFetch(`/admin/conversations/${conversationId}/messages`);
}

export async function fetchAdminConversationReports() {
  return apiFetch('/admin/conversation-reports');
}

export async function fetchAdminAccountReports() {
  return apiFetch('/admin/account-reports');
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

export async function markOrderAsDelivered(orderId) {
  return apiFetch(`/orders/${orderId}/seller-delivered`, { method: 'PUT' });
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

/* â”€â”€ Admin â”€â”€ */
export async function fetchAdminSummary() {
  return apiFetch('/admin/summary');
}

export async function fetchAdminUsers(params = {}) {
  const filtered = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
  const query = new URLSearchParams(filtered).toString();
  return apiFetch(`/admin/users${query ? `?${query}` : ''}`);
}

export async function fetchAccessRequests() {
  return apiFetch('/admin/access-requests');
}

export async function fetchVerificationRequests() {
  return apiFetch('/admin/verification-requests');
}

export async function adminApproveUser(userId) {
  return apiFetch(`/admin/users/${userId}/approve`, { method: 'PUT' });
}

export async function adminVerifyUser(userId) {
  return apiFetch(`/admin/users/${userId}/verify`, { method: 'PUT' });
}

export async function adminBlockUser(userId, is_blocked) {
  return apiFetch(`/admin/users/${userId}/block`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_blocked }),
  });
}

export async function adminSuspendUser(userId, suspended_until) {
  return apiFetch(`/admin/users/${userId}/suspend`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suspended_until }),
  });
}

export async function adminSetRole(userId, role) {
  return apiFetch(`/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
}

export async function fetchAdminProducts() {
  return apiFetch('/admin/products');
}

export async function adminUpdateProductStatus(productId, status) {
  return apiFetch(`/admin/products/${productId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function adminDeleteProduct(productId) {
  return apiFetch(`/admin/products/${productId}`, { method: 'DELETE' });
}

export async function fetchAdminOrders() {
  return apiFetch('/admin/orders');
}

export async function fetchAuditLogs() {
  return apiFetch('/admin/audit-logs');
}

export async function sendPromotion(payload) {
  return apiFetch('/admin/promotions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/* â”€â”€ Bids â”€â”€ */
export async function fetchBidCount(productId) {
  return apiFetch(`/bids/product/${productId}/count`);
}

export async function fetchMyBid(productId) {
  return apiFetch(`/bids/product/${productId}/mine`);
}

export async function createBid(productId, note) {
  return apiFetch('/bids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, note }),
  });
}

export async function fetchSellerBids() {
  return apiFetch('/bids/seller');
}

export async function acceptBid(bidId) {
  return apiFetch(`/bids/${bidId}/accept`, { method: 'PUT' });
}

export async function updateBid(bidId, note) {
  return apiFetch(`/bids/${bidId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
}
