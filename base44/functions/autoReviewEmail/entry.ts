import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// This function is called either:
// 1. By a scheduled automation every hour — scans for orders delivered 23-25h ago and sends review email
// 2. Directly with { order_id } for manual testing

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const appHost = req.headers.get('host') || 'uptight-fresitas-sweet-treats.base44.app';

    // If called with a specific order_id, process just that order
    if (body.order_id) {
      return await processOrder(base44, body.order_id, appHost);
    }

    // Scheduled mode: find orders delivered 23–25 hours ago that haven't been reviewed
    const now = new Date();
    const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25h ago
    const windowEnd = new Date(now.getTime() - 23 * 60 * 60 * 1000);   // 23h ago

    const deliveredOrders = await base44.asServiceRole.entities.Order.filter({ status: 'delivered' });

    const eligible = deliveredOrders.filter(order => {
      if (!order.user_email) return false;
      if (order.rating) return false; // already reviewed
      const updatedAt = new Date(order.updated_date);
      return updatedAt >= windowStart && updatedAt <= windowEnd;
    });

    const results = [];
    for (const order of eligible) {
      const r = await processOrder(base44, order.id, appHost);
      const data = await r.json();
      results.push({ order_id: order.id, ...data });
    }

    return Response.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error('autoReviewEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function processOrder(base44, order_id, appHost) {
  const order = await base44.asServiceRole.entities.Order.get(order_id).catch(() => null);
  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'delivered') return Response.json({ skipped: true, reason: 'Not delivered yet' });
  if (order.rating) return Response.json({ skipped: true, reason: 'Already reviewed' });
  if (!order.user_email) return Response.json({ skipped: true, reason: 'No user email' });

  const customerName = order.customer_name || 'Cliente';
  const reviewLink = `https://${appHost}/reviews?order_id=${order.id}`;

  const subject = `¿Cómo estuvo tu pedido de Fresitas? ⭐`;
  const body_html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; background: #fff5f7; margin: 0; padding: 20px; }
  .container { max-width: 520px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(232,41,74,0.10); }
  .header { background: linear-gradient(135deg, #E8294A, #c0143a); padding: 32px 24px; text-align: center; }
  .header h1 { color: white; font-size: 26px; margin: 0; font-weight: 900; }
  .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px; }
  .body { padding: 28px 24px; }
  .stars { font-size: 40px; letter-spacing: 6px; text-align: center; margin: 20px 0; }
  .btn { display: block; background: linear-gradient(135deg, #E8294A, #c0143a); color: white !important; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: bold; font-size: 17px; text-align: center; margin: 24px auto; width: fit-content; }
  .items { background: #fff5f7; border-radius: 12px; padding: 16px; margin: 16px 0; }
  .items p { margin: 4px 0; font-size: 14px; color: #444; }
  .footer { padding: 16px 24px; text-align: center; color: #aaa; font-size: 12px; border-top: 1px solid #f0f0f0; }
  .tracking { background: #f9f9f9; border-radius: 10px; padding: 12px 16px; margin: 12px 0; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>🍓 Fresitas G&F</h1>
    <p>¿Qué tal estuvo tu pedido?</p>
  </div>
  <div class="body">
    <p style="font-size:17px; color:#333;">Hola <strong>${customerName}</strong> 👋</p>
    <p style="color:#555; line-height:1.6;">Esperamos que hayas disfrutado cada fresa de tu pedido. Tu opinión es muy importante para nosotros y nos ayuda a seguir mejorando.</p>
    
    <div class="tracking">
      <p style="margin:0; font-size:12px; color:#aaa;">Tu pedido</p>
      <p style="margin:4px 0 0; font-weight:bold; color:#E8294A; font-size:18px;">#${order.tracking_code}</p>
    </div>

    <div class="items">
      <p style="font-weight:bold; color:#E8294A; margin-bottom:10px;">Productos que pediste:</p>
      ${(order.items || []).map(item => `<p>🍓 ${item.name} × ${item.quantity}</p>`).join('')}
    </div>
    
    <div class="stars">⭐⭐⭐⭐⭐</div>
    <p style="text-align:center; color:#777; font-size:14px; margin-bottom:8px;">¿Nos regalas tu calificación?</p>
    
    <a class="btn" href="${reviewLink}">⭐ Dejar mi reseña ahora</a>
    
    <p style="text-align:center; font-size:13px; color:#aaa;">Solo toma 30 segundos</p>
  </div>
  <div class="footer">
    Fresitas G&F · Hecho con amor 🍓<br>
    <a href="${reviewLink}" style="color:#E8294A;">Calificar mi pedido</a> · 
    <a href="https://${appHost}" style="color:#E8294A;">Ver menú</a>
  </div>
</div>
</body>
</html>`;

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: order.user_email,
    subject,
    body: body_html,
  });

  // Create in-app notification
  await base44.asServiceRole.entities.Notification.create({
    user_email: order.user_email,
    title_es: '⭐ ¿Cómo estuvo tu pedido?',
    title_en: '⭐ How was your order?',
    message_es: `Comparte tu opinión sobre el pedido #${order.tracking_code}`,
    message_en: `Share your review for order #${order.tracking_code}`,
    type: 'order_update',
    link: `/reviews?order_id=${order.id}`,
  });

  return Response.json({ success: true, email_sent_to: order.user_email, order_tracking: order.tracking_code });
}