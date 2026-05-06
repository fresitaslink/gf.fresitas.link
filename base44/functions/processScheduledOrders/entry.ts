import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Daily automation: checks scheduled orders and creates actual orders
 * Triggered by scheduled automation at 6 AM
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active scheduled orders
    const scheduledOrders = await base44.asServiceRole.entities.ScheduledOrder.filter(
      { status: 'active', is_active: true }
    );

    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // Monday = 0
    const dateOfMonth = today.getDate();
    let createdCount = 0;

    for (const scheduled of scheduledOrders) {
      let shouldCreate = false;

      // Check frequency match
      if (scheduled.frequency === 'weekly' && scheduled.day_of_week === dayOfWeek) {
        shouldCreate = true;
      } else if (scheduled.frequency === 'biweekly') {
        const lastOrder = scheduled.last_order_created
          ? new Date(scheduled.last_order_created)
          : new Date(scheduled.created_on);
        const daysSince = Math.floor((today - lastOrder) / (1000 * 60 * 60 * 24));
        if (daysSince >= 14 && scheduled.day_of_week === dayOfWeek) {
          shouldCreate = true;
        }
      } else if (scheduled.frequency === 'monthly' && scheduled.day_of_month === dateOfMonth) {
        shouldCreate = true;
      }

      if (!shouldCreate) continue;

      try {
        // Create actual order from scheduled template
        const newOrder = await base44.asServiceRole.entities.Order.create({
          user_email: scheduled.user_email,
          customer_name: scheduled.customer_name,
          customer_phone: scheduled.customer_phone,
          customer_address: scheduled.customer_address,
          delivery_lat: scheduled.delivery_lat,
          delivery_lng: scheduled.delivery_lng,
          items: scheduled.items,
          subtotal: scheduled.subtotal,
          delivery_fee: scheduled.delivery_fee,
          discount: scheduled.discount,
          total: scheduled.total,
          status: 'pending',
          payment_method: scheduled.payment_method,
          payment_status: 'pending',
          card_last4: scheduled.card_last4,
          notes: `Pedido programado recurrente - ${scheduled.frequency}`,
          tracking_code: `SCH-${Date.now()}`
        });

        // Auto-charge with Stripe if card is saved
        if (scheduled.stripe_payment_method_id && scheduled.payment_method === 'tarjeta') {
          try {
            const chargeResult = await base44.functions.invoke('processStripePayment', {
              order_id: newOrder.id,
              amount: scheduled.total * 100, // Convert to cents
              customer_email: scheduled.user_email,
              payment_method_id: scheduled.stripe_payment_method_id,
              is_recurring: true
            });

            if (chargeResult.data?.success) {
              // Update order payment status
              await base44.asServiceRole.entities.Order.update(newOrder.id, {
                payment_status: 'paid',
                payment_intent_id: chargeResult.data.payment_intent_id
              });
            }
          } catch (chargeErr) {
            console.error('Stripe charge failed:', chargeErr);
            // Order remains pending, customer will need to pay manually
          }
        }

        // Update scheduled order tracking
        await base44.asServiceRole.entities.ScheduledOrder.update(scheduled.id, {
          last_order_created: today.toISOString(),
          next_order_date: calculateNextDate(scheduled, today).toISOString(),
          total_orders_created: (scheduled.total_orders_created || 0) + 1
        });

        createdCount++;

        // Send confirmation email
        try {
          await base44.integrations.Core.SendEmail({
            to: scheduled.user_email,
            subject: 'Tu Pedido Programado ha sido Creado 🍓',
            body: `¡Tu pedido recurrente de ${scheduled.frequency} ha sido procesado! 
            
Código de Seguimiento: ${newOrder.tracking_code}
Total: $${scheduled.total}
Dirección: ${scheduled.customer_address}

Ver detalles: https://tuapp.com/orders/${newOrder.id}`
          });
        } catch (e) {
          console.log('Email notification failed, continuing...');
        }
      } catch (orderErr) {
        console.error(`Failed to create order from scheduled ${scheduled.id}:`, orderErr);
      }
    }

    return Response.json({
      success: true,
      message: `Procesadas ${createdCount} órdenes programadas`,
      created_count: createdCount,
      total_processed: scheduledOrders.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateNextDate(scheduled, baseDate) {
  const next = new Date(baseDate);

  if (scheduled.frequency === 'weekly') {
    const daysUntil = (scheduled.day_of_week - next.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + daysUntil);
  } else if (scheduled.frequency === 'biweekly') {
    next.setDate(next.getDate() + 14);
  } else if (scheduled.frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
    next.setDate(scheduled.day_of_month);
  }

  return next;
}