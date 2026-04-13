import nodemailer from 'nodemailer';

// Create transporter — defaults to Gmail App Password
// For production, use a proper SMTP service (e.g., SendGrid, Mailgun)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'vexaapp.support@gmail.com',
    pass: process.env.EMAIL_PASS || '',
  },
});

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const resetUrl = `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;

  const mailOptions = {
    from: `"VEXA App" <${process.env.EMAIL_USER || 'vexaapp.support@gmail.com'}>`,
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
            This link will expire in 1 hour.
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
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Password reset email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send password reset email:', error);
    return false;
  }
}

export default transporter;
