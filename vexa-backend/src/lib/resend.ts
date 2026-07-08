import nodemailer from 'nodemailer';

// ═══════════════════════════════════════════════════════════════════════════════
// VEXA 2.0 — Email Service (Resend)
// Sends transactional emails through the Resend API.
// ═══════════════════════════════════════════════════════════════════════════════

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@vexa.app';
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || 'VEXA';
const APP_URL = process.env.APP_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000';
const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_DOMAINS_URL = 'https://api.resend.com/domains';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE !== 'false';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM_NAME = process.env.EMAIL_FROM_NAME || RESEND_FROM_NAME;

const MAX_RETRIES = 1;
const BASE_DELAY_MS = 500;
const EMAILS_PER_SECOND = 100;

let recentSendTimestamps: number[] = [];
let smtpTransporter: nodemailer.Transporter | null = null;

if (!RESEND_API_KEY && SMTP_USER && SMTP_PASS) {
  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function formatFromAddress(): string {
  return `"${RESEND_FROM_NAME}" <${RESEND_FROM_EMAIL}>`;
}

function isRateLimitError(status: number): boolean {
  return status === 429 || status >= 500;
}

async function waitForRateLimitSlot(): Promise<void> {
  const now = Date.now();
  recentSendTimestamps = recentSendTimestamps.filter((timestamp) => now - timestamp < 1000);

  if (recentSendTimestamps.length < EMAILS_PER_SECOND) {
    recentSendTimestamps.push(now);
    return;
  }

  const oldestTimestamp = recentSendTimestamps[0];
  const waitMs = Math.max(0, 1000 - (now - oldestTimestamp));
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const refreshedNow = Date.now();
  recentSendTimestamps = recentSendTimestamps.filter((timestamp) => refreshedNow - timestamp < 1000);
  recentSendTimestamps.push(refreshedNow);
}

async function sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  if (!RESEND_API_KEY && !smtpTransporter) {
    console.error('[Email] Cannot send: no Resend or SMTP transport configured');
    return { success: false, error: 'Email service not configured' };
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await waitForRateLimitSlot();

      if (!RESEND_API_KEY && smtpTransporter) {
        const info = await smtpTransporter.sendMail({
          from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
          to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
          subject: options.subject,
          html: options.html,
          replyTo: options.replyTo,
        });

        console.log(`[Email] Sent via SMTP to ${options.to} (id: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      }

      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: formatFromAddress(),
          to: options.to,
          subject: options.subject,
          html: options.html,
          reply_to: options.replyTo,
        }),
      });

      const responseBody: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = responseBody?.error?.message || responseBody?.message || `Resend API returned ${response.status}`;
        if (isRateLimitError(response.status) && attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          console.warn(`[Email] Attempt ${attempt} failed (${errorMessage}), retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        console.error(`[Email] Failed after ${attempt} attempt(s):`, errorMessage);
        return { success: false, error: errorMessage };
      }

      const messageId = responseBody?.id;
      console.log(`[Email] Sent to ${options.to}${messageId ? ` (id: ${messageId})` : ''}`);
      return { success: true, messageId };
    } catch (error: any) {
      const message = error?.message || 'Unknown email error';

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[Email] Attempt ${attempt} failed (${message}), retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.error(`[Email] Failed after ${attempt} attempt(s):`, message);
      return { success: false, error: message };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

function baseLayout(content: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
${preheader ? `<meta name="description" content="${preheader}" />` : ''}
<title>VEXA</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
<tr><td style="text-align:center;padding-bottom:24px;">
  <h1 style="margin:0;font-size:32px;font-weight:800;color:#ffffff;letter-spacing:2px;">VEXA</h1>
  <p style="margin:4px 0 0;font-size:13px;color:#666;">Service Marketplace</p>
</td></tr>
<tr><td style="background-color:#141414;border-radius:16px;border:1px solid #262626;padding:32px;">
${content}
</td></tr>
<tr><td style="text-align:center;padding-top:24px;">
  <p style="margin:0;font-size:12px;color:#555;">
    © ${new Date().getFullYear()} VEXA. All rights reserved.<br/>
    <a href="${APP_URL}/unsubscribe" style="color:#666;text-decoration:underline;">Unsubscribe</a> · 
    <a href="${APP_URL}/privacy" style="color:#666;text-decoration:underline;">Privacy Policy</a>
  </p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function ctaButton(text: string, url: string): string {
  return `<div style="text-align:center;margin:28px 0;">
<a href="${url}" style="background:#ffffff;color:#000000;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">${text}</a>
</div>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
<td style="padding:8px 0;color:#888;font-size:14px;border-bottom:1px solid #222;">${label}</td>
<td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;border-bottom:1px solid #222;">${value}</td>
</tr>`;
}

export function isEmailConfigured(): boolean {
  return (!!RESEND_API_KEY && !!RESEND_FROM_EMAIL) || !!smtpTransporter;
}

export async function verifyEmailTransport(): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('[Email] Resend transport not configured.');
    return;
  }

  if (!RESEND_API_KEY && smtpTransporter) {
    try {
      await smtpTransporter.verify();
      console.log('[Email] SMTP fallback verified successfully!');
      return;
    } catch (error: any) {
      console.error('[Email] SMTP fallback verification failed:', error.message);
      return;
    }
  }

  try {
    const response = await fetch(RESEND_DOMAINS_URL, {
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Resend domains check returned ${response.status}`);
    }

    console.log('[Email] Resend transport verified successfully!');
  } catch (error: any) {
    console.error('[Email] Resend transport verification failed:', error.message);
  }
}

export async function verifyResendFromDomain(domain = RESEND_FROM_EMAIL.split('@')[1] || ''): Promise<{
  verified: boolean;
  domain?: string;
  status?: string;
  error?: string;
}> {
  if (!RESEND_API_KEY || !domain) {
    return { verified: false, error: 'Resend API key or from-domain is missing' };
  }

  try {
    const response = await fetch(RESEND_DOMAINS_URL, {
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Resend domains check returned ${response.status}`);
    }

    const payload = await response.json() as { data?: Array<{ name?: string; status?: string }> };
    const matchedDomain = payload.data?.find((entry) => entry.name?.toLowerCase() === domain.toLowerCase());

    return {
      verified: matchedDomain?.status === 'verified',
      domain: matchedDomain?.name || domain,
      status: matchedDomain?.status,
    };
  } catch (error: any) {
    return {
      verified: false,
      domain,
      error: error?.message || 'Failed to verify Resend domain',
    };
  }
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'Welcome to VEXA! 🎉',
    html: baseLayout(`
      <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">Welcome, ${name}!</h2>
      <p style="color:#ccc;line-height:1.7;font-size:15px;">
        We're thrilled to have you on board. VEXA connects you with verified service professionals in your area — from plumbing to electrical work, all in real time.
      </p>
      <p style="color:#ccc;line-height:1.7;font-size:15px;">Here's what you can do:</p>
      <ul style="color:#ccc;line-height:2;font-size:14px;padding-left:20px;">
        <li>Post a service request in seconds</li>
        <li>Get competitive bids from verified providers</li>
        <li>Track your provider in real time</li>
        <li>Pay securely with escrow protection</li>
      </ul>
      ${ctaButton('Get Started', `${APP_URL}`)}
    `, `Welcome to VEXA, ${name}! Start getting things done.`),
  });
}

