import nodemailer from 'nodemailer';

import { logger } from './logger.js';

const {
  EMAIL_PROVIDER,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
} = process.env;

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: SMTP_HOST || 'localhost',
  port: parseInt(SMTP_PORT || '1025', 10),
  secure: false, // true for 465, false for other ports
  auth: SMTP_USER ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
});

/**
 * Sends an OTP email.
 * @param {string} to 
 * @param {string} otp 
 */
export async function sendOtpEmail(to, otp) {
  const subject = 'Your Coddite Verification Code';
  const text = `Your verification code is: ${otp}\n\nIt expires in 15 minutes. If you didn't request this, you can ignore this email.`;
  const html = `<p>Your verification code is: <strong>${otp}</strong></p><p>It expires in 15 minutes. If you didn't request this, you can ignore this email.</p>`;

  if (process.env.EMAIL_PROVIDER === 'resend') {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('[email] Skipping Resend because RESEND_API_KEY is not set');
      return;
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [to],
          subject,
          html,
          text
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(`Resend API error: ${JSON.stringify(data)}`);
      }
      logger.info(`[email] OTP sent to ${to} via Resend: ${data.id}`);
    } catch (err) {
      logger.error(`[email] Failed to send via Resend: ${err.message}`);
    }
    return;
  }

  // Fallback to SMTP
  if (EMAIL_PROVIDER !== 'smtp') {
    logger.warn(`[email] Skipping SMTP send because EMAIL_PROVIDER is ${EMAIL_PROVIDER}`);
    return;
  }

  const info = await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  logger.info(`[email] OTP sent to ${to} via SMTP: ${info.messageId}`);
}
