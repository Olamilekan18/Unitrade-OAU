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

  async getUserReviews(userId) {
    const { data, error } = await this.supabase
      .from('user_reviews')
      .select(`
        id, rating, comment, created_at,
        users:reviewer_id(id, name, avatar_url, store_name, is_verified)
      `)
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getUserStats(userId) {
    const { data, error } = await this.supabase
      .from('user_reviews')
      .select('rating')
      .eq('seller_id', userId);

    if (error) throw error;

    const count = data.length;
    const average = count > 0 
      ? Math.round((data.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10 
      : 0;

    return { average, count };
  }
}

module.exports = UserReviewService;
