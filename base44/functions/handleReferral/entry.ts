import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { referrer_email, new_user_email, order_id } = body;

    if (!referrer_email || !new_user_email) {
      return Response.json({ error: 'referrer_email and new_user_email required' }, { status: 400 });
    }

    if (referrer_email === new_user_email) {
      return Response.json({ error: 'Cannot refer yourself' }, { status: 400 });
    }

    const REFERRAL_POINTS = 50;

    // Award points to referrer
    const referrerProfiles = await base44.asServiceRole.entities.CustomerProfile.filter({ user_email: referrer_email });
    if (referrerProfiles[0]) {
      const currentPoints = referrerProfiles[0].loyalty_points || 0;
      await base44.asServiceRole.entities.CustomerProfile.update(referrerProfiles[0].id, {
        loyalty_points: currentPoints + REFERRAL_POINTS
      });
      await base44.asServiceRole.entities.LoyaltyTransaction.create({
        user_email: referrer_email,
        points: REFERRAL_POINTS,
        type: 'bonus',
        description: `Bono por referir a ${new_user_email}`,
        order_id: order_id || ''
      });
      await base44.asServiceRole.entities.Notification.create({
        user_email: referrer_email,
        title_es: '¡Ganaste puntos por referir!',
        title_en: 'You earned referral points!',
        message_es: `¡Tu amigo ${new_user_email} hizo su primer pedido! Ganaste ${REFERRAL_POINTS} puntos Fresitas Club 🍓`,
        message_en: `Your friend ${new_user_email} placed their first order! You earned ${REFERRAL_POINTS} Fresitas Club points 🍓`,
        type: 'loyalty',
        link: '/perfil'
      });
    }

    // Award points to new user
    const newUserProfiles = await base44.asServiceRole.entities.CustomerProfile.filter({ user_email: new_user_email });
    if (newUserProfiles[0]) {
      const currentPoints = newUserProfiles[0].loyalty_points || 0;
      await base44.asServiceRole.entities.CustomerProfile.update(newUserProfiles[0].id, {
        loyalty_points: currentPoints + REFERRAL_POINTS
      });
      await base44.asServiceRole.entities.LoyaltyTransaction.create({
        user_email: new_user_email,
        points: REFERRAL_POINTS,
        type: 'bonus',
        description: 'Bono de bienvenida por registro con referido',
        order_id: order_id || ''
      });
      await base44.asServiceRole.entities.Notification.create({
        user_email: new_user_email,
        title_es: '¡Bienvenido al Fresitas Club!',
        title_en: 'Welcome to Fresitas Club!',
        message_es: `¡Recibiste ${REFERRAL_POINTS} puntos de bienvenida en Fresitas Club! 🍓🎉`,
        message_en: `You received ${REFERRAL_POINTS} welcome points in Fresitas Club! 🍓🎉`,
        type: 'loyalty',
        link: '/perfil'
      });
    }

    // Send email to referrer
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: referrer_email,
      subject: '🍓 ¡Ganaste 50 puntos por referir un amigo!',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #E8294A, #c0203b); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white;">🍓 ¡Gracias por referir!</h1>
          </div>
          <div style="padding: 24px; text-align: center;">
            <div style="font-size: 60px; margin: 16px 0;">🎉</div>
            <h2 style="color: #E8294A;">+${REFERRAL_POINTS} Puntos Fresitas Club</h2>
            <p style="color: #666;">Tu amigo <strong>${new_user_email}</strong> hizo su primer pedido usando tu enlace de referido.</p>
            <p style="color: #666;">¡Sigue compartiendo y ganando más puntos!</p>
          </div>
        </div>
      `
    });

    return Response.json({ success: true, points_awarded: REFERRAL_POINTS * 2 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});