export async function sendLoginOtpEmail(to: string, name: string, code: string) {
  return sendEmail({
    to,
    subject: 'Your VEXA Login OTP 🔑',
    html: baseLayout(`
      <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">Login Verification Code</h2>
      <p style="color:#ccc;line-height:1.7;font-size:15px;">Hi ${name}, use this One-Time Password (OTP) to log into your VEXA account:</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#ffffff;background:#1a1a1a;padding:16px 32px;border-radius:12px;border:2px solid #333;display:inline-block;">${code}</span>
      </div>
      <p style="color:#888;font-size:13px;text-align:center;">This OTP code expires in 5 minutes. Do not share this code with anyone.</p>
    `, `Your VEXA login OTP is ${code}`),
  });
}

export async function sendEmailVerificationEmail(to: string, name: string, code: string, token: string) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(to)}`;
  return sendEmail({
    to,
    subject: 'Verify your VEXA email',
    html: baseLayout(`
      <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">Verify Your Email</h2>
      <p style="color:#ccc;line-height:1.7;font-size:15px;">Hi ${name}, use this code to verify your email address:</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#ffffff;background:#1a1a1a;padding:16px 32px;border-radius:12px;border:2px solid #333;display:inline-block;">${code}</span>
      </div>
      <p style="color:#888;font-size:13px;text-align:center;">This code expires in 15 minutes.</p>
      <p style="color:#888;font-size:13px;text-align:center;">Or click the link below:</p>
      ${ctaButton('Verify Email', verifyUrl)}
    `, `Your VEXA verification code is ${code}`),
  });
}

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;
  return sendEmail({
    to,
    subject: 'VEXA — Password Reset Request',
    html: baseLayout(`
      <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">Password Reset</h2>
      <p style="color:#ccc;line-height:1.7;font-size:15px;">
        You requested to reset your password. Click the button below to set a new one.
      </p>
      ${ctaButton('Reset Password', resetUrl)}
      <p style="color:#888;font-size:13px;line-height:1.5;">
        This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #262626;margin:20px 0;" />
      <p style="color:#555;font-size:12px;">
        Link not working? Copy this URL:<br/>
        <a href="${resetUrl}" style="color:#888;word-break:break-all;">${resetUrl}</a>
      </p>
    `, 'Reset your VEXA password'),
  });
}

export async function sendJobPostedEmail(
  to: string,
  data: { name: string; jobTitle: string; orderId: string; category: string; location: string }
) {
  return sendEmail({
    to,
    subject: `Job Posted: ${data.jobTitle}`,
    html: baseLayout(`
      <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">Job Posted Successfully! ✅</h2>
      <p style="color:#ccc;line-height:1.7;font-size:15px;">Hi ${data.name}, your service request is live and providers can now bid on it.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
        ${infoRow('Order ID', data.orderId)}
        ${infoRow('Title', data.jobTitle)}
        ${infoRow('Category', data.category)}
        ${infoRow('Location', data.location)}
      </table>
      ${ctaButton('View Your Job', `${APP_URL}/jobs/${data.orderId}`)}
    `, `Your job "${data.jobTitle}" is now live on VEXA`),
  });
}

export async function sendProviderSelectedEmail(
  to: string,
  data: { providerName: string; jobTitle: string; orderId: string; customerName: string; amount: string; scheduledAt?: string }
) {
  return sendEmail({
    to,
    subject: `You've been selected for: ${data.jobTitle}`,
    html: baseLayout(`
      <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">🎉 You've Been Selected!</h2>
      <p style="color:#ccc;line-height:1.7;font-size:15px;">
        Hi ${data.providerName}, great news! ${data.customerName} has selected your bid.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
        ${infoRow('Job', data.jobTitle)}
        ${infoRow('Order ID', data.orderId)}
        ${infoRow('Customer', data.customerName)}
        ${infoRow('Amount', `₹${data.amount}`)}
        ${data.scheduledAt ? infoRow('Scheduled', data.scheduledAt) : ''}
      </table>
      ${ctaButton('View Job Details', `${APP_URL}/jobs/${data.orderId}`)}
    `, `You've been selected for "${data.jobTitle}" on VEXA`),
  });
}

