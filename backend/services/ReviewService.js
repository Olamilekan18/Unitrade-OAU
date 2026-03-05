class ReviewService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    async getReviewsForProduct(productId) {
        const { data, error } = await this.supabase
            .from('reviews')
            .select(`
        id, rating, comment, created_at,
        users:reviewer_id(id, name, store_name, avatar_url, is_verified)
      `)
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    async createReview(productId, reviewerId, payload) {
        const { data, error } = await this.supabase
            .from('reviews')
            .insert({
                product_id: productId,
                reviewer_id: reviewerId,
                rating: payload.rating,
                comment: payload.comment || '',
            })
            .select(`
        id, rating, comment, created_at,
        users:reviewer_id(id, name, store_name, avatar_url, is_verified)
      `)
            .single();

        if (error) {
            if (error.code === '23505') {
                const err = new Error('You have already reviewed this product.');
                err.status = 409;
                throw err;
            }
            throw error;
        }
        return data;
    }

    async getAverageRating(productId) {
        const { data, error } = await this.supabase
            .from('reviews')
            .select('rating')
            .eq('product_id', productId);

        if (error) throw error;

        if (!data.length) return { average: 0, count: 0 };

        const sum = data.reduce((acc, r) => acc + r.rating, 0);
        return { average: Math.round((sum / data.length) * 10) / 10, count: data.length };
    }
}

module.exports = ReviewService;
