require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const supabase = require('./config/supabaseClient');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const UserService = require('./services/UserService');
const CategoryService = require('./services/CategoryService');
const ReviewService = require('./services/ReviewService');
const NotificationService = require('./services/NotificationService');
const EmailService = require('./services/EmailService');
const ChatService = require('./services/ChatService');
const { errorHandler } = require('./middlewares/errorMiddleware');
const { verifyJwt } = require('./middlewares/authMiddleware');

const app = express();
const userService = new UserService(supabase);
const categoryService = new CategoryService(supabase);
const reviewService = new ReviewService(supabase);
const notificationService = new NotificationService(supabase);
const emailService = new EmailService();
const chatService = new ChatService(supabase);

// Allow local dev and Vercel deployed frontend
const allowedOrigins = [
  'http://localhost:5173',
  'https://unitrade-oau.vercel.app',
  process.env.FRONTEND_ORIGIN // Fallback if set in Render env
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

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
app.post('/api/access-requests', async (req, res, next) => {
  try {
    const request = await userService.createAccessRequest(req.body);
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

// ── Sessions (Login with email + password) ──
app.post('/api/sessions', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await userService.authenticateUser(email, password);

    const token = jwt.sign(
      { sub: user.id, email: user.oau_email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
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
    const user = await userService.getApprovedUserById(payload.sub);
    res.json({ success: true, data: { user } });
  } catch (error) {
    res.clearCookie('access_token');
    return res.status(401).json({ success: false, message: 'Invalid session' });
  }
});

app.delete('/api/sessions', (_req, res) => {
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
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

// ── Verification Requests ──
app.post('/api/verification-requests', verifyJwt, async (req, res, next) => {
  try {
    const request = await userService.requestVerification(req.user.id, req.body.reason);
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

app.post('/api/products/:id/reviews', verifyJwt, async (req, res, next) => {
  try {
    const review = await reviewService.createReview(req.params.id, req.user.id, req.body);
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
});

// ── Admin: Approve User ──
app.put('/api/admin/users/:id/approve', verifyJwt, async (req, res, next) => {
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

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ── Admin: Verify Seller ──
app.put('/api/admin/users/:id/verify', verifyJwt, async (req, res, next) => {
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

// ── Chat / Conversations ──
app.post('/api/conversations', verifyJwt, async (req, res, next) => {
  try {
    const { sellerId, productId } = req.body;
    const conversation = await chatService.getOrCreateConversation(req.user.id, sellerId, productId);
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
    const message = await chatService.sendMessage(req.params.id, req.user.id, req.body.content);
    res.status(201).json({ success: true, data: message });
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

app.use('/api/products', productRoutes);
app.use('/api/uploads', uploadRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`UniTrade API listening on port ${PORT}`);
});