export async function sendBidReceivedEmail(
  to: string,
  data: { customerName: string; jobTitle: string; orderId: string; providerName: string; bidAmount: string; estimatedDuration: string }
) {
  return sendEmail({
    to,
    subject: `New bid on: ${data.jobTitle}`,
    html: baseLayout(`
      <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">New Bid Received 📩</h2>
      <p style="color:#ccc;line-height:1.7;font-size:15px;">Hi ${data.customerName}, you have a new bid on your job.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
        ${infoRow('Job', data.jobTitle)}
        ${infoRow('Provider', data.providerName)}
        ${infoRow('Bid Amount', `₹${data.bidAmount}`)}
        ${infoRow('Est. Duration', data.estimatedDuration)}
      </table>
      ${ctaButton('Review Bid', `${APP_URL}/jobs/${data.orderId}/bids`)}
    `, `${data.providerName} bid ₹${data.bidAmount} on your job`),
  });
}

export async function sendModificationRequestEmail(
  to: string,
  data: { customerName: string; jobTitle: string; orderId: string; originalPrice: string; revisedPrice: string; reason: string }
) {
  return sendEmail({
    to,
    subject: `Modification Request: ${data.jobTitle}`,
    html: baseLayout(`
      <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">Modification Request 🔧</h2>
      <p style="color:#ccc;line-height:1.7;font-size:15px;">Hi ${data.customerName}, the provider has requested a modification to your job.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
        ${infoRow('Job', data.jobTitle)}
        ${infoRow('Original Price', `₹${data.originalPrice}`)}
        ${infoRow('Revised Price', `₹${data.revisedPrice}`)}
        ${infoRow('Reason', data.reason)}
      </table>
      ${ctaButton('Review & Respond', `${APP_URL}/jobs/${data.orderId}/modifications`)}
    `, `Price modification requested for "${data.jobTitle}"`),
  });
}

