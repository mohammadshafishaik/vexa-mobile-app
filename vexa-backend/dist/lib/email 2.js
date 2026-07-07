import nodemailer from 'nodemailer';
const emailUser = process.env.SMTP_USER?.trim() || process.env.EMAIL_USER?.trim() || '';
const emailPass = process.env.SMTP_PASS?.trim() || process.env.EMAIL_PASS?.trim() || '';
const smtpHost = process.env.SMTP_HOST?.trim() || '';
const smtpPort = Number(process.env.SMTP_PORT || '587');
const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const fromName = process.env.EMAIL_FROM_NAME?.trim() || 'VEXA App';
const fromAddress = process.env.EMAIL_FROM?.trim() || emailUser;
let mailMode = 'none';
let transporter = null;
if (smtpHost && emailUser && emailPass) {
    mailMode = 'smtp';
    transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });
}
else if (emailUser && emailPass) {
    mailMode = 'gmail';
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });
}
export function isEmailConfigured() {
    return !!transporter;
}
export async function verifyEmailTransport() {
    if (!transporter) {
        console.warn('[Email] Transport not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS.');
        return;
    }
    try {
        await transporter.verify();
        console.log(`[Email] Transport ready (${mailMode}) as ${fromAddress}`);
    }
    catch (error) {
        console.error('[Email] Transport verification failed:', error);
    }
}
export async function sendPasswordResetEmail(to, resetToken) {
    if (!transporter || !fromAddress) {
        console.error('[Email] Password reset email not sent: transport is not configured.');
        return false;
    }
    const resetBaseUrl = (process.env.PASSWORD_RESET_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${resetBaseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;
    const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to,
        subject: 'VEXA — Password Reset Request',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #111; color: #fff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #fff; font-size: 28px; margin: 0;">VEXA</h1>
          <p style="color: #999; font-size: 14px;">Service Marketplace</p>
        </div>
        <div style="background-color: #1a1a1a; padding: 24px; border-radius: 8px; border: 1px solid #333;">
          <h2 style="color: #fff; margin-top: 0;">Password Reset</h2>
          <p style="color: #ccc; line-height: 1.6;">
            You recently requested to reset your password for your VEXA account. 
            Click the button below to reset it.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" 
               style="background-color: #fff; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #999; font-size: 13px; line-height: 1.5;">
            If you didn't request a password reset, you can safely ignore this email. 
            This link will expire in 30 minutes.
          </p>
          <hr style="border: none; border-top: 1px solid #333; margin: 16px 0;" />
          <p style="color: #666; font-size: 12px;">
            If the button doesn't work, copy and paste this URL into your browser:<br/>
            <a href="${resetUrl}" style="color: #888;">${resetUrl}</a>
          </p>
        </div>
        <p style="text-align: center; color: #666; font-size: 12px; margin-top: 16px;">
          © ${new Date().getFullYear()} VEXA. All rights reserved.
        </p>
      </div>
    `,
    };
    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`[Email] Password reset email sent to ${to} (messageId: ${result.messageId})`);
        return true;
    }
    catch (error) {
        console.error('[Email] Failed to send password reset email:', error);
        return false;
    }
}
export default transporter;
//# sourceMappingURL=email%202.js.map