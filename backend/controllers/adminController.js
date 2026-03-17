const supabase = require('../config/supabaseClient');
const AdminService = require('../services/AdminService');
const AuditService = require('../services/AuditService');
const PromoService = require('../services/PromoService');

const adminService = new AdminService(supabase);
const auditService = new AuditService(supabase);
const promoService = new PromoService(supabase);

class AdminController {
  static async getSummary(req, res, next) {
    try {
      const data = await adminService.getSummary();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listUsers(req, res, next) {
    try {
      const data = await adminService.listUsers(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listAccessRequests(req, res, next) {
    try {
      const data = await adminService.listAccessRequests();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listVerificationRequests(req, res, next) {
    try {
      const data = await adminService.listVerificationRequests();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listProducts(req, res, next) {
    try {
      const data = await adminService.listProducts();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async updateProductStatus(req, res, next) {
    try {
      const data = await adminService.updateProductStatus(req.params.id, req.body.status);
      await auditService.log({
        actorId: req.user.id,
        action: 'admin.product.status_updated',
        entityType: 'product',
        entityId: data.id,
        metadata: { status: data.status }
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listOrders(req, res, next) {
    try {
      const data = await adminService.listOrders();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async listAuditLogs(req, res, next) {
    try {
      const data = await adminService.listAuditLogs();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async blockUser(req, res, next) {
    try {
      const data = await adminService.blockUser(req.params.id, req.body.is_blocked);
      await auditService.log({
        actorId: req.user.id,
        action: data.is_blocked ? 'admin.user.blocked' : 'admin.user.unblocked',
        entityType: 'user',
        entityId: data.id
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async suspendUser(req, res, next) {
    try {
      const data = await adminService.suspendUser(req.params.id, req.body.suspended_until || null);
      await auditService.log({
        actorId: req.user.id,
        action: data.suspended_until ? 'admin.user.suspended' : 'admin.user.unsuspended',
        entityType: 'user',
        entityId: data.id,
        metadata: { suspended_until: data.suspended_until }
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async setRole(req, res, next) {
    try {
      const data = await adminService.setRole(req.params.id, req.body.role);
      await auditService.log({
        actorId: req.user.id,
        action: 'admin.user.role_updated',
        entityType: 'user',
        entityId: data.id,
        metadata: { role: data.role }
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async sendPromotion(req, res, next) {
    try {
      const { title, message, audience, userIds, sendEmail } = req.body;
      const users = await adminService.createPromotion({ title, message, audience, userIds });

      const promotion = await promoService.createPromotion({
        title,
        message,
        audience,
        sendEmail,
        actorId: req.user.id,
      });

      const recipientIds = users.map((u) => u.id);
      const queued = await promoService.enqueueRecipients(promotion.id, recipientIds);
      const batchResult = await promoService.sendPendingBatch(300, promotion.id);

      if (users.length) {
        const notifications = users.map((u) => ({
          user_id: u.id,
          type: 'info',
          message: `[Promo] ${title}: ${message}`,
        }));

        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;
      }

      await auditService.log({
        actorId: req.user.id,
        action: 'admin.promotion.sent',
        entityType: 'promotion',
        entityId: promotion.id,
        metadata: { title, audience, count: users.length, queued, sentNow: batchResult.sent }
      });

      res.json({
        success: true,
        data: {
          count: users.length,
          queued,
          sentNow: batchResult.sent,
          failedNow: batchResult.failed,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;
