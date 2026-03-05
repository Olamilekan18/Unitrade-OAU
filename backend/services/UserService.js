class UserService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async createAccessRequest(payload) {
    const { data, error } = await this.supabase
      .from('users')
      .insert({ ...payload, access_status: 'pending' })
      .select('id, name, oau_email, department, access_status, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  async getApprovedUserById(id) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, name, oau_email, department, access_status')
      .eq('id', id)
      .eq('access_status', 'approved')
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = UserService;
