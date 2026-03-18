import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
    FaBars, FaTimes, FaShoppingBag, FaSignOutAlt, FaPlus,
    FaUserCircle, FaBell, FaShieldAlt,
    FaCommentDots, FaBoxOpen, FaWallet, FaGavel,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications, fetchConversations } from '../utils/api';

function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [chatUnread, setChatUnread] = useState(0);
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

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

    async function loadNotifications() {
        try {
            const res = await fetchNotifications();
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
                            <NavLink to="/wallet" onClick={closeMenu}>
                                <FaWallet style={{ marginRight: 4 }} /> Wallet
                            </NavLink>
                            <NavLink to="/orders" onClick={closeMenu}>
                                <FaBoxOpen style={{ marginRight: 4 }} /> My Orders
                            </NavLink>
                            <NavLink to="/bids" onClick={closeMenu}>
                                <FaGavel style={{ marginRight: 4 }} /> Bids
                            </NavLink>
                            {(user?.role === 'admin' || user?.role === 'super_admin') && (
                                <NavLink to="/admin" onClick={closeMenu}>
                                    <FaShieldAlt style={{ marginRight: 4 }} /> Admin
                                </NavLink>
                            )}

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
                            <NavLink to="/notifications" onClick={closeMenu} style={{ position: 'relative' }}>
                                <FaBell style={{ marginRight: 4 }} /> Notifications
                                {unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute', top: -6, right: -10,
                                        background: '#ef4444', color: 'white',
                                        borderRadius: '50%', width: 18, height: 18,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.65rem', fontWeight: 700,
                                    }}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </NavLink>

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
                            <Link to="/request-access" className="btn btn-white navbar-cta" onClick={closeMenu} style={{ fontSize: '0.85rem' }}>
                                Request Access
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
