const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        this.from = process.env.SMTP_FROM || '"UniTrade OAU" <noreply@unitrade.oau>';
    }

    async send(to, subject, html) {
        // Skip if SMTP is not configured
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log(`[Email] SMTP not configured. Would have sent to ${to}: "${subject}"`);
            return;
        }

        try {
            await this.transporter.sendMail({ from: this.from, to, subject, html });
            console.log(`[Email] Sent to ${to}: "${subject}"`);
        } catch (err) {
            console.error(`[Email] Failed to send to ${to}:`, err.message);
        }
    }

    async sendApprovalEmail(user) {
        const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #f9fafb; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #059669; margin: 0; font-size: 24px;">🎉 Welcome to UniTrade!</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 16px;">Hi <strong>${user.name}</strong>,</p>
          <p style="color: #6b7280; line-height: 1.6;">
            Great news! Your access request has been <strong style="color: #059669;">approved</strong>. 
            You can now log in to UniTrade OAU and start buying and selling on campus.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/login"
               style="display: inline-block; background: #059669; color: white; padding: 12px 32px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Log In Now
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">
            — The UniTrade OAU Team
          </p>
        </div>
      </div>
    `;

        await this.send(user.oau_email, '🎉 Your UniTrade account has been approved!', html);
    }

    async sendVerificationEmail(user) {
        const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #f0f9ff; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1d9bf0; margin: 0; font-size: 24px;">✅ You're Verified!</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 16px;">Hi <strong>${user.name}</strong>,</p>
          <p style="color: #6b7280; line-height: 1.6;">
            Congratulations! Your seller account has been <strong style="color: #1d9bf0;">verified</strong>. 
            You now have a blue checkmark ✅ next to your store name, showing buyers that you're a trusted seller.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/profile"
               style="display: inline-block; background: #1d9bf0; color: white; padding: 12px 32px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              View Your Profile
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">
            — The UniTrade OAU Team
          </p>
        </div>
      </div>
    `;

        await this.send(user.oau_email, '✅ Your UniTrade seller account is now verified!', html);
    }
}

module.exports = EmailService;
