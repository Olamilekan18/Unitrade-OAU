import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    FaPaperPlane, FaSpinner, FaArrowLeft, FaCheckCircle,
    FaComments, FaCircle, FaImage, FaTags, FaTimes
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import {
    fetchConversations, fetchMessages, sendMessage, createConversation,
    uploadImage, acceptOffer, rejectOffer, createOrder
} from '../utils/api';

function ChatPage() {
    const { user, loading, isAuthenticated } = useAuth();
    const [searchParams] = useSearchParams();
    const [conversations, setConversations] = useState([]);
    const [activeConv, setActiveConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [mobileView, setMobileView] = useState('list'); // 'list' or 'thread'
    
    // New state for Chat Features
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    const [showOfferPopup, setShowOfferPopup] = useState(false);
    const [offerAmount, setOfferAmount] = useState('');
    const fileInputRef = useRef(null);
    
    const messagesEndRef = useRef(null);
    const pollRef = useRef(null);

    // Auto-create conversation if coming from ProductDetailPage
    useEffect(() => {
        if (!isAuthenticated || loading) return;
        const sellerId = searchParams.get('seller');
        const productId = searchParams.get('product');
        if (sellerId) {
            (async () => {
                try {
                    const res = await createConversation(sellerId, productId);
                    const convId = res.data.id;
                    // Load all conversations, then auto-select the new one
                    const convRes = await fetchConversations();
                    const convs = convRes.data.conversations || [];
                    setConversations(convs);
                    setLoadingConvs(false);
                    const target = convs.find((c) => c.id === convId);
                    if (target) {
                        setActiveConv(target);
                        setMobileView('thread');
                        loadMessages(convId);
                    }
                } catch (err) {
                    console.error('Chat init error:', err);
                    loadConversations();
                }
            })();
        } else {
            loadConversations();
        }
    }, [isAuthenticated, loading]);

    // Poll for new messages when a conversation is active
    useEffect(() => {
        if (!activeConv) return;
        pollRef.current = setInterval(() => {
            loadMessages(activeConv.id, true);
        }, 3000);
        return () => clearInterval(pollRef.current);
    }, [activeConv?.id]);

    // Auto-open offer popup
    useEffect(() => {
        if (activeConv && activeConv.product && searchParams.get('action') === 'offer') {
            setShowOfferPopup(true);
        }
    }, [activeConv, searchParams]);

    async function loadConversations(autoSelectId) {
        try {
            setLoadingConvs(true);
            const res = await fetchConversations();
            const convs = res.data.conversations || [];
            setConversations(convs);
            if (autoSelectId) {
                const target = convs.find((c) => c.id === autoSelectId);
                if (target) {
                    setActiveConv(target);
                    setMobileView('thread');
                    loadMessages(target.id);
                }
            }
        } catch (err) {
            console.error('Failed to load conversations:', err);
        } finally {
            setLoadingConvs(false);
        }
    }

    async function openConversation(conv) {
        setActiveConv(conv);
        setMobileView('thread');
        await loadMessages(conv.id);
    }

    async function loadMessages(convId, silent) {
        try {
            if (!silent) setLoadingMsgs(true);
            const res = await fetchMessages(convId);
            setMessages(res.data || []);
            // Update unread count in sidebar
            setConversations((prev) =>
                prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
            );
        } catch { /* silent */ } finally {
            if (!silent) setLoadingMsgs(false);
        }
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function handleSend(e) {
        e?.preventDefault();
        if ((!newMsg.trim() && !selectedImageFile) || !activeConv || sending) return;
        try {
            setSending(true);
            let uploadedImageUrl = null;
            if (selectedImageFile) {
                const uploadRes = await uploadImage(selectedImageFile);
                uploadedImageUrl = uploadRes.data.url;
            }
            
            const res = await sendMessage(activeConv.id, newMsg.trim(), uploadedImageUrl, null);
            setMessages((prev) => [...prev, res.data]);
            setNewMsg('');
            removeSelectedImage();
            // Update last message in sidebar
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === activeConv.id
                        ? { ...c, lastMessage: { content: res.data.content, sender_id: res.data.sender_id, created_at: res.data.created_at } }
                        : c
                )
            );
        } catch (err) { 
            alert(err.message || 'Error sending message');
        } finally {
            setSending(false);
        }
    }

    function handleImageSelect(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
        setSelectedImageFile(file);
        setSelectedImageUrl(URL.createObjectURL(file));
        setShowOfferPopup(false); // Close offer popup if open
    }

    function removeSelectedImage() {
        setSelectedImageFile(null);
        if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
        setSelectedImageUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function handleSendOffer(e) {
        e.preventDefault();
        const amt = Number(offerAmount);
        if (!amt || amt <= 0 || !activeConv) return;
        try {
            setSending(true);
            const res = await sendMessage(activeConv.id, `I made an offer for ₦${amt.toLocaleString()}`, null, amt);
            setMessages((prev) => [...prev, res.data]);
            setShowOfferPopup(false);
            setOfferAmount('');
        } catch (err) {
            alert(err.message || 'Failed to send offer');
        } finally {
            setSending(false);
        }
    }

    async function handleAcceptOffer(messageId) {
        try {
            const res = await acceptOffer(messageId);
            setMessages((prev) => prev.map(m => m.id === messageId ? { ...m, offer_status: res.data.offer_status } : m));
        } catch (err) {
            alert(err.message || 'Error accepting offer');
        }
    }

    async function handleRejectOffer(messageId) {
        try {
            const res = await rejectOffer(messageId);
            setMessages((prev) => prev.map(m => m.id === messageId ? { ...m, offer_status: res.data.offer_status } : m));
        } catch (err) {
            alert(err.message || 'Error rejecting offer');
        }
    }

    async function handleCheckoutOffer(messageId) {
        try {
            setSending(true);
            const res = await createOrder(activeConv.product_id, messageId);
            window.location.href = res.data.authorization_url;
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Failed to checkout');
            setSending(false);
        }
    }

    function goBackToList() {
        setMobileView('list');
        setActiveConv(null);
        clearInterval(pollRef.current);
        loadConversations();
    }

    if (loading) return null;
    if (!isAuthenticated) {
        return (
            <div className="auth-page">
                <div className="auth-card fade-in-up" style={{ textAlign: 'center' }}>
                    <h1>Login Required</h1>
                    <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-6)' }}>You need to log in to use chat.</p>
                    <Link to="/login" className="btn btn-primary btn-lg">Log In</Link>
                </div>
            </div>
        );
    }

    function getOtherUser(conv) {
        return conv.buyer_id === user.id ? conv.seller : conv.buyer;
    }

    function formatTime(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h`;
        return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
    }

    const defaultAvatar = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff&size=48`;

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - var(--nav-height))', overflow: 'hidden' }}>
            {/* ── Conversation List (Sidebar) ── */}
            <div style={{
                width: 360, minWidth: 300, borderRight: '1px solid var(--color-gray-200)',
                display: 'flex', flexDirection: 'column', background: 'var(--color-white)',
                ...(mobileView === 'thread' ? { display: 'none' } : {}),
            }} className="chat-sidebar">
                <div style={{ padding: 'var(--space-5) var(--space-5)', borderBottom: '1px solid var(--color-gray-100)' }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FaComments style={{ color: 'var(--color-primary)' }} /> Messages
                    </h2>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loadingConvs ? (
                        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                            <FaSpinner className="spinner" /> Loading...
                        </div>
                    ) : conversations.length === 0 ? (
                        <div style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                            <FaComments style={{ fontSize: '2rem', marginBottom: 'var(--space-3)', opacity: 0.5 }} />
                            <p>No conversations yet.</p>
                            <p style={{ fontSize: 'var(--font-size-sm)' }}>Start one from a product page!</p>
                        </div>
                    ) : (
                        conversations.map((conv) => {
                            const other = getOtherUser(conv);
                            const isActive = activeConv?.id === conv.id;

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => openConversation(conv)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                                        padding: 'var(--space-4) var(--space-5)',
                                        cursor: 'pointer',
                                        borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                                        background: isActive ? 'var(--color-primary-50)' : 'transparent',
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    <img
                                        src={other?.avatar_url || defaultAvatar(other?.name || '?')}
                                        alt={other?.name}
                                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--color-gray-100)' }}
                                        onError={(e) => { e.target.src = defaultAvatar(other?.name || '?'); }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {other?.store_name || other?.name || 'User'}
                                                {other?.is_verified && <FaCheckCircle style={{ color: '#1d9bf0', fontSize: '0.7rem' }} />}
                                            </span>
                                            {conv.lastMessage && (
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                                                    {formatTime(conv.lastMessage.created_at)}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <p style={{
                                                fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180,
                                            }}>
                                                {conv.lastMessage
                                                    ? (conv.lastMessage.sender_id === user.id ? 'You: ' : '') + conv.lastMessage.content
                                                    : 'No messages yet'}
                                            </p>
                                            {conv.unreadCount > 0 && (
                                                <span style={{
                                                    background: 'var(--color-primary)', color: 'white', borderRadius: '50%',
                                                    width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                                                }}>
                                                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        {conv.product && (
                                            <p style={{ fontSize: '0.65rem', color: 'var(--color-gray-400)', marginTop: 2 }}>
                                                Re: {conv.product.title}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Message Thread (Right Panel) ── */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-gray-50)',
                ...(mobileView === 'list' ? { display: 'none' } : {}),
            }} className="chat-thread">
                {!activeConv ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--color-gray-400)' }}>
                        <FaComments style={{ fontSize: '3rem', marginBottom: 'var(--space-4)', opacity: 0.3 }} />
                        <p style={{ fontSize: 'var(--font-size-lg)' }}>Select a conversation</p>
                    </div>
                ) : (
                    <>
                        {/* Thread Header */}
                        <div style={{
                            padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-gray-200)',
                            background: 'var(--color-white)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                        }}>
                            <button
                                onClick={goBackToList}
                                className="chat-back-btn"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--color-gray-600)', padding: 4 }}
                            >
                                <FaArrowLeft />
                            </button>
                            {(() => {
                                const other = getOtherUser(activeConv);
                                return (
                                    <>
                                        <img
                                            src={other?.avatar_url || defaultAvatar(other?.name || '?')}
                                            alt={other?.name}
                                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-gray-100)' }}
                                            onError={(e) => { e.target.src = defaultAvatar(other?.name || '?'); }}
                                        />
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {other?.store_name || other?.name}
                                                {other?.is_verified && <FaCheckCircle style={{ color: '#1d9bf0', fontSize: '0.7rem' }} />}
                                            </p>
                                            {activeConv.product && (
                                                <Link to={`/product/${activeConv.product.id}`} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)' }}>
                                                    {activeConv.product.title} — ₦{Number(activeConv.product.price).toLocaleString()}
                                                </Link>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {loadingMsgs ? (
                                <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: 'var(--space-8)' }}>
                                    <FaSpinner className="spinner" /> Loading messages...
                                </div>
                            ) : messages.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: 'var(--space-10)' }}>
                                    <p>No messages yet. Say hello! 👋</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMine = msg.sender_id === user.id;
                                    return (
                                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                                            <div style={{
                                                maxWidth: '75%',
                                                padding: 'var(--space-3) var(--space-4)',
                                                borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                background: isMine
                                                    ? 'linear-gradient(135deg, var(--color-primary), var(--color-accent))'
                                                    : 'var(--color-white)',
                                                color: isMine ? 'white' : 'var(--color-gray-800)',
                                                boxShadow: 'var(--shadow-sm)',
                                                border: isMine ? 'none' : '1px solid var(--color-gray-100)',
                                            }}>
                                                {msg.image_url && (
                                                    <img 
                                                        src={msg.image_url} 
                                                        alt="chat attachment" 
                                                        style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 300, objectFit: 'contain', background: 'rgba(0,0,0,0.05)' }} 
                                                    />
                                                )}

                                                {msg.content && <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.content}</p>}

                                                {msg.offer_price && (
                                                    <div style={{
                                                        marginTop: msg.content || msg.image_url ? 8 : 0,
                                                        padding: 12,
                                                        background: isMine ? 'rgba(255,255,255,0.1)' : 'var(--color-gray-50)',
                                                        borderRadius: 8,
                                                        border: isMine ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--color-gray-200)',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 8 }}>
                                                            <FaTags /> Offer: ₦{Number(msg.offer_price).toLocaleString()}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                                                            {msg.offer_status === 'pending' && (
                                                                isMine ? (
                                                                    <span>Awaiting response...</span>
                                                                ) : (
                                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                                        <button onClick={() => handleAcceptOffer(msg.id)} style={{ padding: '4px 12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', flex: 1 }}>Accept</button>
                                                                        <button onClick={() => handleRejectOffer(msg.id)} style={{ padding: '4px 12px', background: 'white', color: 'var(--color-error)', border: '1px solid var(--color-error)', borderRadius: 4, cursor: 'pointer', flex: 1 }}>Reject</button>
                                                                    </div>
                                                                )
                                                            )}
                                                            {msg.offer_status === 'accepted' && (
                                                                <div>
                                                                    <div style={{ color: isMine ? '#d1fae5' : 'var(--color-primary)', fontWeight: 600, marginBottom: 8 }}>✓ Accepted</div>
                                                                    {activeConv?.buyer_id === user.id ? (
                                                                        <button onClick={() => handleCheckoutOffer(msg.id)} className="btn btn-primary" style={{ width: '100%', padding: '6px' }}>Checkout Now</button>
                                                                    ) : (
                                                                        <span>Waiting for buyer to checkout.</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {msg.offer_status === 'rejected' && (
                                                                <span style={{ color: isMine ? '#fca5a5' : 'var(--color-error)' }}>✗ Rejected</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <p style={{
                                                    fontSize: '0.65rem',
                                                    textAlign: 'right',
                                                    marginTop: 4,
                                                    opacity: 0.7,
                                                    color: isMine ? 'rgba(255,255,255,0.8)' : 'var(--color-gray-400)',
                                                }}>
                                                    {formatTime(msg.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div style={{ position: 'relative' }}>
                            {showOfferPopup && (
                                <div style={{
                                    position: 'absolute', bottom: '100%', left: 0, right: 0,
                                    background: 'var(--color-white)', borderTop: '1px solid var(--color-gray-200)',
                                    padding: 'var(--space-4)', boxShadow: 'var(--shadow-md)', zIndex: 10
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>Make an Offer</h4>
                                        <button onClick={() => setShowOfferPopup(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}><FaTimes /></button>
                                    </div>
                                    <form onSubmit={handleSendOffer} style={{ display: 'flex', gap: 8 }}>
                                        <div className="input-with-icon" style={{ flex: 1, position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--color-gray-500)' }}>₦</span>
                                            <input
                                                type="number"
                                                className="input"
                                                min="1"
                                                value={offerAmount}
                                                onChange={(e) => setOfferAmount(e.target.value)}
                                                placeholder="Enter amount"
                                                style={{ paddingLeft: 28 }}
                                                required
                                            />
                                        </div>
                                        <button type="submit" disabled={sending || !offerAmount} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                                            {sending ? <FaSpinner className="spinner" /> : 'Send Offer'}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {selectedImageUrl && (
                                <div style={{
                                    position: 'absolute', bottom: '100%', left: 0, right: 0,
                                    background: 'var(--color-white)', borderTop: '1px solid var(--color-gray-200)',
                                    padding: 'var(--space-4)', boxShadow: 'var(--shadow-md)', zIndex: 10,
                                    display: 'flex', alignItems: 'center', gap: 12
                                }}>
                                    <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-gray-200)' }}>
                                        <img src={selectedImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button 
                                            type="button" 
                                            onClick={removeSelectedImage} 
                                            style={{ 
                                                position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', 
                                                color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                                            }}
                                        >
                                            <FaTimes size={12} />
                                        </button>
                                    </div>
                                    <div style={{ flex: 1, color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
                                        Image attached. Add an optional message and send.
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSend} style={{
                                padding: 'var(--space-3) var(--space-5)',
                                borderTop: '1px solid var(--color-gray-200)',
                                background: 'var(--color-white)',
                                display: 'flex', gap: 'var(--space-3)', alignItems: 'center',
                            }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleImageSelect}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={sending}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--color-gray-500)', fontSize: '1.2rem', padding: 4,
                                        display: 'flex', alignItems: 'center'
                                    }}
                                    title="Attach Image"
                                >
                                    <FaImage style={{ pointerEvents: 'none' }} />
                                </button>
                                
                                {activeConv.product && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowOfferPopup(!showOfferPopup);
                                            removeSelectedImage(); // Don't allow offer and image at the same time for simplicity
                                        }}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: showOfferPopup ? 'var(--color-primary)' : 'var(--color-gray-500)',
                                            fontSize: '1.2rem', padding: 4, display: 'flex', alignItems: 'center'
                                        }}
                                        title="Make Offer"
                                    >
                                        <FaTags style={{ pointerEvents: 'none' }} />
                                    </button>
                                )}

                                <input
                                    className="input"
                                    placeholder="Type a message..."
                                    value={newMsg}
                                    onChange={(e) => setNewMsg(e.target.value)}
                                    disabled={sending}
                                    style={{ flex: 1, borderRadius: 'var(--radius-full)', padding: '10px 18px' }}
                                />
                                <button
                                    type="submit"
                                    disabled={sending || (!newMsg.trim() && !selectedImageFile)}
                                    className="btn btn-primary"
                                    style={{
                                        borderRadius: '50%', width: 44, height: 44, padding: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}
                                >
                                    {sending ? <FaSpinner className="spinner" /> : <FaPaperPlane />}
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @media (min-width: 769px) {
                    .chat-sidebar { display: flex !important; }
                    .chat-thread { display: flex !important; }
                    .chat-back-btn { display: none !important; }
                }
                @media (max-width: 768px) {
                    .chat-sidebar { width: 100% !important; min-width: 100% !important; border-right: none !important; }
                    .chat-thread { width: 100% !important; }
                }
            `}</style>
        </div>
    );
}

export default ChatPage;
