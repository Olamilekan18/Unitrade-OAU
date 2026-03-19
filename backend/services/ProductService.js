class ProductService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async createProduct(payload) {
    const { data, error } = await this.supabase
      .from('products')
      .insert(payload)
      .select(`
        id, title, price, description, image_url, image_urls, status, quantity, created_at,
        categories:category_id(id, name),
        users:seller_id(id, name, department, store_name, is_verified, avatar_url, address, user_reviews!user_reviews_seller_id_fkey(rating)),
        reviews(rating)
      `)
      .single();

    if (error) throw error;
    return this._mapProductRatings(data);
  }

  async getAvailableProducts({ search, categoryId, sort } = {}) {
    let query = this.supabase
      .from('products')
      .select(`
        id, title, price, description, image_url, image_urls, status, quantity, created_at,
        categories:category_id(id, name),
        users:seller_id(id, name, department, store_name, is_verified, avatar_url, address, user_reviews!user_reviews_seller_id_fkey(rating)),
        reviews(rating)
      `)
      .eq('status', 'available');

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (search) {
      query = query.textSearch('search_vector', search, {
        config: 'english',
        type: 'websearch'
      });
    }

    // --- Dynamic Sorting Logic ---
    if (sort === 'price_asc') {
      query = query.order('price', { ascending: true });
    } else if (sort === 'price_desc') {
      query = query.order('price', { ascending: false });
    } else if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else {
      // 'recommended' or default: fetch then apply smart relevance scoring
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;
    const products = data.map(this._mapProductRatings);

    if (sort && sort !== 'recommended') {
      return products;
    }

    if (!products.length) return products;

    const productIds = products.map((p) => p.id);
    const { data: bidRows, error: bidError } = await this.supabase
      .from('bids')
      .select('product_id')
      .in('product_id', productIds);

    if (bidError) throw bidError;

    const bidCounts = (bidRows || []).reduce((acc, row) => {
      acc[row.product_id] = (acc[row.product_id] || 0) + 1;
      return acc;
    }, {});

    const now = Date.now();
    const maxAgeDays = 30;

    const scored = products.map((product) => {
      const createdAt = new Date(product.created_at).getTime();
      const ageDays = Number.isNaN(createdAt) ? maxAgeDays : (now - createdAt) / 86400000;
      const recency = Math.max(0, 1 - Math.min(ageDays, maxAgeDays) / maxAgeDays);
      const verified = product.users?.is_verified ? 1 : 0;
      const sellerRating = product.users?.seller_rating ? Math.min(5, product.users.seller_rating) / 5 : 0;

      let score = (recency * 0.4) + (verified * 0.3) + (sellerRating * 0.3);
      if ((bidCounts[product.id] || 0) > 0) score += 0.05;

      return { ...product, relevance_score: Number(score.toFixed(4)) };
    });

    return scored.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  async getProductById(id) {
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        id, title, price, description, image_url, image_urls, status, quantity, created_at,
        categories:category_id(id, name),
        users:seller_id(id, name, department, store_name, is_verified, avatar_url, phone, address, user_reviews!user_reviews_seller_id_fkey(rating)),
        reviews(rating)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const err = new Error('Product not found.');
      err.status = 404;
      throw err;
    }

    return this._mapProductRatings(data);
  }

  async getProductsBySeller(sellerId) {
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        id, title, price, image_url, image_urls, status, created_at,
        categories:category_id(id, name)
      `)
      .eq('seller_id', sellerId)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getProductsForOwner(sellerId) {
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        id, title, price, image_url, image_urls, status, quantity, created_at,
        categories:category_id(id, name)
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateProduct(productId, sellerId, updates) {
    const { data: existing, error: existingError } = await this.supabase
      .from('products')
      .select('id, seller_id')
      .eq('id', productId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      const err = new Error('Product not found.');
      err.status = 404;
      throw err;
    }
    if (existing.seller_id !== sellerId) {
      const err = new Error('You are not allowed to edit this listing.');
      err.status = 403;
      throw err;
    }

    const { data, error } = await this.supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select(`
        id, title, price, description, image_url, image_urls, status, quantity, created_at,
        categories:category_id(id, name),
        users:seller_id(id, name, department, store_name, is_verified, avatar_url, address, user_reviews!user_reviews_seller_id_fkey(rating)),
        reviews(rating)
      `)
      .single();

    if (error) throw error;
    return this._mapProductRatings(data);
  }

  _mapProductRatings(item) {
    if (!item) return item;

    const pReviews = item.reviews || [];
    const sReviews = item.users?.user_reviews || [];

    const product_reviews_count = pReviews.length;
    const product_rating = product_reviews_count > 0
      ? (pReviews.reduce((sum, r) => sum + r.rating, 0) / product_reviews_count).toFixed(1)
      : null;

    const seller_reviews_count = sReviews.length;
    const seller_rating = seller_reviews_count > 0
      ? (sReviews.reduce((sum, r) => sum + r.rating, 0) / seller_reviews_count).toFixed(1)
      : null;

    // Clean up nested collections to keep payload small
    delete item.reviews;
    if (item.users) delete item.users.user_reviews;

    return {
      ...item,
      product_rating: product_rating ? Number(product_rating) : null,
      product_reviews_count,
      users: item.users ? {
        ...item.users,
        seller_rating: seller_rating ? Number(seller_rating) : null,
        seller_reviews_count
      } : null
    };
  }
}

module.exports = ProductService;
