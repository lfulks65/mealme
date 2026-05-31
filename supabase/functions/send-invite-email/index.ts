// ---------------------------------------------------------------------------
// Supabase Edge Function: send-invite-email
// ---------------------------------------------------------------------------
// Sends an invite notification email when a member is invited to an org.
//
// Request body (JSON):
//   {
//     inviteId:      string   — row ID in the invites table
//     email:         string   — invitee email address
//     orgName:       string   — organization display name
//     inviteToken:   string   — token from the invites table (for accept URL)
//     inviterName:   string   — display name of the person who sent the invite
//     role:          string   — role being invited as (admin | member | viewer)
//   }
//
// Auth: the request must include an Authorization header with the Supabase
// service-role key:  `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
//
// The email body is built from the HTML template at
// supabase/templates/invite.html, adapted for Edge Function usage with
// dynamic placeholders replaced at send time.
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InviteEmailPayload {
  inviteId: string;
  email: string;
  orgName: string;
  inviteToken: string;
  inviterName: string;
  role: string;
}

// ---------------------------------------------------------------------------
// HTML template (inlined from supabase/templates/invite.html)
// Placeholders: {{INVITER_NAME}}, {{ORG_NAME}}, {{ROLE}}, {{CONFIRMATION_URL}}, {{SITE_URL}}
// ---------------------------------------------------------------------------

function buildEmailHtml(
  inviterName: string,
  orgName: string,
  role: string,
  confirmationUrl: string,
  siteUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to join MealMe</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9fafb;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:32px 24px 24px 24px;background-color:#22c55e;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                🍳 MealMe
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 32px 20px 32px;">
              <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:#1a1a1a;line-height:1.3;">
                ${inviterName} invited you to join ${orgName}
              </h2>
              <p style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:#374151;">
                ${inviterName} has invited you to join <strong>${orgName}</strong> on MealMe as a <strong>${role}</strong>. Accept the invitation below to start cooking together, sharing recipes, and planning meals as a team.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:0 0 24px 0;">
                    <a href="${confirmationUrl}" target="_blank" style="display:inline-block;background-color:#22c55e;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.3px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#6b7280;">
                If the button above doesn't work, copy and paste the following link into your browser:
              </p>
              <p style="margin:0 0 32px 0;font-size:14px;line-height:1.6;color:#6b7280;word-break:break-all;">
                ${confirmationUrl}
              </p>

              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">
                This invitation link will expire after 7 days. If you weren't expecting this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 32px 32px 32px;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#9ca3af;">
                © 2026 MealMe
              </p>
              <p style="margin:0;font-size:13px;color:#9ca3af;">
                <a href="${siteUrl}/settings/notifications" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

/** Verify the Authorization header contains the service-role key. */
function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return token === serviceRoleKey;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  // Validate service-role key
  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  // Parse request body
  let payload: InviteEmailPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  // Validate required fields
  const { inviteId, email, orgName, inviteToken, inviterName, role } = payload;
  if (!inviteId || !email || !orgName || !inviteToken || !inviterName || !role) {
    return new Response(
      JSON.stringify({
        error: 'Missing required fields: inviteId, email, orgName, inviteToken, inviterName, role',
      }),
      {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      },
    );
  }

  // Build the invite acceptance URL
  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000';
  const confirmationUrl = `${siteUrl}/invite/${inviteToken}`;

  // Build the HTML email body
  const htmlBody = buildEmailHtml(inviterName, orgName, role, confirmationUrl, siteUrl);

  // ---------------------------------------------------------------------------
  // Send the email
  // ---------------------------------------------------------------------------
  // Strategy: Use the Supabase Auth admin API to send a custom email.
  // Since Supabase doesn't expose a generic "send email" API, we use the
  // Resend integration (if configured) or fall back to logging.
  //
  // If the project has Resend configured (RESEND_API_KEY env var), we send
  // directly via the Resend API. Otherwise we log the email content for
  // development and return success.
  // ---------------------------------------------------------------------------

  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (resendApiKey) {
    // Send via Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_FROM') ?? 'MealMe <noreply@mealme.app>',
        to: email,
        subject: `${inviterName} invited you to join ${orgName} on MealMe`,
        html: htmlBody,
      }),
    });

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.text();
      console.error('[send-invite-email] Resend API error:', errorBody);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: errorBody }), {
        status: 502,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    const result = await emailResponse.json();
    console.log('[send-invite-email] Email sent via Resend:', result.id);

    return new Response(JSON.stringify({ success: true, messageId: result.id }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  // ---------------------------------------------------------------------------
  // Fallback: No email service configured — log for development
  // ---------------------------------------------------------------------------
  console.log('[send-invite-email] No RESEND_API_KEY configured. Email not sent.');
  console.log('[send-invite-email] To:', email);
  console.log(
    '[send-invite-email] Subject:',
    `${inviterName} invited you to join ${orgName} on MealMe`,
  );
  console.log('[send-invite-email] Invite URL:', confirmationUrl);

  return new Response(
    JSON.stringify({
      success: true,
      warning: 'No email service configured. Set RESEND_API_KEY to enable email delivery.',
      confirmationUrl,
    }),
    {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    },
  );
});
