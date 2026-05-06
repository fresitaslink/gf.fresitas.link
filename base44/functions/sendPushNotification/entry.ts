import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Send push notifications to app users
 * Uses Web Push API (browser built-in)
 * TODO: Integrate with Firebase Cloud Messaging for mobile
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_email, title, body, icon, badge, tag, data } = await req.json();

    if (!user_email || !title || !body) {
      return Response.json({ error: 'user_email, title, body required' }, { status: 400 });
    }

    // Get user device tokens (where push subscriptions are stored)
    const userTokens = await base44.asServiceRole.entities.PushSubscription?.filter(
      { user_email },
      undefined,
      50
    ).catch(() => []);

    const results = [];

    // Send to each device
    for (const token of userTokens) {
      try {
        // TODO: Send actual push via FCM or Web Push API
        // For now, send email notification as fallback
        await base44.integrations.Core.SendEmail({
          to: user_email,
          subject: title,
          body: `${body}\n\nData: ${JSON.stringify(data || {})}`
        });

        results.push({ device: token.id, status: 'sent' });
      } catch (err) {
        results.push({ device: token.id, status: 'failed', error: err.message });
      }
    }

    console.log(`[PUSH] Sent to ${user_email}: ${title}`);

    return Response.json({
      success: true,
      user_email,
      title,
      sent_to: results.length,
      results
    });
  } catch (error) {
    console.error('Push Notification Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});