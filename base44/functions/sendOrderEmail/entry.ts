import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { order_id, event_type } = body;

    if (!order_id) {
      return Response.json({ error: 'order_id required' }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    const order = orders[0];
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    const statusLabels = {
      pending: 'Pendiente 🕐',
      confirmed: 'Confirmado ✅',
      preparing: 'En Preparación 👨‍🍳',
      on_the_way: 'En Camino 🚗',
      delivered: 'Entregado 🏠',
      cancelled: 'Cancelado ❌'
    };

    const statusLabel = statusLabels[order.status] || order.status;
    const itemsList = (order.items || []).map(i => `• ${i.name} x${i.quantity} — $${i.price?.toFixed(2)}`).join('\n');

    let subject = '';
    let body_html = '';

    if (event_type === 'new_order') {
      // Email to customer
      if (order.user_email) {
        subject = `🍓 ¡Tu pedido fue recibido! #${order.tracking_code}`;
        body_html = `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
            <div style="background: linear-gradient(135deg, #E8294A, #c0203b); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; font-size: 28px; margin: 0;">🍓 Fresitas G&F</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">¡Tu pedido fue recibido con mucho amor!</p>
            </div>
            <div style="padding: 30px; background: #fff;">
              <h2 style="color: #333; font-size: 20px;">Hola ${order.customer_name}! 👋</h2>
              <p style="color: #666;">Tu pedido está siendo procesado. Aquí está el resumen:</p>
              
              <div style="background: #FDE8EC; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px; font-weight: bold; color: #E8294A;">📦 Código de Seguimiento</p>
                <p style="font-size: 24px; font-weight: 900; color: #E8294A; margin: 0; letter-spacing: 2px;">${order.tracking_code}</p>
              </div>

              <div style="background: #f9f9f9; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="font-weight: bold; color: #333; margin: 0 0 12px;">🍓 Tu Pedido:</p>
                <pre style="color: #555; font-family: Arial; font-size: 14px; margin: 0; white-space: pre-wrap;">${itemsList}</pre>
                <hr style="border: none; border-top: 1px solid #eee; margin: 12px 0;"/>
                <p style="color: #333; font-weight: bold; font-size: 18px; margin: 0;">Total: $${order.total?.toFixed(2)}</p>
              </div>

              <div style="background: #f9f9f9; border-radius: 12px; padding: 16px; margin: 16px 0;">
                <p style="margin: 4px 0; color: #555;">📍 Dirección: ${order.customer_address}</p>
                <p style="margin: 4px 0; color: #555;">💳 Pago: ${order.payment_method}</p>
              </div>

              <p style="color: #666; text-align: center; margin-top: 24px;">
                Preparadas con amor para ti 🍓<br/>
                <strong style="color: #E8294A;">Fresitas G&F</strong>
              </p>
            </div>
          </div>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: order.user_email,
          subject,
          body: body_html
        });
      }

      // Email to admin/owner
      const settings = await base44.asServiceRole.entities.StoreSettings.list();
      const adminEmail = settings[0]?.admin_email;
      
      const adminBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #5C2D0E; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #FDE8EC; margin: 0;">🍓 Nuevo Pedido Recibido</h1>
          </div>
          <div style="padding: 24px; background: #fff;">
            <h2 style="color: #E8294A;">Pedido #${order.tracking_code}</h2>
            <p><strong>Cliente:</strong> ${order.customer_name}</p>
            <p><strong>Tel:</strong> ${order.customer_phone}</p>
            <p><strong>Dirección:</strong> ${order.customer_address}</p>
            <p><strong>Total:</strong> $${order.total?.toFixed(2)}</p>
            <p><strong>Pago:</strong> ${order.payment_method}</p>
            <hr/>
            <pre style="background: #f5f5f5; padding: 12px; border-radius: 8px;">${itemsList}</pre>
            ${order.notes ? `<p><strong>Notas:</strong> ${order.notes}</p>` : ''}
          </div>
        </div>`;

      const adminSubject = `🍓 Nuevo Pedido #${order.tracking_code} — $${order.total?.toFixed(2)}`;

      // Notify main admin email
      if (adminEmail) {
        await base44.asServiceRole.integrations.Core.SendEmail({ to: adminEmail, subject: adminSubject, body: adminBody });
      }

      // Notify managers with order permission
      const managerPerms = await base44.asServiceRole.entities.ManagerPermissions.filter({ is_active: true });
      const allUsers = await base44.asServiceRole.entities.User.list();
      for (const perm of managerPerms) {
        if (perm.can_manage_orders !== false) {
          const mgr = allUsers.find(u => u.email === perm.user_email);
          if (mgr?.email && mgr.email !== adminEmail) {
            await base44.asServiceRole.integrations.Core.SendEmail({ to: mgr.email, subject: adminSubject, body: adminBody }).catch(() => {});
          }
        }
      }

    } else if (event_type === 'status_update') {
      if (!order.user_email) return Response.json({ success: true, skipped: 'no email' });

      subject = `🍓 Tu pedido está: ${statusLabel} — #${order.tracking_code}`;
      body_html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #E8294A, #c0203b); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">🍓 Fresitas G&F</h1>
          </div>
          <div style="padding: 24px; background: #fff; text-align: center;">
            <h2 style="color: #333;">¡Actualización de tu Pedido!</h2>
            <div style="background: #FDE8EC; border-radius: 16px; padding: 24px; margin: 20px 0;">
              <p style="font-size: 40px; margin: 0;">${order.status === 'on_the_way' ? '🚗' : order.status === 'delivered' ? '🏠' : order.status === 'preparing' ? '👨‍🍳' : '✅'}</p>
              <p style="font-size: 22px; font-weight: bold; color: #E8294A; margin: 8px 0;">${statusLabel}</p>
              <p style="color: #888; margin: 0;">Pedido #${order.tracking_code}</p>
            </div>
            <p style="color: #666;">Hola ${order.customer_name}, tu pedido está en camino a hacerte feliz 🍓</p>
            ${order.status === 'delivered' ? '<p style="color: #E8294A; font-weight: bold;">¡Disfruta tus fresitas! No olvides dejar tu reseña ⭐</p>' : ''}
          </div>
        </div>
      `;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: order.user_email,
        subject,
        body: body_html
      });
    }

    return Response.json({ success: true, event_type, order_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});