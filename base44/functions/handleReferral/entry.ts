import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { referrer_email, new_user_email, order_id, referral_code } = body;

    if (!referrer_email || !new_user_email) {
      return Response.json({ error: 'referrer_email and new_user_email required' }, { status: 400 });
    }
    if (referrer_email === new_user_email) {
      return Response.json({ error: 'Cannot refer yourself' }, { status: 400 });
    }

    // Check if this user was already referred (prevent double-rewarding)
    const existingReferrals = await base44.asServiceRole.entities.ReferralRecord.filter({ referred_email: new_user_email });
    const alreadyCompleted = existingReferrals.find(r => r.status === 'completed');
    if (alreadyCompleted) {
      return Response.json({ skipped: 'already_rewarded' });
    }

    // Get settings for configurable points
    const settingsList = await base44.asServiceRole.entities.StoreSettings.list();
    const settings = settingsList[0] || {};
    const REFERRAL_POINTS = settings.referral_points || 50;
    const COUPON_DISCOUNT = 10; // 10% off coupon for both

    // Create or update ReferralRecord
    const existingPending = existingReferrals.find(r => r.status === 'pending' && r.referrer_email === referrer_email);
    if (existingPending) {
      await base44.asServiceRole.entities.ReferralRecord.update(existingPending.id, {
        status: 'completed',
        order_id: order_id || '',
        points_awarded: REFERRAL_POINTS,
      });
    } else {
      await base44.asServiceRole.entities.ReferralRecord.create({
        referrer_email,
        referred_email: new_user_email,
        referral_code: referral_code || '',
        status: 'completed',
        order_id: order_id || '',
        points_awarded: REFERRAL_POINTS,
      });
    }

    // Generate unique coupon codes
    const ts = Date.now().toString(36).toUpperCase();
    const referrerCouponCode = `REF${referral_code || ts}A`;
    const referredCouponCode = `REF${referral_code || ts}B`;
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days

    // Create coupons for both parties
    await Promise.all([
      base44.asServiceRole.entities.PromoCode.create({
        code: referrerCouponCode,
        discount_type: 'percent',
        discount_value: COUPON_DISCOUNT,
        min_order: 50,
        max_uses: 1,
        uses_count: 0,
        valid_until: validUntil,
        is_active: true,
        description_es: `Cupón de referido — ${COUPON_DISCOUNT}% de descuento`,
        description_en: `Referral coupon — ${COUPON_DISCOUNT}% off`,
      }),
      base44.asServiceRole.entities.PromoCode.create({
        code: referredCouponCode,
        discount_type: 'percent',
        discount_value: COUPON_DISCOUNT,
        min_order: 50,
        max_uses: 1,
        uses_count: 0,
        valid_until: validUntil,
        is_active: true,
        description_es: `Cupón de bienvenida referido — ${COUPON_DISCOUNT}% de descuento`,
        description_en: `Welcome referral coupon — ${COUPON_DISCOUNT}% off`,
      }),
    ]);

    // Award points to referrer + notifications
    const referrerProfiles = await base44.asServiceRole.entities.CustomerProfile.filter({ user_email: referrer_email });
    if (referrerProfiles[0]) {
      await base44.asServiceRole.entities.CustomerProfile.update(referrerProfiles[0].id, {
        loyalty_points: (referrerProfiles[0].loyalty_points || 0) + REFERRAL_POINTS,
      });
      await base44.asServiceRole.entities.LoyaltyTransaction.create({
        user_email: referrer_email,
        points: REFERRAL_POINTS,
        type: 'bonus',
        description: `Bono por referir a ${new_user_email}`,
        order_id: order_id || '',
      });
      await base44.asServiceRole.entities.Notification.create({
        user_email: referrer_email,
        title_es: `¡+${REFERRAL_POINTS} puntos y cupón de referido!`,
        title_en: `+${REFERRAL_POINTS} points and referral coupon!`,
        message_es: `¡Tu amigo hizo su primer pedido! Ganaste ${REFERRAL_POINTS} puntos y un cupón ${referrerCouponCode} de ${COUPON_DISCOUNT}% 🍓`,
        message_en: `Your friend placed their first order! You earned ${REFERRAL_POINTS} points and coupon ${referrerCouponCode} for ${COUPON_DISCOUNT}% off 🍓`,
        type: 'loyalty',
        link: '/referral',
      });
    }

    // Award points to new user + notifications
    const newUserProfiles = await base44.asServiceRole.entities.CustomerProfile.filter({ user_email: new_user_email });
    if (newUserProfiles[0]) {
      await base44.asServiceRole.entities.CustomerProfile.update(newUserProfiles[0].id, {
        loyalty_points: (newUserProfiles[0].loyalty_points || 0) + REFERRAL_POINTS,
      });
      await base44.asServiceRole.entities.LoyaltyTransaction.create({
        user_email: new_user_email,
        points: REFERRAL_POINTS,
        type: 'bonus',
        description: 'Bono de bienvenida por registro con referido',
        order_id: order_id || '',
      });
      await base44.asServiceRole.entities.Notification.create({
        user_email: new_user_email,
        title_es: `¡Bienvenida! +${REFERRAL_POINTS} pts y cupón de ${COUPON_DISCOUNT}%`,
        title_en: `Welcome! +${REFERRAL_POINTS} pts and ${COUPON_DISCOUNT}% coupon`,
        message_es: `¡Recibiste ${REFERRAL_POINTS} puntos y el cupón ${referredCouponCode} (${COUPON_DISCOUNT}% de descuento, válido 30 días)! 🍓🎉`,
        message_en: `You received ${REFERRAL_POINTS} points and coupon ${referredCouponCode} (${COUPON_DISCOUNT}% off, valid 30 days)! 🍓🎉`,
        type: 'loyalty',
        link: '/perfil',
      });
    }

    // Beautiful HTML email to referrer
    const referrerEmailHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 580px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #E8294A, #c0203b); padding: 36px 30px; text-align: center;">
          <p style="font-size: 48px; margin: 0;">🎉</p>
          <h1 style="color: white; font-size: 24px; margin: 12px 0 4px;">¡Referido Exitoso!</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 14px;">Fresitas G&F — Fresitas Club</p>
        </div>
        <div style="padding: 30px; background: #fff;">
          <p style="color: #333; font-size: 16px; margin-bottom: 24px;">¡Gracias por compartir Fresitas! Tu amigo hizo su primer pedido. 🍓</p>
          
          <div style="display: flex; gap: 12px; margin-bottom: 24px;">
            <div style="flex: 1; background: #FDE8EC; border-radius: 12px; padding: 16px; text-align: center;">
              <p style="font-size: 28px; font-weight: 900; color: #E8294A; margin: 0;">+${REFERRAL_POINTS}</p>
              <p style="color: #E8294A; font-size: 12px; margin: 4px 0 0;">Puntos Fresitas Club</p>
            </div>
            <div style="flex: 1; background: #F0FDF4; border-radius: 12px; padding: 16px; text-align: center;">
              <p style="font-size: 28px; font-weight: 900; color: #16A34A; margin: 0;">${COUPON_DISCOUNT}%</p>
              <p style="color: #16A34A; font-size: 12px; margin: 4px 0 0;">Cupón de descuento</p>
            </div>
          </div>

          <div style="background: #F9FAFB; border: 2px dashed #E8294A; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <p style="color: #666; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">Tu Cupón Personal</p>
            <p style="font-size: 22px; font-weight: 900; color: #E8294A; letter-spacing: 3px; margin: 0;">${referrerCouponCode}</p>
            <p style="color: #999; font-size: 11px; margin: 8px 0 0;">Válido por 30 días · ${COUPON_DISCOUNT}% descuento · Pedido mín. $50</p>
          </div>

          <p style="color: #666; font-size: 14px; margin-bottom: 4px;">¡Sigue invitando amigos y sube de nivel!</p>
          <ul style="color: #999; font-size: 13px; line-height: 2;">
            <li>🌱 1+ referidos → Fresita Amigable</li>
            <li>⭐ 3+ referidos → Fresita Estrella</li>
            <li>👑 7+ referidos → Embajadora Fresitas</li>
            <li>🏆 15+ referidos → Leyenda Fresitas</li>
          </ul>
        </div>
      </div>`;

    // Beautiful HTML email to new user
    const referredEmailHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 580px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #5C2D0E, #8B4513); padding: 36px 30px; text-align: center;">
          <p style="font-size: 48px; margin: 0;">🍓</p>
          <h1 style="color: #FDE8EC; font-size: 24px; margin: 12px 0 4px;">¡Bienvenida al Fresitas Club!</h1>
          <p style="color: rgba(253,232,236,0.7); margin: 0; font-size: 14px;">Gracias por unirte a nuestra comunidad</p>
        </div>
        <div style="padding: 30px; background: #fff;">
          <p style="color: #333; font-size: 16px; margin-bottom: 24px;">¡Tu primer pedido nos tiene muy contentos! Te damos la bienvenida con regalos especiales:</p>
          
          <div style="display: flex; gap: 12px; margin-bottom: 24px;">
            <div style="flex: 1; background: #FDE8EC; border-radius: 12px; padding: 16px; text-align: center;">
              <p style="font-size: 28px; font-weight: 900; color: #E8294A; margin: 0;">+${REFERRAL_POINTS}</p>
              <p style="color: #E8294A; font-size: 12px; margin: 4px 0 0;">Puntos de Bienvenida</p>
            </div>
            <div style="flex: 1; background: #F0FDF4; border-radius: 12px; padding: 16px; text-align: center;">
              <p style="font-size: 28px; font-weight: 900; color: #16A34A; margin: 0;">${COUPON_DISCOUNT}%</p>
              <p style="color: #16A34A; font-size: 12px; margin: 4px 0 0;">En tu próximo pedido</p>
            </div>
          </div>

          <div style="background: #F9FAFB; border: 2px dashed #16A34A; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <p style="color: #666; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px;">Tu Cupón de Bienvenida</p>
            <p style="font-size: 22px; font-weight: 900; color: #16A34A; letter-spacing: 3px; margin: 0;">${referredCouponCode}</p>
            <p style="color: #999; font-size: 11px; margin: 8px 0 0;">Válido por 30 días · ${COUPON_DISCOUNT}% descuento · Pedido mín. $50</p>
          </div>

          <p style="color: #666; font-size: 14px;">¡Y tú también puedes referir amigos y ganar más puntos! Visita tu perfil para ver tu código único. 🎁</p>
        </div>
      </div>`;

    await Promise.all([
      base44.asServiceRole.integrations.Core.SendEmail({
        to: referrer_email,
        subject: `🍓 ¡+${REFERRAL_POINTS} puntos + cupón ${referrerCouponCode} por tu referido!`,
        body: referrerEmailHtml,
      }).catch(() => {}),
      base44.asServiceRole.integrations.Core.SendEmail({
        to: new_user_email,
        subject: `🍓 ¡Bienvenida! +${REFERRAL_POINTS} puntos + cupón ${referredCouponCode} para ti`,
        body: referredEmailHtml,
      }).catch(() => {}),
    ]);

    return Response.json({ success: true, points_awarded: REFERRAL_POINTS, coupons: { referrer: referrerCouponCode, referred: referredCouponCode } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});