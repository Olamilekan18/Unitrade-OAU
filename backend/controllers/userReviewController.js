const supabase = require('../config/supabaseClient');
const UserReviewService = require('../services/UserReviewService');

const userReviewService = new UserReviewService(supabase);

class UserReviewController {
  static async createUserReview(req, res, next) {
    try {
      const { rating, comment } = req.body;
      const sellerId = req.params.userId;
      const reviewerId = req.user.id;

      const review = await userReviewService.createUserReview(sellerId, reviewerId, {
        rating,
        comment
      });

      res.status(201).json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  }

  static async getUserReviews(req, res, next) {
    try {
      const { userId } = req.params;
      const [reviews, stats] = await Promise.all([
        userReviewService.getUserReviews(userId),
        userReviewService.getUserStats(userId)
      ]);
      res.json({ success: true, data: { reviews, stats } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserReviewController;
