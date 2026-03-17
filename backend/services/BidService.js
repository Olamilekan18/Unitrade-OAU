class BidService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async getBidCount(productId) {
    const { count, error } = await this.supabase
      .from('bids')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId);

    if (error) throw error;
    return count || 0;
  }

  async createBid({ productId, bidderId, note }) {
    const { data: product, error: productError } = await this.supabase
      .from('products')
      .select('id, price, status, seller_id, quantity')
      .eq('id', productId)
      .maybeSingle();

    if (productError) throw productError;
    if (!product) {
      const err = new Error('Product not found.');
      err.status = 404;
      throw err;
    }

    if (Number(product.price) !== 0) {
      const err = new Error('Bids are only allowed on free items.');
      err.status = 400;
      throw err;
    }

    if (product.status !== 'available' || Number(product.quantity) <= 0) {
      const err = new Error('This item is no longer available.');
      err.status = 400;
      throw err;
    }

    if (product.seller_id === bidderId) {
      const err = new Error('You cannot bid on your own item.');
      err.status = 400;
      throw err;
    }

    const { data: existing, error: existingError } = await this.supabase
      .from('bids')
      .select('id')
      .eq('product_id', productId)
      .eq('bidder_id', bidderId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      const err = new Error('You already placed a bid on this item.');
      err.status = 400;
      throw err;
    }

    const { data, error } = await this.supabase
      .from('bids')
      .insert({
        product_id: productId,
        bidder_id: bidderId,
        note: note || '',
        status: 'pending'
      })
      .select('id, product_id, bidder_id, note, status, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  async getSellerBids(sellerId) {
    const { data: products, error: productsError } = await this.supabase
      .from('products')
      .select('id')
      .eq('seller_id', sellerId)
      .eq('price', 0);

    if (productsError) throw productsError;
    if (!products || products.length === 0) return [];

    const productIds = products.map((p) => p.id);

    const { data, error } = await this.supabase
      .from('bids')
      .select(`
        id, note, status, created_at,
        product:product_id(id, title, price, image_url, status, quantity),
        bidder:bidder_id(id, name, store_name, avatar_url, department, is_verified)
      `)
      .in('product_id', productIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getMyBid(productId, bidderId) {
    const { data, error } = await this.supabase
      .from('bids')
      .select('id, note, status, created_at, product_id')
      .eq('product_id', productId)
      .eq('bidder_id', bidderId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async updateBid(bidId, bidderId, note) {
    const { data: bid, error: bidError } = await this.supabase
      .from('bids')
      .select('id, status, product_id')
      .eq('id', bidId)
      .eq('bidder_id', bidderId)
      .maybeSingle();

    if (bidError) throw bidError;
    if (!bid) {
      const err = new Error('Bid not found.');
      err.status = 404;
      throw err;
    }

    if (bid.status !== 'pending') {
      const err = new Error('You can only edit a pending bid.');
      err.status = 400;
      throw err;
    }

    const { data: product, error: productError } = await this.supabase
      .from('products')
      .select('id, status, quantity')
      .eq('id', bid.product_id)
      .maybeSingle();

    if (productError) throw productError;
    if (!product || product.status !== 'available' || Number(product.quantity) <= 0) {
      const err = new Error('This item is no longer available.');
      err.status = 400;
      throw err;
    }

    const { data, error } = await this.supabase
      .from('bids')
      .update({ note: note || '' })
      .eq('id', bidId)
      .select('id, note, status, created_at, product_id')
      .single();

    if (error) throw error;
    return data;
  }

  async acceptBid(bidId, sellerId) {
    const { data: bid, error: bidError } = await this.supabase
      .from('bids')
      .select(`
        id, status, bidder_id,
        product:product_id(id, title, seller_id, status, price, quantity)
      `)
      .eq('id', bidId)
      .maybeSingle();

    if (bidError) throw bidError;
    if (!bid) {
      const err = new Error('Bid not found.');
      err.status = 404;
      throw err;
    }

    if (!bid.product || bid.product.seller_id !== sellerId) {
      const err = new Error('You are not allowed to accept this bid.');
      err.status = 403;
      throw err;
    }

    if (Number(bid.product.price) !== 0) {
      const err = new Error('Bids can only be accepted for free items.');
      err.status = 400;
      throw err;
    }

    if (bid.product.status !== 'available' || Number(bid.product.quantity) <= 0) {
      const err = new Error('This item is no longer available.');
      err.status = 400;
      throw err;
    }

    if (bid.status === 'accepted') {
      return bid;
    }

    const { error: acceptError } = await this.supabase
      .from('bids')
      .update({ status: 'accepted' })
      .eq('id', bidId);

    if (acceptError) throw acceptError;

    const { error: rejectError } = await this.supabase
      .from('bids')
      .update({ status: 'rejected' })
      .eq('product_id', bid.product.id)
      .neq('id', bidId)
      .eq('status', 'pending');

    if (rejectError) throw rejectError;

    const { error: productError } = await this.supabase
      .from('products')
      .update({ status: 'sold', quantity: 0 })
      .eq('id', bid.product.id);

    if (productError) throw productError;

    return { ...bid, status: 'accepted', product: { ...bid.product, status: 'sold', quantity: 0 } };
  }
}

module.exports = BidService;
