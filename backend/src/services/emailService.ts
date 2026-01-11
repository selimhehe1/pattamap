/**
 * Email Service
 *
 * Simple email service using nodemailer.
 * Requires environment variables:
 * - SMTP_HOST (e.g., smtp.gmail.com)
 * - SMTP_PORT (e.g., 587)
 * - SMTP_USER (e.g., your-email@gmail.com)
 * - SMTP_PASS (e.g., app-specific password)
 * - ADMIN_EMAIL (recipient for admin notifications)
 *
 * If SMTP is not configured, emails will be logged to console instead.
 */

import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
  }>;
}

interface DeletionRequestEmailData {
  employeeId: string;
  employeeName: string;
  requesterEmail: string;
  message?: string;
  proofUrl: string;
}

// Check if SMTP is configured
const isSmtpConfigured = (): boolean => {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
};

// Lazy load nodemailer only when needed
let nodemailer: typeof import('nodemailer') | null = null;
let transporter: ReturnType<typeof import('nodemailer')['createTransport']> | null = null;

const getTransporter = async () => {
  if (!isSmtpConfigured()) {
    return null;
  }

  if (!nodemailer) {
    try {
      nodemailer = await import('nodemailer');
    } catch {
      logger.warn('Nodemailer not installed. Run: npm install nodemailer');
      return null;
    }
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
};

/**
 * Send an email
 * Falls back to console logging if SMTP is not configured
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  const transport = await getTransporter();

  if (!transport) {
    // Log email instead of sending
    logger.info('📧 EMAIL (not sent - SMTP not configured):', {
      to: options.to,
      subject: options.subject,
      text: options.text.substring(0, 200) + '...',
    });
    return true; // Return true so the request isn't rejected
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    });

    logger.info('📧 Email sent successfully', { to: options.to, subject: options.subject });
    return true;
  } catch (error) {
    logger.error('📧 Failed to send email:', error);
    return false;
  }
};

/**
 * Send a deletion request notification to admin
 */
export const sendDeletionRequestEmail = async (data: DeletionRequestEmailData): Promise<boolean> => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

  if (!adminEmail) {
    logger.warn('No ADMIN_EMAIL configured. Deletion request logged but not emailed.');
    logger.info('🗑️ DELETION REQUEST:', data);
    return true;
  }

  const subject = `[PattaMap] Demande de suppression de profil - ${data.employeeName}`;

  const text = `
Nouvelle demande de suppression de profil

═══════════════════════════════════════════
DÉTAILS DE LA DEMANDE
═══════════════════════════════════════════

Profil concerné:
- ID: ${data.employeeId}
- Nom: ${data.employeeName}

Demandeur:
- Email: ${data.requesterEmail}

Message:
${data.message || '(Aucun message)'}

Preuve d'identité:
${data.proofUrl}

═══════════════════════════════════════════
ACTIONS REQUISES
═══════════════════════════════════════════

1. Vérifier que la preuve correspond au profil
2. Si validé, supprimer le profil depuis l'admin
3. Répondre au demandeur pour confirmer la suppression

---
PattaMap - Système automatisé
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; }
    .section { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #667eea; }
    .label { font-weight: 600; color: #495057; }
    .value { color: #212529; }
    .proof-link { display: inline-block; background: #667eea; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin-top: 10px; }
    .actions { background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🗑️ Demande de suppression</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Un utilisateur demande la suppression de son profil</p>
    </div>
    <div class="content">
      <div class="section">
        <p class="label">Profil concerné</p>
        <p class="value"><strong>${data.employeeName}</strong><br>ID: ${data.employeeId}</p>
      </div>
      <div class="section">
        <p class="label">Email du demandeur</p>
        <p class="value"><a href="mailto:${data.requesterEmail}">${data.requesterEmail}</a></p>
      </div>
      ${data.message ? `
      <div class="section">
        <p class="label">Message</p>
        <p class="value">${data.message}</p>
      </div>
      ` : ''}
      <div class="section">
        <p class="label">Preuve d'identité</p>
        <a href="${data.proofUrl}" class="proof-link" target="_blank">📎 Voir la preuve</a>
      </div>
      <div class="actions">
        <p class="label">⚠️ Actions requises</p>
        <ol>
          <li>Vérifier que la preuve correspond au profil</li>
          <li>Si validé, supprimer le profil depuis l'admin</li>
          <li>Répondre au demandeur pour confirmer</li>
        </ol>
      </div>
    </div>
    <div class="footer">
      PattaMap - Système automatisé
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: adminEmail,
    subject,
    text,
    html,
  });
};

export default {
  sendEmail,
  sendDeletionRequestEmail,
  isSmtpConfigured,
};
