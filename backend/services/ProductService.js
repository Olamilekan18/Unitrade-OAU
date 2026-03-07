class ProductService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async createProduct(payload) {
    const { data, error } = await this.supabase
      .from('products')
      .insert(payload)
      .select(`
        id, title, price, description, image_url, status, quantity, created_at,
        categories:category_id(id, name),
        users:seller_id(id, name, department, store_name, is_verified, avatar_url, address, user_reviews!user_reviews_seller_id_fkey(rating)),
        reviews(rating)
      `)
      .single();

    if (error) throw error;
    return this._mapProductRatings(data);
  }

  async getAvailableProducts() {
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        id, title, price, description, image_url, status, quantity, created_at,
        categories:category_id(id, name),
        users:seller_id(id, name, department, store_name, is_verified, avatar_url, address, user_reviews!user_reviews_seller_id_fkey(rating)),
        reviews(rating)
      `)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this._mapProductRatings);
  }

  async getProductById(id) {
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        id, title, price, description, image_url, status, quantity, created_at,
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
        id, title, price, image_url, status, created_at,
        categories:category_id(id, name)
      `)
      .eq('seller_id', sellerId)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
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
