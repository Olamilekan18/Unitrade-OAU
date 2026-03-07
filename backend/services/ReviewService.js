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

        // Check which reviewers have purchased the product
        const reviewerIds = data.map(r => r.users?.id).filter(Boolean);

        let purchaseMap = {};
        if (reviewerIds.length > 0) {
            const { data: orders } = await this.supabase
                .from('orders')
                .select('buyer_id')
                .eq('product_id', productId)
                .in('buyer_id', reviewerIds)
                .in('status', ['paid', 'delivered']);

            if (orders) {
                orders.forEach(o => { purchaseMap[o.buyer_id] = true; });
            }
        }

        // Attach verified_purchase flag to each review
        return data.map(review => ({
            ...review,
            verified_purchase: !!(review.users?.id && purchaseMap[review.users.id]),
        }));
    }

    async createReview(productId, reviewerId, payload) {
        // ── Purchase verification: only buyers can review ──
        const { data: orderCheck, error: orderErr } = await this.supabase
            .from('orders')
            .select('id')
            .eq('buyer_id', reviewerId)
            .eq('product_id', productId)
            .in('status', ['paid', 'delivered'])
            .limit(1);

        if (orderErr) throw orderErr;

        if (!orderCheck || orderCheck.length === 0) {
            const err = new Error('You must purchase this product before leaving a review.');
            err.status = 403;
            throw err;
        }

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

        return { ...data, verified_purchase: true };
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
