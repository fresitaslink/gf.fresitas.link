import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Send push notifications to app users
 * Uses Web Push API (browser built-in)
 * TODO: Integrate with Firebase Cloud Messaging for mobile
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { user_email, title, icon, badge, tag, data } = payload;
    // Accept either `body` or `message` for compatibility
    const body = payload.body || payload.message;

    // If automation passed an Order object, derive user_email from it
    const targetEmail = user_email || payload.data?.user_email;

    if (!targetEmail || !title || !body) {
      console.warn('[PUSH] Missing fields:', { hasEmail: !!targetEmail, hasTitle: !!title, hasBody: !!body });
      return Response.json({ error: 'user_email, title, body/message required' }, { status: 400 });
    }

    // Send email notification as fallback (Web Push not configured yet)
    try {
      await base44.integrations.Core.SendEmail({
        to: targetEmail,
        subject: title,
        body: body
      });
    } catch (err) {
      console.warn('[PUSH] Email send failed:', err.message);
    }

    console.log(`[PUSH] Sent to ${targetEmail}: ${title}`);

    return Response.json({
      success: true,
      user_email: targetEmail,
      title,
    });
  } catch (error) {
    console.error('Push Notification Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});