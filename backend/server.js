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

const app = express();
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

// --- Background Job For Escrow Auto Releases ---
// Run every hour to check for 24-hours expired shipped orders
cron.schedule('0 * * * *', () => {
  orderService.processAutoReleases();
});

// --- Daily Promotion Batch Sender (Brevo) ---
// Sends up to 300 queued promo emails per day
cron.schedule('0 9 * * *', () => {
  promoService.sendPendingBatch(300);
});

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

app.post('/api/products/:id/reviews', verifyJwt, async (req, res, next) => {
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
});
