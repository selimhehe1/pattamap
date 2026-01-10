/**
 * Password Reset Email Template
 *
 * PattaMap nightlife-themed HTML email template
 */

import { EmailTranslation } from '../translations.ts';

interface TemplateParams {
  translation: EmailTranslation;
  resetLink: string;
  userEmail: string;
}

export function renderPasswordResetEmail({ translation, resetLink, userEmail }: TemplateParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${translation.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; border: 1px solid rgba(0, 229, 255, 0.2); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(0, 229, 255, 0.1);">
              <div style="font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #00e5ff 0%, #ff6ec4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                PattaMap
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <!-- Heading -->
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #ffffff; text-align: center;">
                ${translation.heading}
              </h1>

              <!-- Intro text -->
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #b0b0b0; text-align: center;">
                ${translation.intro}
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00e5ff 0%, #00b8d4 100%); color: #0a0a0f; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 229, 255, 0.3);">
                      ${translation.buttonText}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry note -->
              <div style="background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.2); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 13px; color: #00e5ff; text-align: center;">
                  ⏱ ${translation.expiryNote}
                </p>
              </div>

              <!-- Ignore note -->
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #707070; text-align: center;">
                ${translation.ignoreNote}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid rgba(0, 229, 255, 0.1); text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #707070;">
                ${translation.footer}
              </p>
              <p style="margin: 0; font-size: 11px; color: #505050;">
                ${userEmail}
              </p>
            </td>
          </tr>
        </table>

        <!-- Fallback link -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px;">
          <tr>
            <td style="padding: 24px 20px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #505050; word-break: break-all;">
                If the button doesn't work, copy this link:<br>
                <a href="${resetLink}" style="color: #00e5ff; text-decoration: none;">${resetLink}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
