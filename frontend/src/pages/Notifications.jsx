import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBell,
  FaCheckCircle,
  FaShieldAlt,
  FaInfoCircle,
  FaStar,
  FaSpinner,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  deleteAllNotifications,
} from '../utils/api';

function Notifications() {
  const { isAuthenticated, loading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotifications();
  }, [isAuthenticated]);

  async function loadNotifications() {
    try {
      setStatus({ loading: true, error: '' });
      const res = await fetchNotifications();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
      setStatus({ loading: false, error: '' });
    } catch (err) {
      setStatus({ loading: false, error: err.message });
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Silently fail
    }
  }

  async function handleMarkRead(id) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch {
      // Silently fail
    }
  }

  async function handleDelete(id) {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const deleted = notifications.find((n) => n.id === id);
      if (deleted && !deleted.is_read) {
        setUnreadCount((prev) => Math.max(prev - 1, 0));
      }
    } catch {
      // Silently fail
    }
  }

  async function handleDeleteAll() {
    try {
      await deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }

  const notifIcon = {
    approval: <FaCheckCircle style={{ color: '#059669', flexShrink: 0 }} />,
    verification: <FaShieldAlt style={{ color: '#1d9bf0', flexShrink: 0 }} />,
    review: <FaStar style={{ color: '#f59e0b', flexShrink: 0 }} />,
    info: <FaInfoCircle style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />,
  };

  if (loading) return null;

  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <div className="auth-card fade-in-up" style={{ textAlign: 'center' }}>
          <h1>Notifications</h1>
          <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)' }}>
            Please log in to view your notifications.
          </p>
          <Link to="/login" className="btn btn-primary btn-lg">Log In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="container notifications-container">
        <div className="notifications-header">
          <div>
            <p className="notifications-eyebrow">Updates</p>
            <h1>Notifications</h1>
            <p>Stay on top of approvals, reviews, and system updates.</p>
          </div>
          <div className="notifications-actions">
            <span className="notifications-unread">
              <FaBell /> {unreadCount} unread
            </span>
            <button className="btn btn-outline" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
              Mark all read
            </button>
            <button className="btn btn-ghost" onClick={handleDeleteAll} disabled={notifications.length === 0}>
              Clear all
            </button>
          </div>
        </div>

        {status.error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--space-6)' }}>
            {status.error}
          </div>
        )}

        {status.loading ? (
          <div className="notifications-loading">
            <FaSpinner className="spinner" /> Loading...
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="notifications-empty">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item ${n.is_read ? 'read' : 'unread'}`}
                >
                  <div className="notification-icon">
                    {notifIcon[n.type] || notifIcon.info}
                  </div>
                  <div className="notification-body">
                    <p className="notification-message">{n.message}</p>
                    <p className="notification-meta">{getTimeAgo(n.created_at)}</p>
                  </div>
                  <div className="notification-actions">
                    {!n.is_read && (
                      <button className="btn btn-ghost" onClick={() => handleMarkRead(n.id)}>
                        Mark read
                      </button>
                    )}
                    <button className="btn btn-ghost" onClick={() => handleDelete(n.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default Notifications;
