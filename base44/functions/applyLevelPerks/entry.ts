import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Recalculates a user's Fresitas Level based on their lifetime_points and:
 *  - Updates current_level field
 *  - On level-UP: creates a notification, sends email, awards bonus tier coupon, records unlock date
 *
 * Called from:
 *   - Entity automation on CustomerProfile.update when lifetime_points changes
 *   - Manually after big point awards (referrals, redemptions, etc.)
 */

const LEVELS = [
  { key: 'novata',   minPoints: 0,    name: 'Fresita Novata',     emoji: '🌱', color: '#10B981' },
  { key: 'amigable', minPoints: 250,  name: 'Fresita Amigable',   emoji: '🍓', color: '#E8294A' },
  { key: 'estrella', minPoints: 1000, name: 'Fresita Estrella',   emoji: '⭐', color: '#F59E0B' },
  { key: 'vip',      minPoints: 2500, name: 'Embajadora VIP',     emoji: '👑', color: '#A855F7' },
  { key: 'leyenda',  minPoints: 5000, name: 'Leyenda Fresitas',   emoji: '🏆', color: '#EAB308' },
];

const TIER_BONUS_PERCENT = { amigable: 5, estrella: 10, vip: 15, leyenda: 25 };

function computeLevel(points) {
  let cur = LEVELS[0];
  for (const l of LEVELS) {
    if (points >= l.minPoints) cur = l;
    else break;
  }
  return cur;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    // Support both direct invocation { user_email, profile_id }
    // and entity-automation payload { event, data, old_data, payload_too_large }
    let user_email = body.user_email;
    let profile_id = body.profile_id || body.event?.entity_id;
    if (body.event?.entity_name === 'CustomerProfile' && body.data) {
      user_email = user_email || body.data.user_email;
      profile_id = profile_id || body.event.entity_id;
      // Skip if lifetime_points didn't actually grow
      const oldLP = body.old_data?.lifetime_points || 0;
      const newLP = body.data?.lifetime_points || 0;
      if (newLP <= oldLP) {
        return Response.json({ skipped: 'lifetime_points did not increase' });
      }
    }
    if (!user_email && !profile_id) {
      return Response.json({ error: 'user_email or profile_id required' }, { status: 400 });
    }

    let profile;
    if (profile_id) {
      profile = await base44.asServiceRole.entities.CustomerProfile.get(profile_id);
    } else {
      const list = await base44.asServiceRole.entities.CustomerProfile.filter({ user_email });
      profile = list[0];
    }
    if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });

    const lifetime = profile.lifetime_points || profile.loyalty_points || 0;
    const newLevel = computeLevel(lifetime);
    const oldLevelKey = profile.current_level || 'novata';

    if (newLevel.key === oldLevelKey) {
      return Response.json({ unchanged: true, level: newLevel.key });
    }

    // Level UP! (or down — only act on UP)
    const oldIdx = LEVELS.findIndex(l => l.key === oldLevelKey);
    const newIdx = LEVELS.findIndex(l => l.key === newLevel.key);
    const isLevelUp = newIdx > oldIdx;

    const unlockedDates = profile.level_unlocked_dates || {};
    if (isLevelUp && !unlockedDates[newLevel.key]) {
      unlockedDates[newLevel.key] = new Date().toISOString();
    }

    await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
      current_level: newLevel.key,
      level_unlocked_dates: unlockedDates,
    });

    if (!isLevelUp) {
      return Response.json({ success: true, level: newLevel.key, level_up: false });
    }

    // Award bonus tier coupon
    const bonusPct = TIER_BONUS_PERCENT[newLevel.key] || 5;
    const couponCode = `LVL${newLevel.key.toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const validUntil = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await base44.asServiceRole.entities.PromoCode.create({
      code: couponCode,
      discount_type: 'percent',
      discount_value: bonusPct,
      min_order: 100,
      max_uses: 1,
      uses_count: 0,
      valid_until: validUntil,
      is_active: true,
      description_es: `Cupón nivel ${newLevel.name} — ${bonusPct}% off`,
      description_en: `${newLevel.name} level coupon — ${bonusPct}% off`,
    });

    // Bonus loyalty points on level up (10% of threshold)
    const bonusPoints = Math.floor(newLevel.minPoints * 0.05);
    if (bonusPoints > 0) {
      await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
        loyalty_points: (profile.loyalty_points || 0) + bonusPoints,
      });
      await base44.asServiceRole.entities.LoyaltyTransaction.create({
        user_email: profile.user_email,
        points: bonusPoints,
        type: 'bonus',
        description: `🎉 Bono por subir a nivel ${newLevel.name}`,
      });
    }

    // In-app notification
    await base44.asServiceRole.entities.Notification.create({
      user_email: profile.user_email,
      title_es: `${newLevel.emoji} ¡Subiste a nivel ${newLevel.name}!`,
      title_en: `${newLevel.emoji} You leveled up to ${newLevel.name}!`,
      message_es: `Desbloqueaste nuevos beneficios + ${bonusPoints} pts bonus + cupón ${couponCode} (${bonusPct}% off, 60 días)`,
      message_en: `You unlocked new perks + ${bonusPoints} bonus pts + coupon ${couponCode} (${bonusPct}% off, 60 days)`,
      type: 'loyalty',
      link: '/perfil',
    });

    // Email notification
    const emailHtml = `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:580px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)">
        <div style="background:linear-gradient(135deg,${newLevel.color},${newLevel.color}dd);padding:40px 30px;text-align:center">
          <p style="font-size:64px;margin:0">${newLevel.emoji}</p>
          <h1 style="color:white;font-size:26px;margin:14px 0 4px">¡Subiste de nivel!</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:18px;margin:0;font-weight:600">${newLevel.name}</p>
        </div>
        <div style="padding:32px;background:#fff">
          <p style="color:#333;font-size:16px;margin-bottom:20px">¡Felicidades, ${profile.display_name || 'Fresita'}! Has alcanzado <b>${lifetime.toLocaleString()} puntos de por vida</b> y desbloqueaste el nivel <b>${newLevel.name}</b>.</p>
          <div style="background:#FDE8EC;border:2px dashed ${newLevel.color};border-radius:12px;padding:18px;text-align:center;margin:24px 0">
            <p style="color:#666;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:2px">Tu cupón de bienvenida al nivel</p>
            <p style="font-size:24px;font-weight:900;color:${newLevel.color};letter-spacing:3px;margin:0">${couponCode}</p>
            <p style="color:#999;font-size:11px;margin:8px 0 0">${bonusPct}% off · Pedido mín. $100 · Válido 60 días</p>
          </div>
          <p style="color:#666;font-size:14px;margin-bottom:6px">Beneficios desbloqueados:</p>
          <ul style="color:#444;font-size:14px;line-height:1.9">
            <li>+${bonusPoints} puntos de bono inmediato 🎁</li>
            <li>${newLevel.key === 'amigable' ? '1 topping gratis en cada pedido' : ''}
                ${newLevel.key === 'estrella' ? 'Soporte prioritario 24/7 + 5 envíos gratis al mes' : ''}
                ${newLevel.key === 'vip' ? 'Productos exclusivos + envío SIEMPRE gratis + chat con el chef' : ''}
                ${newLevel.key === 'leyenda' ? 'DOBLE puntos + evento privado + co-creación de sabor' : ''}</li>
            <li>Multiplicador de puntos elevado en cada compra</li>
          </ul>
          <div style="text-align:center;margin-top:28px">
            <a href="/perfil" style="display:inline-block;background:${newLevel.color};color:white;padding:12px 28px;border-radius:24px;text-decoration:none;font-weight:600">Ver mi perfil</a>
          </div>
        </div>
      </div>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: profile.user_email,
      subject: `${newLevel.emoji} ¡Subiste a ${newLevel.name}! +${bonusPoints} pts bonus + cupón ${bonusPct}%`,
      body: emailHtml,
    }).catch(() => {});

    return Response.json({
      success: true,
      level_up: true,
      new_level: newLevel.key,
      old_level: oldLevelKey,
      coupon: couponCode,
      bonus_points: bonusPoints,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});