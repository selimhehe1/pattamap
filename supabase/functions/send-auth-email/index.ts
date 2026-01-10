/**
 * Supabase Edge Function: send-auth-email
 *
 * Handles the "Send Email" auth hook to send password reset emails
 * in the user's preferred language.
 *
 * Webhook payload structure:
 * {
 *   user: { id, email, user_metadata: { language: 'fr', ... } },
 *   email_data: { token, token_hash, redirect_to, ... }
 * }
 */

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { getTranslation } from './_shared/translations.ts';
import { renderPasswordResetEmail } from './_shared/templates/password-reset.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET');

interface WebhookPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      language?: string;
      pseudonym?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: 'recovery' | 'signup' | 'invite' | 'magiclink' | 'email_change';
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

Deno.serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();

    // Verify webhook signature
    if (HOOK_SECRET) {
      const wh = new Webhook(HOOK_SECRET);
      const headers: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        headers[key] = value;
      });

      try {
        wh.verify(rawBody, headers);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      console.warn('SEND_EMAIL_HOOK_SECRET not set - skipping signature verification');
    }

    // Parse payload
    const payload: WebhookPayload = JSON.parse(rawBody);
    const { user, email_data } = payload;

    console.log(`Processing ${email_data.email_action_type} email for ${user.email}`);

    // Only handle password recovery for now
    if (email_data.email_action_type !== 'recovery') {
      console.log(`Skipping email type: ${email_data.email_action_type}`);
      // Return success to let Supabase handle other email types
      return new Response(JSON.stringify({ success: true, handled: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user's preferred language (default to English)
    const userLang = user.user_metadata?.language || 'en';
    const translation = getTranslation(userLang);

    console.log(`Sending password reset email in language: ${userLang}`);

    // Build reset link
    // The redirect_to already contains the base URL, we need to add the token
    const resetLink = `${email_data.redirect_to}?token_hash=${email_data.token_hash}&type=recovery`;

    // Render email HTML
    const htmlContent = renderPasswordResetEmail({
      translation,
      resetLink,
      userEmail: user.email
    });

    // Check Resend API key
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'PattaMap <noreply@pattamap.com>',
        to: [user.email],
        subject: translation.subject,
        html: htmlContent
      })
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: resendResult }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Email sent successfully: ${resendResult.id}`);

    return new Response(JSON.stringify({
      success: true,
      handled: true,
      message_id: resendResult.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
