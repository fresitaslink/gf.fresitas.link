import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Phone-based login without passwords
 * Two-step: requestCode() → verifyCode()
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, phone, code, full_name } = await req.json();

    if (!action || !['request_code', 'verify_code'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!phone || !/^[0-9+\-\s()]{10,}$/.test(phone)) {
      return Response.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Normalize phone
    const normalizedPhone = phone.replace(/[^\d+]/g, '');

    if (action === 'request_code') {
      // Generate 6-digit code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Store code in temp cache (in production, use Redis)
      // For now, we'll return a demo response
      // In real setup, this would be stored in a cache with TTL
      const demoCode = '123456'; // For testing

      // Send SMS
      try {
        await base44.integrations.Core.SendEmail({
          to: 'sms@placeholder.com', // Mock: actual SMS gateway would be used
          subject: `Código de verificación: ${demoCode}`,
          body: `Tu código de verificación para Fresitas G&F es: ${demoCode}\n\nEste código expira en 10 minutos.`
        });
      } catch (e) {
        console.log('SMS mock:', demoCode);
      }

      return Response.json({
        success: true,
        message: 'Código de verificación enviado al número registrado',
        demo_code: demoCode, // Remove in production
        expires_in_minutes: 10
      });
    }

    if (action === 'verify_code') {
      if (!code) {
        return Response.json({ error: 'Code required' }, { status: 400 });
      }

      // In production, verify code from cache
      // For now: accept demo code
      const isValid = code === '123456'; // Demo only

      if (!isValid) {
        return Response.json({ error: 'Invalid or expired code' }, { status: 401 });
      }

      // Check if customer exists, if not create
      const existingCustomers = await base44.asServiceRole.entities.CustomerProfile.filter(
        { phone: normalizedPhone }
      );

      let customer = existingCustomers[0];
      if (!customer) {
        // Auto-register customer
        // Get email from phone number or use temp email
        const tempEmail = `phone_${normalizedPhone.replace(/[^\d]/g, '')}@freshitas.local`;

        customer = await base44.asServiceRole.entities.CustomerProfile.create({
          user_email: tempEmail,
          display_name: full_name || 'Usuario Fresitas',
          phone: normalizedPhone,
          preferred_language: 'es',
          loyalty_points: 0,
          newsletter_subscribed: true
        });
      }

      return Response.json({
        success: true,
        message: 'Verificación exitosa',
        customer: {
          phone: normalizedPhone,
          display_name: customer.display_name,
          loyalty_points: customer.loyalty_points || 0
        },
        session_token: `session_${Date.now()}_${Math.random().toString(36)}`
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});