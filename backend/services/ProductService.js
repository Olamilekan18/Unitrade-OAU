class ProductService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async createProduct(payload) {
    const { data, error } = await this.supabase
      .from('products')
      .insert(payload)
      .select(`
        id, title, price, description, image_url, status, created_at,
        categories:category_id(id, name),
        users:seller_id(id, name, department, store_name, is_verified, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  async getAvailableProducts() {
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        id, title, price, description, image_url, status, created_at,
        categories:category_id(id, name),
        users:seller_id(id, name, department, store_name, is_verified, avatar_url)
      `)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getProductById(id) {
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        id, title, price, description, image_url, status, created_at,
        categories:category_id(id, name),
        users:seller_id(id, name, department, store_name, is_verified, avatar_url, phone)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const err = new Error('Product not found.');
      err.status = 404;
      throw err;
    }

    return data;
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
}

module.exports = ProductService;
