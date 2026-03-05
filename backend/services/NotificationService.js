class NotificationService {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    async create(userId, type, message) {
        const { data, error } = await this.supabase
            .from('notifications')
            .insert({ user_id: userId, type, message })
            .select('id, type, message, is_read, created_at')
            .single();

        if (error) throw error;
        return data;
    }

    async getForUser(userId) {
        const { data, error } = await this.supabase
            .from('notifications')
            .select('id, type, message, is_read, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        return data;
    }

    async markAsRead(notificationId, userId) {
        const { error } = await this.supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', userId);

        if (error) throw error;
    }

    async markAllAsRead(userId) {
        const { error } = await this.supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
    }

    async getUnreadCount(userId) {
        const { count, error } = await this.supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
        return count || 0;
    }
}

module.exports = NotificationService;
