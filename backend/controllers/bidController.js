const supabase = require('../config/supabaseClient');
const BidService = require('../services/BidService');
const AuditService = require('../services/AuditService');
const NotificationService = require('../services/NotificationService');

const bidService = new BidService(supabase);
const auditService = new AuditService(supabase);
const notificationService = new NotificationService(supabase);

class BidController {
  static async getBidCount(req, res, next) {
    try {
      const count = await bidService.getBidCount(req.params.productId);
      res.json({ success: true, data: { count } });
    } catch (error) {
      next(error);
    }
  }

  static async createBid(req, res, next) {
    try {
      const { productId, note } = req.body;
      const bid = await bidService.createBid({
        productId,
        bidderId: req.user.id,
        note
      });
      await auditService.log({
        actorId: req.user.id,
        action: 'bid.created',
        entityType: 'bid',
        entityId: bid.id,
        metadata: { productId }
      });
      res.status(201).json({ success: true, data: bid });
    } catch (error) {
      next(error);
    }
  }

  static async getSellerBids(req, res, next) {
    try {
      const bids = await bidService.getSellerBids(req.user.id);
      res.json({ success: true, data: bids });
    } catch (error) {
      next(error);
    }
  }

  static async getMyBid(req, res, next) {
    try {
      const bid = await bidService.getMyBid(req.params.productId, req.user.id);
      res.json({ success: true, data: bid });
    } catch (error) {
      next(error);
    }
  }

  static async acceptBid(req, res, next) {
    try {
      const bid = await bidService.acceptBid(req.params.id, req.user.id);
      if (bid?.bidder_id && bid?.product?.id) {
        await notificationService.create(
          bid.bidder_id,
          'info',
          `Your bid was accepted! You can now chat with the seller for "${bid.product.title || 'the item'}".`
        );
      }
      await auditService.log({
        actorId: req.user.id,
        action: 'bid.accepted',
        entityType: 'bid',
        entityId: bid.id,
        metadata: { productId: bid.product?.id || null }
      });
      res.json({ success: true, data: bid });
    } catch (error) {
      next(error);
    }
  }

  static async updateBid(req, res, next) {
    try {
      const bid = await bidService.updateBid(req.params.id, req.user.id, req.body.note);
      await auditService.log({
        actorId: req.user.id,
        action: 'bid.updated',
        entityType: 'bid',
        entityId: bid.id,
        metadata: { productId: bid.product_id }
      });
      res.json({ success: true, data: bid });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BidController;
