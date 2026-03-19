const EmailService = require('./EmailService');

const DEFAULT_DAILY_LIMIT = 300;

class PromoService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.emailService = new EmailService();
  }

  getEmailConfigStatus() {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return { ok: false, reason: 'Missing SMTP_USER or SMTP_PASS' };
    }
    return { ok: true };
  }

  async createPromotion({ title, message, audience, sendEmail, actorId }) {
    const { data, error } = await this.supabase
      .from('promotions')
      .insert({
        title,
        message,
        audience,
        send_email: !!sendEmail,
        created_by: actorId || null,
      })
      .select('id, title, message, audience, send_email, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  async enqueueRecipients(promotionId, userIds) {
    if (!userIds.length) return 0;
    const payload = userIds.map((id) => ({
      promotion_id: promotionId,
      user_id: id,
      status: 'pending',
    }));

    const { error } = await this.supabase
      .from('promotion_recipients')
      .insert(payload);

    if (error) throw error;
    return userIds.length;
  }

  async sendPendingBatch(limit = DEFAULT_DAILY_LIMIT, promotionId = null) {
    const config = this.getEmailConfigStatus();
    if (!config.ok) {
      return { attempted: 0, sent: 0, failed: 0, error: `Email not configured: ${config.reason}` };
    }

    let query = this.supabase
      .from('promotion_recipients')
      .select(`
        id, user_id,
        promotions:promotion_id(id, title, message, send_email),
        users:user_id(oau_email, name)
      `)
      .eq('status', 'pending')
      .order('id', { ascending: true })
      .limit(limit);

    if (promotionId) {
      query = query.eq('promotion_id', promotionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    const recipients = data || [];

    let sent = 0;
    let failed = 0;
    const errorSamples = [];

    for (const item of recipients) {
      const promo = item.promotions;
      const user = item.users;
      if (!promo?.send_email) {
        await this._markRecipient(item.id, 'sent');
        sent += 1;
        continue;
      }

      try {
        const html = `
          <div style="font-family: 'Inter', sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #f9fafb; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #059669; margin: 0; font-size: 24px;">🌟 UniTrade Update</h1>
            </div>
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px;">Hi <strong>${user.name}</strong>,</p>
              <div style="color: #4b5563; line-height: 1.6; margin-top: 16px;">
                ${promo.message.replace(/\n/g, '<br>')}
              </div>
              <div style="text-align: center; margin: 32px 0 16px;">
                <a href="${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}"
                   style="display: inline-block; background: #059669; color: white; padding: 12px 32px;
                          border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Visit UniTrade
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 13px; text-align: center;">
                &mdash; The UniTrade OAU Team
              </p>
            </div>
          </div>
        `;

        await this.emailService.send(user.oau_email, promo.title, html);
        await this._markRecipient(item.id, 'sent');
        sent += 1;
      } catch (err) {
        await this._markRecipient(item.id, 'failed');
        failed += 1;
        if (errorSamples.length < 3 && err?.message) {
          errorSamples.push(err.message);
        }
      }
    }

    return {
      attempted: recipients.length,
      sent,
      failed,
      error: errorSamples.length ? errorSamples[0] : null,
      errorSamples,
    };
  }

  async _markRecipient(id, status) {
    const { error } = await this.supabase
      .from('promotion_recipients')
      .update({
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      })
      .eq('id', id);

    if (error) throw error;
  }
}

module.exports = PromoService;
