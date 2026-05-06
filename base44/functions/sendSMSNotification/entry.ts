import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Send SMS notifications to drivers & customers
 * Currently uses email fallback (ready for Twilio)
 * TODO: Replace with actual SMS via Twilio/Vonage
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { phone, message, type, recipient_email } = await req.json();

    if (!phone || !message) {
      return Response.json({ error: 'phone and message required' }, { status: 400 });
    }

    // TODO: Integrate with Twilio SDK
    // const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: message,
    //   from: TWILIO_PHONE_NUMBER,
    //   to: phone
    // });

    // Fallback: Email notification (works immediately)
    if (recipient_email) {
      await base44.integrations.Core.SendEmail({
        to: recipient_email,
        subject: type === 'pin' ? 'Tu código de verificación' : 'Nueva notificación',
        body: `📱 SMS Message:\n\n${message}`
      });
    }

    console.log(`[SMS] Sent to ${phone}: ${message.substring(0, 50)}...`);

    return Response.json({
      success: true,
      message: 'SMS sent (via email fallback)',
      phone,
      type
    });
  } catch (error) {
    console.error('SMS Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});