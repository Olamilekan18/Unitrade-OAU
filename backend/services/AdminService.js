class AdminService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async getSummary() {
    const [usersRes, pendingRes, listingsRes, ordersRes, bidsRes] = await Promise.all([
      this.supabase.from('users').select('id', { count: 'exact', head: true }),
      this.supabase.from('users').select('id', { count: 'exact', head: true }).eq('access_status', 'pending'),
      this.supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'available'),
      this.supabase.from('orders').select('id', { count: 'exact', head: true }),
      this.supabase.from('bids').select('id', { count: 'exact', head: true }),
    ]);

    const yearAgo = new Date();
    yearAgo.setDate(yearAgo.getDate() - 365);
    yearAgo.setHours(0, 0, 0, 0);

    const { data: signups, error: signupsError } = await this.supabase
      .from('users')
      .select('created_at')
      .gte('created_at', yearAgo.toISOString());

    if (signupsError) throw signupsError;

    const dayBuckets = {};
    for (let i = 0; i <= 365; i++) {
      const d = new Date(yearAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dayBuckets[key] = 0;
    }
    for (const row of signups || []) {
      const key = row.created_at.slice(0, 10);
      if (dayBuckets[key] !== undefined) dayBuckets[key] += 1;
    }

    return {
      totals: {
        users: usersRes.count || 0,
        pending_access: pendingRes.count || 0,
        active_listings: listingsRes.count || 0,
        orders: ordersRes.count || 0,
        bids: bidsRes.count || 0,
      },
      signupsDaily: Object.entries(dayBuckets).map(([date, count]) => ({ date, count })),
    };
  }

  async listUsers({ search, role, access_status }) {
    let query = this.supabase
      .from('users')
      .select('id, name, oau_email, department, access_status, is_verified, role, is_blocked, suspended_until, created_at, last_login')
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);
    if (access_status) query = query.eq('access_status', access_status);
    if (search) {
      query = query.or(`name.ilike.%${search}%,oau_email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    const users = data || [];
    if (!users.length) return users;

    const userIds = users.map((u) => u.id);

    const [{ data: orderRows, error: ordersError }, { data: productRows, error: productsError }] = await Promise.all([
      this.supabase.from('orders').select('buyer_id').in('buyer_id', userIds),
      this.supabase.from('products').select('seller_id').in('seller_id', userIds),
    ]);

    if (ordersError) throw ordersError;
    if (productsError) throw productsError;

    const orderCounts = (orderRows || []).reduce((acc, row) => {
      acc[row.buyer_id] = (acc[row.buyer_id] || 0) + 1;
      return acc;
    }, {});

    const productCounts = (productRows || []).reduce((acc, row) => {
      acc[row.seller_id] = (acc[row.seller_id] || 0) + 1;
      return acc;
    }, {});

    return users.map((u) => ({
      ...u,
      order_count: orderCounts[u.id] || 0,
      product_count: productCounts[u.id] || 0,
    }));
  }

  async listAccessRequests() {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, name, oau_email, department, access_status, created_at')
      .eq('access_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async listVerificationRequests() {
    const { data, error } = await this.supabase
      .from('verification_requests')
      .select(`
        id, reason, proof_url, status, created_at,
        user:user_id(id, name, oau_email, department, is_verified)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async listProducts() {
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        id, title, price, status, quantity, created_at,
        categories:category_id(id, name),
        users:seller_id(id, name, store_name, oau_email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateProductStatus(productId, status) {
    const { data, error } = await this.supabase
      .from('products')
      .update({ status })
      .eq('id', productId)
      .select('id, status')
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProduct(productId) {
    const { data, error } = await this.supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .select('id, title')
      .single();

    if (error) throw error;
    return data;
  }

  async listOrders() {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        id, amount, status, created_at, updated_at,
        products:product_id(id, title),
        buyer:buyer_id(id, name, oau_email),
        seller:seller_id(id, name, oau_email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async listAuditLogs(limit = 200) {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, metadata, created_at, actor:actor_id(id, name, oau_email)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async listMessages({ search } = {}) {
    let query = this.supabase
      .from('messages')
      .select(`
        id, content, image_url, offer_price, offer_status, created_at,
        sender:sender_id(id, name, oau_email),
        conversation:conversation_id(
          id,
          buyer:buyer_id(id, name, oau_email),
          seller:seller_id(id, name, oau_email),
          product:product_id(id, title)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async listConversations() {
    const { data, error } = await this.supabase
      .from('conversations')
      .select(`
        id, buyer_id, seller_id, product_id, updated_at, created_at,
        buyer:buyer_id(id, name, oau_email),
        seller:seller_id(id, name, oau_email),
        product:product_id(id, title, price)
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const enriched = await Promise.all(
      (data || []).map(async (conv) => {
        const { data: lastMsg } = await this.supabase
          .from('messages')
          .select('content, sender_id, image_url, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...conv,
          lastMessage: lastMsg || null
        };
      })
    );

    return enriched;
  }

  async listConversationMessages(conversationId) {
    const { data, error } = await this.supabase
      .from('messages')
      .select(`
        id, conversation_id, sender_id, content, image_url, offer_price, offer_status, is_read, created_at,
        sender:sender_id(id, name, oau_email)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async listMessageReports() {
    const { data, error } = await this.supabase
      .from('message_reports')
      .select(`
        id, reason, status, created_at,
        reporter:reporter_id(id, name, oau_email),
        reported_user:reported_user_id(id, name, oau_email),
        message:message_id(id, content, created_at),
        conversation:conversation_id(
          id,
          buyer:buyer_id(id, name, oau_email),
          seller:seller_id(id, name, oau_email),
          product:product_id(id, title)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return data || [];
  }

  async listConversationReports() {
    const { data, error } = await this.supabase
      .from('conversation_reports')
      .select(`
        id, reason, status, created_at,
        reporter:reporter_id(id, name, oau_email),
        reported_user:reported_user_id(id, name, oau_email),
        conversation:conversation_id(
          id,
          buyer:buyer_id(id, name, oau_email),
          seller:seller_id(id, name, oau_email),
          product:product_id(id, title)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return data || [];
  }

  async listAccountReports() {
    const { data, error } = await this.supabase
      .from('account_reports')
      .select(`
        id, reason, status, created_at,
        reporter:reporter_id(id, name, oau_email),
        reported_user:reported_user_id(id, name, oau_email)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return data || [];
  }

  async blockUser(userId, isBlocked) {
    const { data, error } = await this.supabase
      .from('users')
      .update({ is_blocked: isBlocked })
      .eq('id', userId)
      .select('id, is_blocked')
      .single();

    if (error) throw error;
    return data;
  }

  async suspendUser(userId, suspendedUntil) {
    const { data, error } = await this.supabase
      .from('users')
      .update({ suspended_until: suspendedUntil })
      .eq('id', userId)
      .select('id, suspended_until')
      .single();

    if (error) throw error;
    return data;
  }

  async setRole(userId, role) {
    const { data, error } = await this.supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select('id, role')
      .single();

    if (error) throw error;
    return data;
  }

  async createPromotion({ title, message, audience, userIds }) {
    let users = [];

    if (audience === 'all') {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, oau_email, name')
        .eq('access_status', 'approved');
      if (error) throw error;
      users = data || [];
    } else if (audience === 'pending') {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, oau_email, name')
        .eq('access_status', 'pending');
      if (error) throw error;
      users = data || [];
    } else if (audience === 'unverified') {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, oau_email, name')
        .eq('access_status', 'approved')
        .eq('is_verified', false);
      if (error) throw error;
      users = data || [];
    } else if (audience === 'selected' && userIds?.length) {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, oau_email, name')
        .in('id', userIds);
      if (error) throw error;
      users = data || [];
    }

    return users;
  }
}

module.exports = AdminService;
