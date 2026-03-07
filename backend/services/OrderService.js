class OrderService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  }

  /**
   * Initialize a payment: create a pending order + call Paystack to get auth URL
   */
  async initializePayment(buyerId, productId, offerId = null) {
    // 1. Fetch the product
    const { data: product, error: prodErr } = await this.supabase
      .from('products')
      .select('id, title, price, seller_id, status, quantity')
      .eq('id', productId)
      .single();

    if (prodErr || !product) {
      const err = new Error('Product not found.');
      err.status = 404;
      throw err;
    }

    if (product.status !== 'available' && product.quantity <= 0) {
      const err = new Error('This product is out of stock.');
      err.status = 400;
      throw err;
    }

    if (product.seller_id === buyerId) {
      const err = new Error('You cannot buy your own product.');
      err.status = 400;
      throw err;
    }

    // 2. Check for existing pending/paid order
    const { data: existing } = await this.supabase
      .from('orders')
      .select('id, status')
      .eq('buyer_id', buyerId)
      .eq('product_id', productId)
      .in('status', ['pending', 'paid'])
      .maybeSingle();

    if (existing) {
      const err = new Error(
        existing.status === 'paid'
          ? 'You have already purchased this product.'
          : 'You already have a pending order for this product.'
      );
      err.status = 409;
      throw err;
    }

    // 3. Get buyer email for Paystack
    const { data: buyer } = await this.supabase
      .from('users')
      .select('oau_email, name')
      .eq('id', buyerId)
      .single();

    let finalPrice = product.price;

    // Check if an offer was provided
    if (offerId) {
      const { data: offerMsg } = await this.supabase
        .from('messages')
        .select(`
          id, offer_price, offer_status,
          conversations!inner(product_id)
        `)
        .eq('id', offerId)
        .single();

      if (!offerMsg || offerMsg.offer_status !== 'accepted' || offerMsg.conversations.product_id !== productId) {
        const err = new Error('Invalid or unaccepted offer.');
        err.status = 400;
        throw err;
      }
      finalPrice = offerMsg.offer_price;
    }

    // 4. Create pending order
    const reference = `UTR_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { data: order, error: orderErr } = await this.supabase
      .from('orders')
      .insert({
        buyer_id: buyerId,
        seller_id: product.seller_id,
        product_id: productId,
        amount: finalPrice,
        status: 'pending',
        paystack_reference: reference,
      })
      .select('id, amount, status, paystack_reference, created_at')
      .single();

    if (orderErr) throw orderErr;

    // 5. Initialize Paystack transaction
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: buyer.oau_email,
        amount: Math.round(finalPrice * 100), // Paystack uses kobo
        reference,
        metadata: {
          order_id: order.id,
          product_title: product.title,
          buyer_name: buyer.name,
        },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      // Clean up the pending order
      await this.supabase.from('orders').delete().eq('id', order.id);
      throw new Error(paystackData.message || 'Payment initialization failed.');
    }

    return {
      order,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference,
    };
  }

  /**
   * Verify a Paystack payment and mark the order as paid
   */
  async verifyPayment(reference) {
    // 1. Call Paystack verify API
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
        },
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data.status !== 'success') {
      const err = new Error('Payment verification failed.');
      err.status = 400;
      throw err;
    }

    // 2. Find and update the order
    const { data: order, error: orderErr } = await this.supabase
      .from('orders')
      .select('id, buyer_id, seller_id, product_id, status')
      .eq('paystack_reference', reference)
      .single();

    if (orderErr || !order) {
      const err = new Error('Order not found for this reference.');
      err.status = 404;
      throw err;
    }

    if (order.status === 'paid' || order.status === 'delivered') {
      return order; // Already processed
    }

    // 3. Update order to paid
    const { data: updated, error: updateErr } = await this.supabase
      .from('orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .select(`
        id, amount, status, paystack_reference, created_at, updated_at,
        products:product_id(id, title, price, image_url),
        buyer:buyer_id(id, name, oau_email),
        seller:seller_id(id, name, store_name, oau_email)
      `)
      .single();

    if (updateErr) throw updateErr;

    // 4. Update Product Stock
    const { data: product, error: prodErr } = await this.supabase
      .from('products')
      .select('id, quantity')
      .eq('id', order.product_id)
      .single();

    if (!prodErr && product) {
      const newQuantity = Math.max(0, product.quantity - 1);
      const newStatus = newQuantity === 0 ? 'sold' : 'available';

      await this.supabase
        .from('products')
        .update({ quantity: newQuantity, status: newStatus })
        .eq('id', order.product_id);
    }

    return updated;
  }

  /**
   * Get orders for buyer
   */
  async getOrdersForBuyer(buyerId) {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        id, amount, status, paystack_reference, created_at, updated_at,
        products:product_id(id, title, price, image_url),
        seller:seller_id(id, name, store_name, avatar_url, is_verified)
      `)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Get orders for seller
   */
  async getOrdersForSeller(sellerId) {
    const { data, error } = await this.supabase
      .from('orders')
      .select(`
        id, amount, status, paystack_reference, created_at, updated_at,
        products:product_id(id, title, price, image_url),
        buyer:buyer_id(id, name, store_name, avatar_url)
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Buyer confirms delivery
   */
  async confirmDelivery(orderId, buyerId) {
    const { data: order, error: findErr } = await this.supabase
      .from('orders')
      .select('id, status, buyer_id')
      .eq('id', orderId)
      .single();

    if (findErr || !order) {
      const err = new Error('Order not found.');
      err.status = 404;
      throw err;
    }

    if (order.buyer_id !== buyerId) {
      const err = new Error('Only the buyer can confirm delivery.');
      err.status = 403;
      throw err;
    }

    if (order.status !== 'paid') {
      const err = new Error('Order must be in "paid" status to confirm delivery.');
      err.status = 400;
      throw err;
    }

    const { data: updated, error: updateErr } = await this.supabase
      .from('orders')
      .update({ status: 'delivered', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select(`
        id, amount, status, created_at, updated_at,
        products:product_id(id, title, image_url)
      `)
      .single();

    if (updateErr) throw updateErr;
    return updated;
  }

  /**
   * Check if a user has purchased a specific product (for review gating)
   */
  async hasPurchased(buyerId, productId) {
    const { data, error } = await this.supabase
      .from('orders')
      .select('id')
      .eq('buyer_id', buyerId)
      .eq('product_id', productId)
      .in('status', ['paid', 'delivered'])
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  }

  /**
   * Delete an order (for testing/reset purposes)
   */
  async deleteOrder(orderId, buyerId) {
    // 1. Get the order to verify ownership and product
    const { data: order, error: findErr } = await this.supabase
      .from('orders')
      .select('id, buyer_id, product_id, status')
      .eq('id', orderId)
      .single();

    if (findErr || !order) {
      const err = new Error('Order not found.');
      err.status = 404;
      throw err;
    }

    if (order.buyer_id !== buyerId) {
      const err = new Error('You can only delete your own orders.');
      err.status = 403;
      throw err;
    }

    // 2. Delete the order
    const { error: deleteErr } = await this.supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (deleteErr) throw deleteErr;

    // 3. If the order was paid or delivered, we should optionally mark the product as available again
    if (order.status === 'paid' || order.status === 'delivered') {
      const { data: product } = await this.supabase
        .from('products')
        .select('quantity')
        .eq('id', order.product_id)
        .single();

      if (product) {
        await this.supabase
          .from('products')
          .update({ 
            quantity: product.quantity + 1, 
            status: 'available' 
          })
          .eq('id', order.product_id);
      }
    }
    
    return true;
  }
}

module.exports = OrderService;
