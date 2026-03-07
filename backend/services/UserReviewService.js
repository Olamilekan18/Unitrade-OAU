class UserReviewService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async createUserReview(sellerId, reviewerId, reviewData) {
    if (sellerId === reviewerId) {
      const err = new Error('You cannot review yourself.');
      err.status = 400;
      throw err;
    }

    // Check if reviewer has a delivered order from this seller
    const { data: orders, error: orderError } = await this.supabase
      .from('orders')
      .select('id')
      .eq('buyer_id', reviewerId)
      .eq('seller_id', sellerId)
      .eq('status', 'delivered')
      .limit(1);

    if (orderError) throw orderError;

    if (!orders || orders.length === 0) {
      const err = new Error('You can only review sellers after receiving an order from them.');
      err.status = 403;
      throw err;
    }

    const { data, error } = await this.supabase
      .from('user_reviews')
      .insert({
        seller_id: sellerId,
        reviewer_id: reviewerId,
        rating: reviewData.rating,
        comment: reviewData.comment || ''
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        const err = new Error('You have already reviewed this seller.');
        err.status = 400;
        throw err;
      }
      throw error;
    }

    return data;
  }
}

module.exports = UserReviewService;
