const supabase = require('../config/supabaseClient');
const BidService = require('../services/BidService');
const AuditService = require('../services/AuditService');
const NotificationService = require('../services/NotificationService');
const EmailService = require('../services/EmailService');

const bidService = new BidService(supabase);
const auditService = new AuditService(supabase);
const notificationService = new NotificationService(supabase);
const emailService = new EmailService();

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

      // Notify seller
      (async () => {
        try {
          const [productRes, bidderRes] = await Promise.all([
            supabase.from('products').select('title, seller_id').eq('id', productId).single(),
            supabase.from('users').select('name').eq('id', req.user.id).single()
          ]);
          if (productRes.data && bidderRes.data) {
            const { data: seller } = await supabase.from('users').select('name, oau_email').eq('id', productRes.data.seller_id).single();
            if (seller) {
              await emailService.sendNewBidEmail({
                sellerEmail: seller.oau_email,
                sellerName: seller.name,
                buyerName: bidderRes.data.name,
                productTitle: productRes.data.title,
                note
              });
            }
          }
        } catch (e) {
          console.error('[Bid Email]', e.message);
        }
      })();
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

        // Send Email to Buyer
        (async () => {
          try {
            const [buyerRes, sellerRes] = await Promise.all([
              supabase.from('users').select('name, oau_email').eq('id', bid.bidder_id).single(),
              supabase.from('users').select('name').eq('id', req.user.id).single()
            ]);

            if (buyerRes.data && sellerRes.data) {
              await emailService.sendBidAcceptedEmail({
                buyerEmail: buyerRes.data.oau_email,
                buyerName: buyerRes.data.name,
                sellerName: sellerRes.data.name,
                productTitle: bid.product.title
              });
            }
          } catch (e) {
            console.error('[Bid Accept Email]', e.message);
          }
        })();
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
