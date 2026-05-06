import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id, reason, refund_method = 'original' } = await req.json();

    if (!order_id) {
      return Response.json({ error: 'order_id required' }, { status: 400 });
    }

    // Get order
    const order = await base44.entities.Order.read(order_id);
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only allow cancellation if status is pending or confirmed
    if (!['pending', 'confirmed'].includes(order.status)) {
      return Response.json({ error: 'Order cannot be cancelled at this stage' }, { status: 400 });
    }

    // Calculate refund amount (100% if cancelled before preparing, 50% if preparing)
    let refundAmount = order.total || 0;
    if (order.status === 'preparing') {
      refundAmount = refundAmount * 0.5;
    }

    // Update order status
    await base44.entities.Order.update(order_id, {
      status: 'cancelled',
      payment_status: refundAmount > 0 ? 'refunded' : 'cancelled'
    });

    // If tip was included, deduct from driver balance
    if (order.tip_amount && order.tip_amount > 0) {
      const driverAssign = await base44.entities.DriverAssignment.filter({ order_id });
      if (driverAssign[0]?.driver_email) {
        const driverEarnings = await base44.entities.DriverEarnings.filter({ driver_email: driverAssign[0].driver_email });
        if (driverEarnings[0]) {
          await base44.entities.DriverEarnings.update(driverEarnings[0].id, {
            balance: Math.max(0, (driverEarnings[0].balance || 0) - order.tip_amount),
            total_earned: Math.max(0, (driverEarnings[0].total_earned || 0) - order.tip_amount)
          });
        }
      }
    }

    // Send refund notification to customer
    if (refundAmount > 0) {
      await base44.integrations.Core.SendEmail({
        to: order.user_email,
        subject: `✅ Reembolso Procesado - Pedido #${order.tracking_code}`,
        body: `Tu pedido #${order.tracking_code} fue cancelado.

Reembolso: $${refundAmount.toFixed(2)}
Razón: ${reason || 'Solicitud del cliente'}
Método: ${refund_method === 'original' ? 'Tarjeta original' : 'Crédito de cartera'}

El reembolso será procesado en 3-5 días hábiles.
`
      });
    }

    // Send notification to admin
    const storeSettings = await base44.asServiceRole.entities.StoreSettings.list();
    const adminEmail = storeSettings?.[0]?.admin_email;

    if (adminEmail) {
      await base44.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `🚨 Pedido Cancelado: #${order.tracking_code}`,
        body: `Pedido #${order.tracking_code} fue cancelado.

Cliente: ${order.customer_name}
Total Original: $${order.total?.toFixed(2)}
Reembolso: $${refundAmount.toFixed(2)}
Razón: ${reason || 'No especificada'}
Status anterior: ${order.status}
`
      });
    }

    return Response.json({
      success: true,
      order_id,
      refund_amount: refundAmount,
      refund_method: refund_method,
      message: `Pedido cancelado. Reembolso de $${refundAmount.toFixed(2)} procesado.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});