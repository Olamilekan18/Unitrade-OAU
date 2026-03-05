class CategoryService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async listCategories() {
    const { data, error } = await this.supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }
}

module.exports = CategoryService;
