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
        users:seller_id(id, name, department)
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
        users:seller_id(id, name, department)
      `)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

module.exports = ProductService;
