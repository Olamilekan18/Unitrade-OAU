import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
    FaBars, FaTimes, FaShoppingBag, FaSignOutAlt, FaPlus,
    FaUserCircle, FaBell, FaCheckCircle, FaShieldAlt, FaInfoCircle, FaStar,
    FaCommentDots, FaBoxOpen,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications, markAllNotificationsRead, fetchConversations } from '../utils/api';

function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [chatUnread, setChatUnread] = useState(0);
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const notifRef = useRef(null);

    // Load notifications when authenticated
    useEffect(() => {
        if (!isAuthenticated) return;
        loadNotifications();
        loadChatUnread();
        const interval = setInterval(() => {
            loadNotifications();
            loadChatUnread();
        }, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function loadNotifications() {
        try {
            const res = await fetchNotifications();
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch {
            // Silently fail
        }
    }

    async function loadChatUnread() {
        try {
            const res = await fetchConversations();
            setChatUnread(res.data.unreadCount || 0);
        } catch {
            // Silently fail
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

    function toggleMenu() {
        setMenuOpen((prev) => !prev);
    }

    function closeMenu() {
        setMenuOpen(false);
    }

    async function handleLogout() {
        await logout();
        closeMenu();
        navigate('/');
    }

    const notifIcon = {
        approval: <FaCheckCircle style={{ color: '#059669', flexShrink: 0 }} />,
        verification: <FaShieldAlt style={{ color: '#1d9bf0', flexShrink: 0 }} />,
        review: <FaStar style={{ color: '#f59e0b', flexShrink: 0 }} />,
        info: <FaInfoCircle style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />,
    };

    return (
        <nav className="navbar">
            <div className="container">
                <Link to="/" className="navbar-brand" onClick={closeMenu}>
                    <span className="brand-icon">
                        <FaShoppingBag />
                    </span>
                    UniTrade
                </Link>

                <button className="mobile-toggle" onClick={toggleMenu} aria-label="Toggle menu">
                    {menuOpen ? <FaTimes /> : <FaBars />}
                </button>

                <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                    <NavLink to="/" end onClick={closeMenu}>
                        Home
                    </NavLink>
                    <NavLink to="/marketplace" onClick={closeMenu}>
                        Marketplace
                    </NavLink>

                    {isAuthenticated ? (
                        <>
                            <NavLink to="/sell" onClick={closeMenu}>
                                <FaPlus style={{ marginRight: 4 }} /> Sell Item
                            </NavLink>
                            <NavLink to="/profile" onClick={closeMenu}>
                                <FaUserCircle style={{ marginRight: 4 }} /> Profile
                            </NavLink>
                            <NavLink to="/orders" onClick={closeMenu}>
                                <FaBoxOpen style={{ marginRight: 4 }} /> My Orders
                            </NavLink>

                            {/* Chat Icon */}
                            <NavLink to="/chat" onClick={closeMenu} style={{ position: 'relative' }}>
                                <FaCommentDots style={{ marginRight: 4 }} /> Chat
                                {chatUnread > 0 && (
                                    <span style={{
                                        position: 'absolute', top: -6, right: -10,
                                        background: '#ef4444', color: 'white',
                                        borderRadius: '50%', width: 18, height: 18,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.65rem', fontWeight: 700,
                                    }}>
                                        {chatUnread > 9 ? '9+' : chatUnread}
                                    </span>
                                )}
                            </NavLink>

                            {/* Notification Bell */}
                            <div ref={notifRef} style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setNotifOpen(!notifOpen)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        position: 'relative', padding: '6px 8px', fontSize: '1.1rem',
                                        color: 'var(--color-gray-600)',
                                    }}
                                    aria-label="Notifications"
                                >
                                    <FaBell />
                                    {unreadCount > 0 && (
                                        <span style={{
                                            position: 'absolute', top: 0, right: 0,
                                            background: '#ef4444', color: 'white',
                                            borderRadius: '50%', width: 18, height: 18,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.65rem', fontWeight: 700,
                                        }}>
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {notifOpen && (
                                    <div style={{
                                        position: 'absolute', top: '100%', right: 0, marginTop: 8,
                                        width: 320, maxHeight: 360, overflowY: 'auto',
                                        background: 'white', borderRadius: 'var(--radius-lg)',
                                        boxShadow: 'var(--shadow-xl)', zIndex: 999,
                                        border: '1px solid var(--color-gray-100)',
                                    }}>
                                        <div style={{
                                            padding: '12px 16px', borderBottom: '1px solid var(--color-gray-100)',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}>
                                            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>Notifications</span>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={handleMarkAllRead}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>

                                        {notifications.length === 0 ? (
                                            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>
                                                No notifications yet
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    style={{
                                                        padding: '12px 16px',
                                                        display: 'flex', gap: 10, alignItems: 'flex-start',
                                                        borderBottom: '1px solid var(--color-gray-50)',
                                                        background: n.is_read ? 'transparent' : 'var(--color-primary-50)',
                                                    }}
                                                >
                                                    {notifIcon[n.type] || notifIcon.info}
                                                    <div>
                                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-700)', lineHeight: 1.4 }}>
                                                            {n.message}
                                                        </p>
                                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)', marginTop: 4 }}>
                                                            {getTimeAgo(n.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="navbar-user">
                                <span className="navbar-user-name">Hi, {user?.name?.split(' ')[0]}</span>
                                <button className="btn btn-outline" onClick={handleLogout} style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
                                    <FaSignOutAlt /> Logout
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <NavLink to="/login" onClick={closeMenu}>
                                Login
                            </NavLink>
                            <Link to="/request-access" className="btn btn-primary" onClick={closeMenu} style={{ fontSize: '0.85rem' }}>
                                Request Access
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
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

export default Navbar;