export async function sendPaymentSuccessEmail(
  to: string,
  data: { name: string; jobTitle: string; orderId: string; amount: string; gst: string; commission: string; total: string; paymentId: string }
) {
  return sendEmail({
    to,
    subject: `Payment Successful — ₹${data.total}`,
    html: baseLayout(`
      <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">Payment Successful ✅</h2>
      <p style="color:#ccc;line-height:1.7;font-size:15px;">Hi ${data.name}, your payment has been processed successfully.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
        ${infoRow('Job', data.jobTitle)}
        ${infoRow('Order ID', data.orderId)}
        ${infoRow('Service Amount', `₹${data.amount}`)}
        ${infoRow('GST (18%)', `₹${data.gst}`)}
        ${infoRow('Platform Fee', `₹${data.commission}`)}
        <tr>
          <td style="padding:12px 0;color:#fff;font-size:16px;font-weight:700;">Total Paid</td>
          <td style="padding:12px 0;color:#fff;font-size:16px;font-weight:700;text-align:right;">₹${data.total}</td>
        </tr>
      </table>
      <p style="color:#888;font-size:13px;">Payment ID: ${data.paymentId}</p>
      <p style="color:#888;font-size:13px;">Funds are held in escrow and will be released to the provider upon job completion.</p>
    `, `Payment of ₹${data.total} confirmed`),
  });
}

export async function sendEscrowReleasedEmail(
  to: string,
  data: { providerName: string; jobTitle: string; orderId: string; amount: string; platformFee: string; payout: string }
) {
  return sendEmail({
    to,
    subject: `Funds Released — ₹${data.payout}`,
    html: baseLayout(`
      <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">Escrow Released 💰</h2>
      <p style="color:#ccc;line-height:1.7;font-size:15px;">Hi ${data.providerName}, the escrow funds for your completed job have been released.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
        ${infoRow('Job', data.jobTitle)}
        ${infoRow('Order ID', data.orderId)}
        ${infoRow('Total Amount', `₹${data.amount}`)}
        ${infoRow('Platform Fee', `-₹${data.platformFee}`)}
        <tr>
          <td style="padding:12px 0;color:#4ade80;font-size:16px;font-weight:700;">Your Payout</td>
          <td style="padding:12px 0;color:#4ade80;font-size:16px;font-weight:700;text-align:right;">₹${data.payout}</td>
        </tr>
      </table>
      <p style="color:#888;font-size:13px;">The payout will be credited to your registered bank account within 2-3 business days.</p>
    `, `₹${data.payout} released to your account`),
  });
}

export async function sendDisputeUpdateEmail(
  to: string,
  data: { name: string; jobTitle: string; orderId: string; disputeStatus: string; updateMessage: string }
) {
  const statusColors: Record<string, string> = {
    OPEN: '#f59e0b',
    UNDER_REVIEW: '#3b82f6',
    RESOLVED: '#4ade80',
    ESCALATED: '#ef4444',
    CLOSED: '#888',
  };
  const color = statusColors[data.disputeStatus] || '#888';

  return sendEmail({
    to,
    subject: `Dispute Update: ${data.jobTitle}`,
    html: baseLayout(`
      <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">Dispute Update</h2>
      <p style="color:#ccc;line-height:1.7;font-size:15px;">Hi ${data.name}, there's an update on your dispute.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
        ${infoRow('Job', data.jobTitle)}
        ${infoRow('Order ID', data.orderId)}
        <tr>
          <td style="padding:8px 0;color:#888;font-size:14px;">Status</td>
          <td style="padding:8px 0;text-align:right;"><span style="color:${color};font-weight:700;font-size:14px;">${data.disputeStatus.replace(/_/g, ' ')}</span></td>
        </tr>
      </table>
      <div style="background:#1a1a1a;border-radius:8px;padding:16px;border:1px solid #333;margin:16px 0;">
        <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0;">${data.updateMessage}</p>
      </div>
      ${ctaButton('View Dispute', `${APP_URL}/disputes/${data.orderId}`)}
    `, `Dispute status: ${data.disputeStatus}`),
  });
}

export async function sendRatingReminderEmail(
  to: string,
  data: { name: string; jobTitle: string; orderId: string; providerName: string }
) {
  return sendEmail({
    to,
    subject: `Rate your experience with ${data.providerName}`,
    html: baseLayout(`
      <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">How was your experience? ⭐</h2>
      <p style="color:#ccc;line-height:1.7;font-size:15px;">
        Hi ${data.name}, your job "<strong>${data.jobTitle}</strong>" with ${data.providerName} has been completed. We'd love to hear how it went!
      </p>
      <p style="color:#888;font-size:14px;line-height:1.6;">
        Your review helps other customers make informed decisions and helps providers improve their service.
      </p>
      ${ctaButton('Leave a Review', `${APP_URL}/jobs/${data.orderId}/rate`)}
    `, `Rate ${data.providerName} for "${data.jobTitle}"`),
  });
}
