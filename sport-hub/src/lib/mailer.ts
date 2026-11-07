/**
 * Plain SMTP mailer (requirements FR-32). Configured with SMTP_HOST, SMTP_PORT,
 * SMTP_USER, SMTP_PASS and SMTP_FROM. Without SMTP_HOST, or locally with
 * DYNAMODB_LOCAL=true, mails are only logged.
 */

import nodemailer, { type Transporter } from 'nodemailer';

export interface Mail {
  to: string[];
  subject: string;
  text: string;
}

let transporter: Transporter | null = null;

const smtpConfigured = () => !!process.env.SMTP_HOST && process.env.DYNAMODB_LOCAL !== 'true';

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export async function sendMail(mail: Mail): Promise<void> {
  const to = [...new Set(mail.to.map(a => a.trim().toLowerCase()).filter(Boolean))];
  if (to.length === 0) return;
  if (!smtpConfigured()) {
    console.log(`[mail] (not sent, SMTP not configured) to: ${to.join(', ')}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
    return;
  }
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: mail.subject,
    text: mail.text,
  });
}

/** Absolute links in emails. */
export const siteUrl = (path: string) =>
  `${(process.env.SITE_URL || process.env.AUTH_URL || 'http://localhost:3000').replace(/\/$/, '')}${path}`;
