import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaSpinner,
  FaUsers,
  FaUserClock,
  FaBoxes,
  FaClipboardList,
  FaBullhorn,
  FaShieldAlt,
  FaChartBar,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  fetchAdminSummary,
  fetchAdminUsers,
  fetchAccessRequests,
  fetchVerificationRequests,
  adminApproveUser,
  adminVerifyUser,
  adminUnverifyUser,
  adminBlockUser,
  adminSuspendUser,
  adminSetRole,
  fetchAdminProducts,
  adminUpdateProductStatus,
  adminDeleteProduct,
  fetchAdminOrders,
  fetchAuditLogs,
  sendPromotion,
  fetchAdminConversations,
  fetchAdminConversationMessages,
  fetchAdminMessageReports,
  fetchAdminConversationReports,
  fetchAdminAccountReports,
} from '../utils/api';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'access', label: 'Access Requests' },
  { id: 'verification', label: 'Verification Requests' },
  { id: 'listings', label: 'Listings' },
  { id: 'orders', label: 'Orders' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'messages', label: 'Messages' },
  { id: 'reports', label: 'Reports' },
  { id: 'logs', label: 'Activity Log' },
];

function AdminDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [adminConversations, setAdminConversations] = useState([]);
  const [activeAdminConv, setActiveAdminConv] = useState(null);
  const [adminConvMessages, setAdminConvMessages] = useState([]);
  const [adminChatLoading, setAdminChatLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [conversationReports, setConversationReports] = useState([]);
  const [accountReports, setAccountReports] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: '' });
  const [userSearch, setUserSearch] = useState('');
  const [promo, setPromo] = useState({ title: '', message: '', audience: 'all', userIds: '', sendEmail: false });
  const [promoResult, setPromoResult] = useState('');
  const [promoSending, setPromoSending] = useState(false);
  const [actioning, setActioning] = useState({});
  const [signupRange, setSignupRange] = useState('7d');
  const [suspendDays, setSuspendDays] = useState({});
  const [userAction, setUserAction] = useState({});
  const [productAction, setProductAction] = useState({});
  const [accessAction, setAccessAction] = useState({});

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    loadOverview();
  }, [isAuthenticated, isAdmin]);

  function isUserSuspended(userRow) {
    if (!userRow?.suspended_until) return false;
    const until = new Date(userRow.suspended_until);
    if (Number.isNaN(until.getTime())) return false;
    return until > new Date();
  }

  function getUserStatus(userRow) {
    if (userRow.is_blocked) {
      return { label: 'blocked', tone: 'danger' };
    }
    if (isUserSuspended(userRow)) {
      return { label: 'suspended', tone: 'warning' };
    }
    if (userRow.access_status && userRow.access_status !== 'approved') {
      return {
        label: userRow.access_status,
        tone: userRow.access_status === 'pending' ? 'warning' : 'danger',
      };
    }
    if (userRow.is_verified) {
      return { label: 'verified', tone: 'success' };
    }
    return { label: 'approved', tone: 'success' };
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
  }

  async function loadOverview() {
    try {
      setStatus({ loading: true, error: '' });
      const res = await fetchAdminSummary();
      setSummary(res.data);
      setStatus({ loading: false, error: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
  }

  async function loadUsers() {
    try {
      setStatus({ loading: true, error: '' });
      const res = await fetchAdminUsers({ search: userSearch || undefined });
      setUsers(res.data || []);
      setStatus({ loading: false, error: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
  }

  async function loadAccessRequests() {
    try {
      setStatus({ loading: true, error: '' });
      const res = await fetchAccessRequests();
      setAccessRequests(res.data || []);
      setStatus({ loading: false, error: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
  }

  async function loadVerificationRequests() {
    try {
      setStatus({ loading: true, error: '' });
      const res = await fetchVerificationRequests();
      setVerificationRequests(res.data || []);
      setStatus({ loading: false, error: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
  }

  async function loadProducts() {
    try {
      setStatus({ loading: true, error: '' });
      const res = await fetchAdminProducts();
      setProducts(res.data || []);
      setStatus({ loading: false, error: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
  }

  async function loadOrders() {
    try {
      setStatus({ loading: true, error: '' });
      const res = await fetchAdminOrders();
      setOrders(res.data || []);
      setStatus({ loading: false, error: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
  }

  async function loadLogs() {
    try {
      setStatus({ loading: true, error: '' });
      const res = await fetchAuditLogs();
      setLogs(res.data || []);
      setStatus({ loading: false, error: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
  }

  async function loadMessages() {
    try {
      setStatus({ loading: true, error: '' });
      const res = await fetchAdminConversations();
      setAdminConversations(res.data || []);
      setStatus({ loading: false, error: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
  }

  async function openAdminConversation(conv) {
    try {
      setActiveAdminConv(conv);
      setAdminChatLoading(true);
      const res = await fetchAdminConversationMessages(conv.id);
      setAdminConvMessages(res.data || []);
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    } finally {
      setAdminChatLoading(false);
    }
  }

  async function loadReports() {
    try {
      setStatus({ loading: true, error: '' });
      const [messageRes, convoRes, accountRes] = await Promise.all([
        fetchAdminMessageReports(),
        fetchAdminConversationReports(),
        fetchAdminAccountReports()
      ]);
      setReports(messageRes.data || []);
      setConversationReports(convoRes.data || []);
      setAccountReports(accountRes.data || []);
      setStatus({ loading: false, error: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'access') loadAccessRequests();
    if (activeTab === 'verification') loadVerificationRequests();
    if (activeTab === 'listings') loadProducts();
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'logs') loadLogs();
    if (activeTab === 'messages') loadMessages();
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'overview') loadOverview();
  }, [activeTab, isAuthenticated, isAdmin]);

  const chartSeries = useMemo(() => {
    if (!summary?.signupsDaily) return [];
    const days = signupRange === '7d' ? 7 : signupRange === '30d' ? 30 : signupRange === '6m' ? 182 : 365;
    const step = days <= 30 ? 1 : days <= 182 ? 7 : 30;
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const dailyMap = new Map(summary.signupsDaily.map((d) => [d.date, d.count]));
    const buckets = [];
    for (let i = 0; i < days; i += step) {
      const bucketStart = new Date(start);
      bucketStart.setDate(bucketStart.getDate() + i);
      let total = 0;
      for (let j = 0; j < step && i + j < days; j++) {
        const d = new Date(bucketStart);
        d.setDate(d.getDate() + j);
        const key = d.toISOString().slice(0, 10);
        total += dailyMap.get(key) || 0;
      }
      const label = `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`;
      buckets.push({ date: bucketStart.toISOString().slice(0, 10), count: total, label });
    }

    return buckets;
  }, [summary, signupRange]);

  const chartPoints = useMemo(() => {
    if (!chartSeries.length) return { points: '', labels: [], max: 1, coords: [] };
    const max = Math.max(...chartSeries.map((d) => d.count), 1);
    const width = 600;
    const height = 180;
    const pad = 16;
    const stepX = chartSeries.length > 1 ? (width - pad * 2) / (chartSeries.length - 1) : 0;
    const coords = chartSeries.map((d, i) => {
      const x = pad + stepX * i;
      const y = height - pad - (d.count / max) * (height - pad * 2);
      return { x, y, count: d.count };
    });
    return {
      points: coords.map((c) => `${c.x},${c.y}`).join(' '),
      labels: chartSeries.map((d) => d.label),
      max,
      coords,
    };
  }, [chartSeries]);

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <div className="auth-card fade-in-up" style={{ textAlign: 'center' }}>
          <h1>Admin Login</h1>
          <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)' }}>
            Please log in with an admin account.
          </p>
          <Link to="/login" className="btn btn-primary btn-lg">Log In</Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="auth-page">
        <div className="auth-card fade-in-up" style={{ textAlign: 'center' }}>
          <h1>Admin Access Required</h1>
          <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)' }}>
            Your account does not have admin permissions.
          </p>
          <Link to="/" className="btn btn-outline btn-lg">Back to Home</Link>
        </div>
      </div>
    );
  }

  async function handleApprove(id) {
    setActioning((prev) => ({ ...prev, [id]: true }));
    try {
      await adminApproveUser(id);
      setAccessRequests((prev) => prev.filter((req) => req.id !== id));
      setAccessAction((prev) => ({ ...prev, [id]: '' }));
      await loadAccessRequests();
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    } finally {
      setActioning((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleVerify(id) {
    setActioning((prev) => ({ ...prev, [id]: true }));
    try {
      await adminVerifyUser(id);
      if (activeTab === 'users') await loadUsers();
      if (activeTab === 'verification') await loadVerificationRequests();
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    } finally {
      setActioning((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleUnverify(id) {
    setActioning((prev) => ({ ...prev, [id]: true }));
    try {
      await adminUnverifyUser(id);
      if (activeTab === 'users') await loadUsers();
      if (activeTab === 'verification') await loadVerificationRequests();
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    } finally {
      setActioning((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleBlock(id, isBlocked) {
    setActioning((prev) => ({ ...prev, [id]: true }));
    try {
      await adminBlockUser(id, isBlocked);
      await loadUsers();
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    } finally {
      setActioning((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleSuspend(id, daysValue) {
    setActioning((prev) => ({ ...prev, [id]: true }));
    try {
      if (!daysValue) {
        await adminSuspendUser(id, null);
      } else {
        const until = new Date();
        until.setDate(until.getDate() + Number(daysValue));
        await adminSuspendUser(id, until.toISOString());
      }
      await loadUsers();
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    } finally {
      setActioning((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleRoleChange(id, role) {
    setActioning((prev) => ({ ...prev, [id]: true }));
    try {
      await adminSetRole(id, role);
      await loadUsers();
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    } finally {
      setActioning((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleProductStatus(id, statusValue) {
    setActioning((prev) => ({ ...prev, [id]: true }));
    try {
      await adminUpdateProductStatus(id, statusValue);
      await loadProducts();
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    } finally {
      setActioning((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleDeleteProduct(id) {
    const confirmed = window.confirm('Delete this listing? This cannot be undone.');
    if (!confirmed) return;
    setActioning((prev) => ({ ...prev, [id]: true }));
    try {
      await adminDeleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    } finally {
      setActioning((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function handleUserAction(id) {
    const action = userAction[id];
    if (!action) return;

    if (action === 'verify') {
      await handleVerify(id);
      return;
    }
    if (action === 'unverify') {
      await handleUnverify(id);
      return;
    }
    if (action === 'block') {
      await handleBlock(id, true);
      return;
    }
    if (action === 'unblock') {
      await handleBlock(id, false);
      return;
    }
    if (action === 'suspend') {
      await handleSuspend(id, suspendDays[id]);
      return;
    }
    if (action === 'unsuspend' || action === 'clear_suspension') {
      await handleSuspend(id, null);
      return;
    }
  }

  async function handleProductAction(id, currentStatus) {
    const action = productAction[id];
    if (!action) return;
    if (action === 'toggle_status') {
      await handleProductStatus(id, currentStatus === 'available' ? 'sold' : 'available');
    }
    if (action === 'delete') {
      await handleDeleteProduct(id);
    }
  }

  async function handleAccessAction(id) {
    const action = accessAction[id];
    if (!action) return;
    if (action === 'approve') {
      await handleApprove(id);
    }
  }

  async function handleSendPromo(e) {
    e.preventDefault();
    setPromoResult('');
    try {
      setPromoSending(true);
      const payload = {
        title: promo.title,
        message: promo.message,
        audience: promo.audience,
        userIds: promo.userIds
          ? promo.userIds.split(',').map((v) => v.trim()).filter(Boolean)
          : undefined,
        sendEmail: promo.sendEmail,
      };
      const res = await sendPromotion(payload);
      const sentNow = res.data.sentNow ?? 0;
      const queued = res.data.queued ?? res.data.count ?? 0;
      const failedNow = res.data.failedNow ?? 0;
      const baseMsg = `Promotion queued for ${queued} users. Sent now: ${sentNow}. Failed: ${failedNow}.`;
      const emailErr = res.data.emailError ? ` Email error: ${res.data.emailError}` : '';
      setPromoResult(baseMsg + emailErr);
      setPromo({ title: '', message: '', audience: 'all', userIds: '', sendEmail: false });
    } catch (err) {
      setPromoResult(err.message);
    } finally {
      setPromoSending(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="container admin-container">
        <div className="admin-header">
          <div>
            <p className="admin-eyebrow">Admin Console</p>
            <h1>UniTrade Admin Dashboard</h1>
            <p>Manage access, listings, users, and platform health.</p>
          </div>
          <div className="admin-role">
            <FaShieldAlt />
            <span>{user.role.replace('_', ' ')}</span>
          </div>
        </div>

        <div className="admin-layout">
          <aside className="admin-side">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </aside>

          <div className="admin-content">
            {status.error && (
              <div className="alert alert-error" style={{ marginBottom: 'var(--space-6)' }}>
                {status.error}
              </div>
            )}

            {status.loading ? (
              <div className="admin-loading">
                <FaSpinner className="spinner" /> Loading...
              </div>
            ) : (
              <>
                {activeTab === 'overview' && summary && (
                  <div className="admin-grid">
                    <div className="admin-card">
                      <div className="admin-card-icon"><FaUsers /></div>
                      <div>
                        <p>Total Users</p>
                        <h3>{summary.totals.users}</h3>
                      </div>
                    </div>
                    <div className="admin-card">
                      <div className="admin-card-icon"><FaUserClock /></div>
                      <div>
                        <p>Pending Access</p>
                        <h3>{summary.totals.pending_access}</h3>
                      </div>
                    </div>
                    <div className="admin-card">
                      <div className="admin-card-icon"><FaBoxes /></div>
                      <div>
                        <p>Active Listings</p>
                        <h3>{summary.totals.active_listings}</h3>
                      </div>
                    </div>
                    <div className="admin-card">
                      <div className="admin-card-icon"><FaClipboardList /></div>
                      <div>
                        <p>Total Orders</p>
                        <h3>{summary.totals.orders}</h3>
                      </div>
                    </div>
                    <div className="admin-card">
                      <div className="admin-card-icon"><FaChartBar /></div>
                      <div>
                        <p>Total Bids</p>
                        <h3>{summary.totals.bids}</h3>
                      </div>
                    </div>

                    <div className="admin-chart">
                      <div className="admin-chart-header">
                        <div>
                          <h3>Signups</h3>
                          <p>New account creations</p>
                        </div>
                        <div className="admin-chart-filters">
                          <button className={`btn btn-outline ${signupRange === '7d' ? 'active' : ''}`} onClick={() => setSignupRange('7d')}>7 days</button>
                          <button className={`btn btn-outline ${signupRange === '30d' ? 'active' : ''}`} onClick={() => setSignupRange('30d')}>30 days</button>
                          <button className={`btn btn-outline ${signupRange === '6m' ? 'active' : ''}`} onClick={() => setSignupRange('6m')}>6 months</button>
                          <button className={`btn btn-outline ${signupRange === '1y' ? 'active' : ''}`} onClick={() => setSignupRange('1y')}>1 year</button>
                        </div>
                      </div>
                      <div className="admin-chart-line" style={{ height: '320px', width: '100%', marginTop: '24px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis
                              dataKey="label"
                              stroke="#9ca3af"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              dy={10}
                            />
                            <YAxis
                              stroke="#9ca3af"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => value}
                            />
                            <Tooltip
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                              cursor={{ stroke: '#059669', strokeWidth: 1, strokeDasharray: '4 4' }}
                              labelStyle={{ color: '#111827', fontWeight: 'bold', marginBottom: '4px' }}
                              itemStyle={{ color: '#059669', fontWeight: '600' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="count"
                              name="Signups"
                              stroke="#059669"
                              strokeWidth={4}
                              fillOpacity={1}
                              fill="url(#colorSignups)"
                              animationDuration={1500}
                              activeDot={{ r: 6, strokeWidth: 0, fill: '#059669' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'users' && (
                  <div className="admin-section">
                    <div className="admin-section-header">
                      <h2>Users</h2>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="input"
                          placeholder="Search name or email"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={loadUsers}>Search</button>
                      </div>
                    </div>
                    <div className="admin-table">
                      <div className="admin-table-row admin-table-head admin-table-users">
                        <span>User</span>
                        <span>Role & Joined</span>
                        <span>Stats</span>
                        <span>Status</span>
                        <span>Actions</span>
                      </div>
                      {users.map((u) => (
                        <div key={u.id} className="admin-table-row admin-table-users">
                          <div className="admin-cell" data-label="User">
                            <strong>{u.name}</strong>
                            <p>{u.oau_email}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginTop: '2px', fontFamily: 'monospace' }}>
                              ID: {u.id}
                            </p>
                          </div>

                          <div className="admin-cell" data-label="Role & Joined">
                            {isSuperAdmin ? (
                              <select
                                className="input"
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                disabled={actioning[u.id]}
                                style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="super_admin">Super Admin</option>
                              </select>
                            ) : (
                              <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{u.role.replace('_', ' ')}</span>
                            )}
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: '4px' }}>
                              Joined {formatDate(u.created_at)}
                            </p>
                            <p style={{ fontSize: '0.70rem', color: u.last_login ? 'var(--color-primary-light)' : 'var(--color-gray-400)', marginTop: '2px' }}>
                              Last login: {u.last_login ? formatDate(u.last_login) : 'N/A'}
                            </p>
                          </div>

                          <div className="admin-cell" data-label="Stats">
                            <span style={{ fontWeight: '600', color: 'var(--color-gray-700)' }}>{u.order_count ?? 0} Orders</span>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>{u.product_count ?? 0} Listings</p>
                          </div>

                          <div className="admin-cell" data-label="Status">
                            {(() => {
                              const statusInfo = getUserStatus(u);
                              return (
                                <span className={`admin-pill ${statusInfo.tone}`}>
                                  {statusInfo.label}
                                </span>
                              );
                            })()}
                          </div>

                          <div className="admin-cell admin-actions" data-label="Actions">
                            <select
                              className="input"
                              value={userAction[u.id] || ''}
                              onChange={(e) => setUserAction((prev) => ({ ...prev, [u.id]: e.target.value }))}
                            >
                              <option value="">Select action</option>
                              {!u.is_verified && u.access_status === 'approved' && (
                                <option value="verify">Verify seller</option>
                              )}
                              {u.is_verified && (
                                <option value="unverify">Remove verification</option>
                              )}
                              <option value={u.is_blocked ? 'unblock' : 'block'}>{u.is_blocked ? 'Unblock user' : 'Block user'}</option>
                              <option value="suspend">Suspend user</option>
                              {isUserSuspended(u) && <option value="unsuspend">Unsuspend user</option>}
                            </select>
                            {userAction[u.id] === 'suspend' && (
                              <select
                                className="input"
                                value={suspendDays[u.id] || ''}
                                onChange={(e) => setSuspendDays((prev) => ({ ...prev, [u.id]: e.target.value }))}
                              >
                                <option value="">Select duration</option>
                                <option value="1">1 day</option>
                                <option value="3">3 days</option>
                                <option value="7">7 days</option>
                                <option value="14">14 days</option>
                                <option value="30">30 days</option>
                              </select>
                            )}
                            <button
                              className="btn btn-outline"
                              onClick={() => handleUserAction(u.id)}
                              disabled={actioning[u.id] || !userAction[u.id] || (userAction[u.id] === 'suspend' && !suspendDays[u.id])}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'access' && (
                  <div className="admin-section">
                    <div className="admin-section-header">
                      <h2>Access Requests</h2>
                    </div>
                    <div className="admin-table">
                      <div className="admin-table-row admin-table-head">
                        <span>User</span>
                        <span>Department</span>
                        <span>Actions</span>
                      </div>
                      {accessRequests.map((u) => (
                        <div key={u.id} className="admin-table-row">
                          <div className="admin-cell" data-label="User">
                            <strong>{u.name}</strong>
                            <p>{u.oau_email}</p>
                          </div>
                          <div className="admin-cell" data-label="Department">
                            <span>{u.department}</span>
                          </div>
                          <div className="admin-cell admin-actions" data-label="Actions">
                            <select
                              className="input"
                              value={accessAction[u.id] || ''}
                              onChange={(e) => setAccessAction((prev) => ({ ...prev, [u.id]: e.target.value }))}
                              disabled={actioning[u.id]}
                            >
                              <option value="">Select action</option>
                              <option value="approve">Approve access</option>
                            </select>
                            <button
                              className="btn btn-outline"
                              onClick={() => handleAccessAction(u.id)}
                              disabled={actioning[u.id] || !accessAction[u.id]}
                            >
                              {actioning[u.id] ? <><FaSpinner className="spinner" /> Applying...</> : 'Apply'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'verification' && (
                  <div className="admin-section">
                    <div className="admin-section-header">
                      <h2>Verification Requests</h2>
                    </div>
                    <div className="admin-table">
                      <div className="admin-table-row admin-table-4 admin-table-head">
                        <span>User</span>
                        <span>Reason</span>
                        <span>Proof</span>
                        <span>Actions</span>
                      </div>
                      {verificationRequests.map((req) => (
                        <div key={req.id} className="admin-table-row admin-table-4">
                          <div className="admin-cell" data-label="User">
                            <strong>{req.user?.name || 'User'}</strong>
                            <p>{req.user?.oau_email}</p>
                          </div>
                          <div className="admin-cell" data-label="Reason">
                            <p>{req.reason}</p>
                          </div>
                          <div className="admin-cell" data-label="Proof">
                            {req.proof_url ? (
                              <a href={req.proof_url} target="_blank" rel="noreferrer">View proof</a>
                            ) : (
                              <span className="admin-pill">No proof</span>
                            )}
                          </div>
                          <div className="admin-cell admin-actions" data-label="Actions">
                            <button
                              className="btn btn-outline"
                              onClick={() => handleVerify(req.user?.id)}
                              disabled={actioning[req.user?.id]}
                            >
                              Verify Seller
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'listings' && (
                  <div className="admin-section">
                    <div className="admin-section-header">
                      <h2>Listings</h2>
                    </div>
                    <div className="admin-table">
                      <div className="admin-table-row admin-table-head">
                        <span>Listing</span>
                        <span>Status</span>
                        <span>Seller</span>
                        <span>Actions</span>
                      </div>
                      {products.map((p) => (
                        <div key={p.id} className="admin-table-row">
                          <div className="admin-cell" data-label="Listing">
                            <strong>{p.title}</strong>
                            <p>{p.categories?.name || 'General'} · ₦{Number(p.price).toLocaleString()}</p>
                          </div>
                          <div className="admin-cell" data-label="Status">
                            <span className={`admin-pill ${p.status === 'available' ? 'success' : 'warning'}`}>
                              {p.status}
                            </span>
                          </div>
                          <div className="admin-cell" data-label="Seller">
                            <strong>{p.users?.store_name || p.users?.name || 'Seller'}</strong>
                            <p>{p.users?.oau_email}</p>
                          </div>
                          <div className="admin-cell admin-actions" data-label="Actions">
                            <select
                              className="input"
                              value={productAction[p.id] || ''}
                              onChange={(e) => setProductAction((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            >
                              <option value="">Select action</option>
                              <option value="toggle_status">Mark {p.status === 'available' ? 'Sold' : 'Available'}</option>
                              <option value="delete">Delete listing</option>
                            </select>
                            <button
                              className="btn btn-outline"
                              onClick={() => handleProductAction(p.id, p.status)}
                              disabled={actioning[p.id] || !productAction[p.id]}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div className="admin-section">
                    <div className="admin-section-header">
                      <h2>Orders</h2>
                    </div>
                    <div className="admin-table">
                      <div className="admin-table-row admin-table-head">
                        <span>Order</span>
                        <span>Status</span>
                        <span>Buyer</span>
                        <span>Seller</span>
                      </div>
                      {orders.map((o) => (
                        <div key={o.id} className="admin-table-row">
                          <div className="admin-cell" data-label="Order">
                            <strong>{o.products?.title || 'Order'}</strong>
                            <p>₦{Number(o.amount).toLocaleString()}</p>
                          </div>
                          <div className="admin-cell" data-label="Status">
                            <span className="admin-pill">{o.status}</span>
                          </div>
                          <div className="admin-cell" data-label="Buyer">
                            <strong>{o.buyer?.name || 'Buyer'}</strong>
                            <p>{o.buyer?.oau_email}</p>
                          </div>
                          <div className="admin-cell" data-label="Seller">
                            <strong>{o.seller?.name || 'Seller'}</strong>
                            <p>{o.seller?.oau_email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'promotions' && (
                  <div className="admin-section">
                    <div className="admin-section-header">
                      <h2>Send Promotions</h2>
                    </div>
                    <form onSubmit={handleSendPromo} className="admin-form">
                      <div className="input-group">
                        <label>Title</label>
                        <input
                          className="input"
                          value={promo.title}
                          onChange={(e) => setPromo((prev) => ({ ...prev, title: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label>Message</label>
                        <textarea
                          className="input"
                          rows={4}
                          value={promo.message}
                          onChange={(e) => setPromo((prev) => ({ ...prev, message: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label>Audience</label>
                        <select
                          className="input"
                          value={promo.audience}
                          onChange={(e) => setPromo((prev) => ({ ...prev, audience: e.target.value }))}
                        >
                          <option value="all">All approved users</option>
                          <option value="unverified">Unverified users</option>
                          <option value="pending">Pending access requests</option>
                          <option value="selected">Selected user IDs</option>
                        </select>
                      </div>
                      {promo.audience === 'selected' && (
                        <div className="input-group">
                          <label>User IDs (comma-separated)</label>
                          <input
                            className="input"
                            value={promo.userIds}
                            onChange={(e) => setPromo((prev) => ({ ...prev, userIds: e.target.value }))}
                          />
                        </div>
                      )}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={promo.sendEmail}
                          onChange={(e) => setPromo((prev) => ({ ...prev, sendEmail: e.target.checked }))}
                        />
                        Send email in addition to in-app notification
                      </label>
                      <button className="btn btn-primary" type="submit" disabled={promoSending}>
                        {promoSending ? <><FaSpinner className="spinner" /> Sending...</> : <><FaBullhorn /> Send Promotion</>}
                      </button>
                      {promoResult && <p style={{ color: 'var(--color-gray-600)' }}>{promoResult}</p>}
                    </form>
                  </div>
                )}

                {activeTab === 'logs' && (
                  <div className="admin-section">
                    <div className="admin-section-header">
                      <h2>Activity Log</h2>
                    </div>
                    <div className="admin-table">
                      <div className="admin-table-row admin-table-head">
                        <span>Action</span>
                        <span>Actor</span>
                        <span>Time</span>
                      </div>
                      {logs.map((log) => (
                        <div key={log.id} className="admin-table-row">
                          <div className="admin-cell" data-label="Action">
                            <strong>{log.action}</strong>
                            <p>{log.entity_type} · {log.entity_id || '—'}</p>
                          </div>
                          <div className="admin-cell" data-label="Actor">
                            <strong>{log.actor?.name || 'System'}</strong>
                            <p>{log.actor?.oau_email || ''}</p>
                          </div>
                          <div className="admin-cell" data-label="Time">
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'messages' && (
                  <div className="admin-section">
                    <div className="admin-section-header">
                      <h2>Messages</h2>
                    </div>
                    <div className="admin-chat-grid">
                      <div className="admin-chat-list">
                        {adminConversations.length === 0 ? (
                          <div className="admin-empty">No conversations yet.</div>
                        ) : (
                          adminConversations.map((conv) => {
                            const buyerName = conv.buyer?.name || 'Buyer';
                            const sellerName = conv.seller?.name || 'Seller';
                            const isActive = activeAdminConv?.id === conv.id;
                            return (
                              <button
                                key={conv.id}
                                type="button"
                                className={`admin-chat-item ${isActive ? 'active' : ''}`}
                                onClick={() => openAdminConversation(conv)}
                              >
                                <div className="admin-chat-item-title">
                                  {buyerName} ? {sellerName}
                                </div>
                                <div className="admin-chat-item-sub">
                                  {conv.product?.title || 'Conversation'}
                                </div>
                                <div className="admin-chat-item-preview">
                                  {conv.lastMessage?.content || (conv.lastMessage?.image_url ? '?? Image' : 'No messages yet')}
                                </div>
                                <div className="admin-chat-item-time">
                                  {new Date(conv.updated_at).toLocaleString()}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      <div className="admin-chat-thread">
                        {!activeAdminConv ? (
                          <div className="admin-empty">Select a conversation to view messages.</div>
                        ) : (
                          <>
                            <div className="admin-chat-thread-header">
                              <div>
                                <strong>{activeAdminConv.buyer?.name || 'Buyer'} ? {activeAdminConv.seller?.name || 'Seller'}</strong>
                                <div className="admin-chat-thread-sub">
                                  {activeAdminConv.product?.title || 'Conversation'}
                                </div>
                              </div>
                            </div>
                            <div className="admin-chat-messages">
                              {adminChatLoading ? (
                                <div className="admin-empty">Loading messages...</div>
                              ) : adminConvMessages.length === 0 ? (
                                <div className="admin-empty">No messages yet.</div>
                              ) : (
                                adminConvMessages.map((msg) => (
                                  <div key={msg.id} className="admin-chat-message">
                                    <div className="admin-chat-message-header">
                                      <strong>{msg.sender?.name || 'User'}</strong>
                                      <span>{new Date(msg.created_at).toLocaleString()}</span>
                                    </div>
                                    {msg.image_url && (
                                      <img src={msg.image_url} alt="attachment" className="admin-chat-image" />
                                    )}
                                    {msg.content && <p>{msg.content}</p>}
                                  </div>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;





