import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Trigger when payment_status → paid
 * Send kitchen notification email
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data || !data.id) {
      return Response.json({ error: 'Invalid order data' }, { status: 400 });
    }

    const order = data;

    // Only trigger if payment is paid
    if (order.payment_status !== 'paid') {
      return Response.json({ success: true, message: 'Payment not completed' });
    }

    // Get store settings for kitchen email
    const settings = await base44.asServiceRole.entities.StoreSettings.list();
    const kitchenEmail = settings[0]?.admin_email;

    if (kitchenEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: kitchenEmail,
        subject: `🍳 Nuevo Pedido Pagado: #${order.tracking_code}`,
        body: `NUEVO PEDIDO PAGADO
════════════════════

Número: #${order.tracking_code}
Cliente: ${order.customer_name}
Teléfono: ${order.customer_phone}
Entrega: ${order.customer_address}

ÍTEMS:
${order.items?.map(i => `  • ${i.name} x${i.quantity}`).join('\n')}

Subtotal: $${order.subtotal?.toFixed(2)}
Entrega: $${order.delivery_fee?.toFixed(2)}
Descuento: -$${order.discount?.toFixed(2)}
─────────────────
TOTAL: $${order.total?.toFixed(2)}

Método de pago: ${order.payment_method === 'efectivo' ? 'EFECTIVO 💵 (COBRAR AL CLIENTE)' : 'Tarjeta/Transferencia'}

NOTAS: ${order.notes || '(ninguna)'}

⏰ COMENZAR PREPARACIÓN INMEDIATAMENTE

${order.user_email ? `\nMail del cliente: ${order.user_email}` : ''}`
      });
    }

    console.log(`[onPaymentConfirmed] Order ${order.id} payment confirmed. Kitchen notified.`);

    return Response.json({
      success: true,
      message: 'Kitchen notification sent',
      order_id: order.id
    });
  } catch (error) {
    console.error('[onPaymentConfirmed ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});