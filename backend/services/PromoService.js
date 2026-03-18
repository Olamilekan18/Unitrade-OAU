const DEFAULT_DAILY_LIMIT = 300;

class PromoService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.brevoApiKey = process.env.BREVO_API_KEY;
    this.senderEmail = process.env.BREVO_SENDER_EMAIL;
    this.senderName = process.env.BREVO_SENDER_NAME || 'UniTrade OAU';
  }

  getEmailConfigStatus() {
    if (!this.brevoApiKey) {
      return { ok: false, reason: 'Missing BREVO_API_KEY' };
    }
    if (!this.senderEmail) {
      return { ok: false, reason: 'Missing BREVO_SENDER_EMAIL' };
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
      return { attempted: 0, sent: 0, failed: 0, error: `Brevo not configured: ${config.reason}` };
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
        await this._sendBrevoEmail({
          toEmail: user.oau_email,
          toName: user.name,
          subject: promo.title,
          html: `<p>${promo.message}</p>`,
        });
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

  async _sendBrevoEmail({ toEmail, toName, subject, html }) {
    const fetchFn = typeof fetch === 'function'
      ? fetch
      : (await import('node-fetch')).default;

    const res = await fetchFn('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.brevoApiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: toEmail, name: toName }],
        subject,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload?.message || 'Brevo send failed');
    }
  }
}

module.exports = PromoService;
