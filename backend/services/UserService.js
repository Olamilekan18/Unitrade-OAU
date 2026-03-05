const bcrypt = require('bcryptjs');

class UserService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async createAccessRequest(payload) {
    // Hash the password before storing
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(payload.password, salt);

    const { data, error } = await this.supabase
      .from('users')
      .insert({
        name: payload.name,
        oau_email: payload.oau_email,
        department: payload.department,
        password_hash,
        access_status: 'pending',
      })
      .select('id, name, oau_email, department, access_status, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  async authenticateUser(email, password) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, name, oau_email, department, access_status, password_hash, bio, phone, address, avatar_url, store_name, is_verified')
      .eq('oau_email', email)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const err = new Error('No account found with that email.');
      err.status = 404;
      throw err;
    }

    const valid = await bcrypt.compare(password, data.password_hash);
    if (!valid) {
      const err = new Error('Incorrect password.');
      err.status = 401;
      throw err;
    }

    if (data.access_status !== 'approved') {
      const err = new Error('Your access request is still pending approval.');
      err.status = 403;
      throw err;
    }

    // Don't send password_hash to the client
    const { password_hash: _, ...user } = data;
    return user;
  }

  async getApprovedUserById(id) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, name, oau_email, department, access_status, bio, phone, address, avatar_url, store_name, is_verified')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const err = new Error('User not found. Please check your User ID.');
      err.status = 404;
      throw err;
    }

    if (data.access_status !== 'approved') {
      const err = new Error('Your access request is still pending approval.');
      err.status = 403;
      throw err;
    }

    return data;
  }

  async getPublicProfile(id) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, name, department, bio, phone, address, avatar_url, store_name, is_verified, created_at')
      .eq('id', id)
      .eq('access_status', 'approved')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const err = new Error('User not found.');
      err.status = 404;
      throw err;
    }

    return data;
  }

  async updateProfile(id, updates) {
    // Only allow specific fields to be updated
    const allowed = ['name', 'bio', 'phone', 'address', 'avatar_url', 'store_name'];
    const safeUpdates = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        safeUpdates[key] = updates[key];
      }
    }

    const { data, error } = await this.supabase
      .from('users')
      .update(safeUpdates)
      .eq('id', id)
      .select('id, name, oau_email, department, bio, phone, address, avatar_url, store_name, is_verified')
      .single();

    if (error) throw error;
    return data;
  }

  async requestVerification(userId, reason) {
    const { data: existing } = await this.supabase
      .from('verification_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      const err = new Error('You already have a pending verification request.');
      err.status = 409;
      throw err;
    }

    const { data, error } = await this.supabase
      .from('verification_requests')
      .insert({ user_id: userId, reason })
      .select('id, reason, status, created_at')
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = UserService;
