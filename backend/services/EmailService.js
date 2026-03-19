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

  async sendNewMessageEmail({ recipientEmail, recipientName, senderName, messagePreview, productTitle }) {
    const previewText = messagePreview || 'Sent an attachment';
    const preview = previewText.length > 100 ? previewText.slice(0, 100) + '...' : previewText;
    const productLine = productTitle
      ? '<p style="color: #9ca3af; font-size: 13px;">Regarding: <strong>' + productTitle + '</strong></p>'
      : '';
    const frontendUrl = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #f9fafb; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #059669; margin: 0; font-size: 24px;">&#128172; New Message</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 16px;">Hi <strong>${recipientName}</strong>,</p>
          <p style="color: #6b7280; line-height: 1.6;">
            <strong>${senderName}</strong> sent you a message on UniTrade:
          </p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 3px solid #059669;">
            <p style="color: #374151; margin: 0; font-style: italic;">&ldquo;${preview}&rdquo;</p>
          </div>
          ${productLine}
          <div style="text-align: center; margin: 24px 0;">
            <a href="${frontendUrl}/chat"
               style="display: inline-block; background: #059669; color: white; padding: 12px 32px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              View Conversation
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">
            &mdash; The UniTrade OAU Team
          </p>
        </div>
      </div>
    `;

    await this.send(recipientEmail, 'New message from ' + senderName + ' on UniTrade', html);
  }

  async sendOrderConfirmationEmail({ buyerEmail, buyerName, productTitle, amount }) {
    const frontendUrl = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #f0fdf4; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #059669; margin: 0; font-size: 24px;">✅ Order Confirmed!</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 16px;">Hi <strong>${buyerName}</strong>,</p>
          <p style="color: #6b7280; line-height: 1.6;">
            Your payment for <strong>"${productTitle}"</strong> has been confirmed!
          </p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; color: #374151;"><strong>Amount:</strong> ₦${Number(amount).toLocaleString()}</p>
          </div>
          <p style="color: #6b7280; line-height: 1.6;">
            Please arrange delivery with the seller via chat. Once you receive the item, confirm delivery on your Orders page.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${frontendUrl}/orders"
               style="display: inline-block; background: #059669; color: white; padding: 12px 32px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              View My Orders
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">— The UniTrade OAU Team</p>
        </div>
      </div>
    `;
    await this.send(buyerEmail, `✅ Order confirmed: "${productTitle}"`, html);
  }

  async sendNewOrderEmail({ sellerEmail, sellerName, buyerName, productTitle, amount }) {
    const frontendUrl = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #fefce8; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ca8a04; margin: 0; font-size: 24px;">🎉 New Sale!</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 16px;">Hi <strong>${sellerName}</strong>,</p>
          <p style="color: #6b7280; line-height: 1.6;">
            <strong>${buyerName}</strong> just purchased your product <strong>"${productTitle}"</strong>!
          </p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; color: #374151;"><strong>Amount:</strong> ₦${Number(amount).toLocaleString()}</p>
          </div>
          <p style="color: #6b7280; line-height: 1.6;">
            Please arrange delivery with the buyer. You can chat with them on UniTrade.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${frontendUrl}/orders"
               style="display: inline-block; background: #ca8a04; color: white; padding: 12px 32px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              View Orders
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">— The UniTrade OAU Team</p>
        </div>
      </div>
    `;
    await this.send(sellerEmail, `🎉 New sale: "${productTitle}"`, html);
  }
  async sendNewBidEmail({ sellerEmail, sellerName, buyerName, productTitle, note }) {
    const frontendUrl = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const noteHtml = note
      ? `<div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 3px solid #ca8a04;">
           <p style="margin: 0; color: #374151; font-style: italic;">&ldquo;${note}&rdquo;</p>
         </div>`
      : '';

    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #fefce8; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ca8a04; margin: 0; font-size: 24px;">💡 New Bid Received!</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 16px;">Hi <strong>${sellerName}</strong>,</p>
          <p style="color: #6b7280; line-height: 1.6;">
            <strong>${buyerName}</strong> has placed a request to claim your item <strong>"${productTitle}"</strong>!
          </p>
          ${noteHtml}
          <div style="text-align: center; margin: 24px 0;">
            <a href="${frontendUrl}/chat"
               style="display: inline-block; background: #ca8a04; color: white; padding: 12px 32px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              View Bid
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">— The UniTrade OAU Team</p>
        </div>
      </div>
    `;
    await this.send(sellerEmail, `💡 New request for "${productTitle}"`, html);
  }

  async sendBidAcceptedEmail({ buyerEmail, buyerName, sellerName, productTitle }) {
    const frontendUrl = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #f0fdf4; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #059669; margin: 0; font-size: 24px;">🎊 Bid Accepted!</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 16px;">Hi <strong>${buyerName}</strong>,</p>
          <p style="color: #6b7280; line-height: 1.6;">
            Great news! <strong>${sellerName}</strong> has accepted your request for <strong>"${productTitle}"</strong>!
          </p>
          <p style="color: #6b7280; line-height: 1.6;">
            You can now proceed to chat with the seller to arrange pickup.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${frontendUrl}/chat"
               style="display: inline-block; background: #059669; color: white; padding: 12px 32px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Chat with Seller
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">— The UniTrade OAU Team</p>
        </div>
      </div>
    `;
    await this.send(buyerEmail, `🎊 Your request for "${productTitle}" was accepted!`, html);
  }

  async sendItemDeliveredEmail({ buyerEmail, buyerName, sellerName, productTitle }) {
    const frontendUrl = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #f0f9ff; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0284c7; margin: 0; font-size: 24px;">📦 Item Delivered</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 16px;">Hi <strong>${buyerName}</strong>,</p>
          <p style="color: #6b7280; line-height: 1.6;">
            <strong>${sellerName}</strong> has marked your order <strong>"${productTitle}"</strong> as delivered!
          </p>
          <p style="color: #6b7280; line-height: 1.6;">
            Please log in and confirm you have received the item in good condition, so that funds can be released to the seller.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${frontendUrl}/orders"
               style="display: inline-block; background: #0284c7; color: white; padding: 12px 32px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Confirm Delivery
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">— The UniTrade OAU Team</p>
        </div>
      </div>
    `;
    await this.send(buyerEmail, `📦 Update: "${productTitle}" has been delivered!`, html);
  }

  async sendReviewRequestEmail({ buyerEmail, buyerName, sellerName, sellerId, productTitle }) {
    const frontendUrl = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #faf5ff; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #9333ea; margin: 0; font-size: 24px;">⭐ Leave a Review</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 16px;">Hi <strong>${buyerName}</strong>,</p>
          <p style="color: #6b7280; line-height: 1.6;">
            We hope you're enjoying <strong>"${productTitle}"</strong>!
          </p>
          <p style="color: #6b7280; line-height: 1.6;">
            Congratulations on your successful order. Could you take a moment to rate and review <strong>${sellerName}</strong>? Your feedback helps other students on campus shop with confidence!
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${frontendUrl}/user/${sellerId}"
               style="display: inline-block; background: #9333ea; color: white; padding: 12px 32px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Review Seller
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center;">— The UniTrade OAU Team</p>
        </div>
      </div>
    `;
    await this.send(buyerEmail, `⭐ Tell us about your experience with ${sellerName}!`, html);
  }
}

module.exports = EmailService;

