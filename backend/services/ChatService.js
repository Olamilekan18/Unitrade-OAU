class ChatService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Find existing conversation or create a new one
    async getOrCreateConversation(buyerId, sellerId, productId) {
        // Prevent chatting with yourself
        if (buyerId === sellerId) {
            const err = new Error('Cannot start a conversation with yourself');
            err.status = 400;
            throw err;
        }

        // Check if conversation already exists
        let query = this.supabase
            .from('conversations')
            .select('*')
            .eq('buyer_id', buyerId)
            .eq('seller_id', sellerId);

        if (productId) {
            query = query.eq('product_id', productId);
        } else {
            query = query.is('product_id', null);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) return existing;

        // Create new conversation
        const { data, error } = await this.supabase
            .from('conversations')
            .insert({ buyer_id: buyerId, seller_id: sellerId, product_id: productId || null })
            .select('*')
            .single();

        if (error) throw error;
        return data;
    }

    // List all conversations for a user (as buyer or seller)
    async getConversations(userId) {
        const { data, error } = await this.supabase
            .from('conversations')
            .select(`
        id, buyer_id, seller_id, product_id, updated_at, created_at,
        buyer:users!conversations_buyer_id_fkey(id, name, store_name, avatar_url, is_verified),
        seller:users!conversations_seller_id_fkey(id, name, store_name, avatar_url, is_verified),
        product:products!conversations_product_id_fkey(id, title, image_url, price)
      `)
            .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Attach last message and unread count for each conversation
        const enriched = await Promise.all(
            data.map(async (conv) => {
                // Last message
                const { data: lastMsg } = await this.supabase
                    .from('messages')
                    .select('content, sender_id, image_url, offer_price, offer_status, created_at')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                // Unread count (messages NOT sent by me that are unread)
                const { count } = await this.supabase
                    .from('messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('conversation_id', conv.id)
                    .neq('sender_id', userId)
                    .eq('is_read', false);

                return {
                    ...conv,
                    lastMessage: lastMsg || null,
                    unreadCount: count || 0,
                };
            })
        );

        return enriched;
    }

    // Get messages for a conversation (verify user is a participant)
    async getMessages(conversationId, userId) {
        // Verify participation
        const { data: conv, error: convError } = await this.supabase
            .from('conversations')
            .select('buyer_id, seller_id')
            .eq('id', conversationId)
            .single();

        if (convError || !conv) {
            const err = new Error('Conversation not found');
            err.status = 404;
            throw err;
        }

        if (conv.buyer_id !== userId && conv.seller_id !== userId) {
            const err = new Error('Not a participant in this conversation');
            err.status = 403;
            throw err;
        }

        const { data, error } = await this.supabase
            .from('messages')
            .select('id, conversation_id, sender_id, content, image_url, offer_price, offer_status, is_read, created_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    }

    // Send a message
    async sendMessage(conversationId, senderId, content, imageUrl = null, offerPrice = null) {
        if ((!content || !content.trim()) && !imageUrl && !offerPrice) {
            const err = new Error('Message content cannot be empty');
            err.status = 400;
            throw err;
        }

        // Verify sender is a participant
        const { data: conv, error: convError } = await this.supabase
            .from('conversations')
            .select('buyer_id, seller_id')
            .eq('id', conversationId)
            .single();

        if (convError || !conv) {
            const err = new Error('Conversation not found');
            err.status = 404;
            throw err;
        }

        if (conv.buyer_id !== senderId && conv.seller_id !== senderId) {
            const err = new Error('Not a participant in this conversation');
            err.status = 403;
            throw err;
        }

        // Insert message
        const { data, error } = await this.supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                content: content ? content.trim() : '',
                image_url: imageUrl,
                offer_price: offerPrice ? Number(offerPrice) : null,
                offer_status: offerPrice ? 'pending' : null
            })
            .select('id, conversation_id, sender_id, content, image_url, offer_price, offer_status, is_read, created_at')
            .single();

        if (error) throw error;

        // Update conversation's updated_at timestamp
        await this.supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

        return data;
    }

    // Mark all messages in a conversation as read (messages not sent by me)
    async markMessagesRead(conversationId, userId) {
        const { error } = await this.supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .neq('sender_id', userId)
            .eq('is_read', false);

        if (error) throw error;
    }

    // Total unread messages across all conversations
    async getUnreadCount(userId) {
        // Get all conversations where user is a participant
        const { data: convs } = await this.supabase
            .from('conversations')
            .select('id')
            .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

        if (!convs || convs.length === 0) return 0;

        const convIds = convs.map((c) => c.id);

        const { count } = await this.supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', convIds)
            .neq('sender_id', userId)
            .eq('is_read', false);

        return count || 0;
    }

    // Accept an offer
    async acceptOffer(messageId, userId) {
        // Find the message
        const { data: msg, error: msgErr } = await this.supabase
            .from('messages')
            .select('id, sender_id, offer_price, offer_status')
            .eq('id', messageId)
            .single();

        if (msgErr || !msg) {
            const err = new Error('Message not found');
            err.status = 404;
            throw err;
        }

        if (!msg.offer_price) {
            const err = new Error('This message is not an offer');
            err.status = 400;
            throw err;
        }

        if (msg.sender_id === userId) {
            const err = new Error('You cannot accept your own offer');
            err.status = 403;
            throw err;
        }

        if (msg.offer_status !== 'pending') {
            const err = new Error('Offer has already been ' + msg.offer_status);
            err.status = 400;
            throw err;
        }

        // Accept it
        const { data, error } = await this.supabase
            .from('messages')
            .update({ offer_status: 'accepted' })
            .eq('id', messageId)
            .select('*')
            .single();

        if (error) throw error;
        return data;
    }

    // Reject an offer
    async rejectOffer(messageId, userId) {
        const { data: msg, error: msgErr } = await this.supabase
            .from('messages')
            .select('id, sender_id, offer_price, offer_status')
            .eq('id', messageId)
            .single();

        if (msgErr || !msg) {
            const err = new Error('Message not found');
            err.status = 404;
            throw err;
        }

        if (!msg.offer_price) {
            const err = new Error('This message is not an offer');
            err.status = 400;
            throw err;
        }

        if (msg.sender_id === userId) {
            const err = new Error('You cannot reject your own offer');
            err.status = 403;
            throw err;
        }

        // Reject it
        const { data, error } = await this.supabase
            .from('messages')
            .update({ offer_status: 'rejected' })
            .eq('id', messageId)
            .select('*')
            .single();

        if (error) throw error;
        return data;
    }
}

module.exports = ChatService;
