import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.5.0';

/**
 * Stripe webhook — handles all real-money events.
 * Subscribe in Stripe dashboard to:
 *   payment_intent.succeeded, charge.refunded, account.updated, transfer.failed,
 *   checkout.session.completed, customer.subscription.created/updated/deleted,
 *   invoice.payment_succeeded, invoice.payment_failed
 */

const PLAN_PERKS = {
  basic:   { discount_percent: 10, free_delivery: false, points_multiplier: 1.5, price_monthly: 99 },
  premium: { discount_percent: 15, free_delivery: true,  points_multiplier: 2.0, price_monthly: 199 },
  vip:     { discount_percent: 20, free_delivery: true,  points_multiplier: 3.0, price_monthly: 349 },
};

Deno.serve(async (req) => {
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

    const stripe = new Stripe(stripeKey);
    const sig = req.headers.get('stripe-signature');
    const body = await req.text();

    let event;
    if (webhookSecret && sig) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
      } catch (err) {
        console.error('[WEBHOOK] Signature verification failed:', err.message);
        return Response.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      event = JSON.parse(body);
      console.warn('[WEBHOOK] No signature verification (secret missing)');
    }

    const base44 = createClientFromRequest(req);
    console.log(`[WEBHOOK] ${event.type} · ${event.id}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const orderId = pi.metadata?.order_id;
        if (orderId) {
          await base44.asServiceRole.entities.Order.update(orderId, {
            payment_status: 'paid',
            payment_intent_id: pi.id,
          }).catch(e => console.warn('Order update:', e.message));
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const orderId = charge.metadata?.order_id;
        if (orderId) {
          await base44.asServiceRole.entities.Order.update(orderId, {
            payment_status: 'refunded',
          }).catch(() => {});
        }
        break;
      }

      case 'account.updated': {
        const acct = event.data.object;
        const driverEmail = acct.metadata?.user_email;
        const onboardingComplete = acct.charges_enabled && acct.payouts_enabled && acct.details_submitted;
        if (driverEmail) {
          const drivers = await base44.asServiceRole.entities.Driver.filter({ user_email: driverEmail });
          if (drivers[0]) {
            await base44.asServiceRole.entities.Driver.update(drivers[0].id, {
              stripe_onboarding_complete: onboardingComplete,
              stripe_charges_enabled: acct.charges_enabled,
              stripe_payouts_enabled: acct.payouts_enabled,
            });
          }
        }
        break;
      }

      case 'transfer.failed': {
        const transfer = event.data.object;
        const driverEmail = transfer.metadata?.driver_email;
        if (driverEmail) {
          const earningsRecs = await base44.asServiceRole.entities.DriverEarnings.filter({ driver_email: driverEmail });
          if (earningsRecs[0]) {
            const refundAmt = transfer.amount / 100;
            await base44.asServiceRole.entities.DriverEarnings.update(earningsRecs[0].id, {
              balance: (earningsRecs[0].balance || 0) + refundAmt,
              total_withdrawn: Math.max(0, (earningsRecs[0].total_withdrawn || 0) - refundAmt),
            });
            await base44.asServiceRole.entities.DriverTransaction.create({
              driver_email: driverEmail,
              amount: refundAmt,
              type: 'refund',
              status: 'completed',
              description: `Failed transfer refund · ${transfer.id}`,
            });
          }
        }
        break;
      }

      // ===== SUBSCRIPTION EVENTS =====
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription') {
          const userEmail = session.metadata?.user_email;
          const plan = session.metadata?.plan;
          const stripeSubId = session.subscription;
          const perks = PLAN_PERKS[plan];
          if (userEmail && stripeSubId && perks) {
            // Cancel any prior active subscriptions
            const existing = await base44.asServiceRole.entities.Subscription.filter({ user_email: userEmail, status: 'active' });
            for (const s of existing) {
              await base44.asServiceRole.entities.Subscription.update(s.id, { status: 'cancelled' });
            }

            await base44.asServiceRole.entities.Subscription.create({
              user_email: userEmail,
              plan,
              status: 'active',
              price_monthly: perks.price_monthly,
              discount_percent: perks.discount_percent,
              free_delivery: perks.free_delivery,
              points_multiplier: perks.points_multiplier,
              payment_method: 'stripe',
              stripe_subscription_id: stripeSubId,
              started_at: new Date().toISOString(),
              renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });

            await base44.asServiceRole.entities.Notification.create({
              user_email: userEmail,
              title_es: `🎉 ¡Suscripción ${plan.toUpperCase()} activa!`,
              message_es: `Tu pago se procesó. Disfruta ${perks.discount_percent}% de descuento en cada pedido.`,
              type: 'loyalty',
              link: '/suscripciones',
            });
            console.log(`[WEBHOOK] Subscription activated for ${userEmail} — ${plan}`);
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const stripeSubId = invoice.subscription;
        if (stripeSubId) {
          const subs = await base44.asServiceRole.entities.Subscription.filter({ stripe_subscription_id: stripeSubId });
          if (subs[0]) {
            await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
              status: 'active',
              renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const stripeSubId = invoice.subscription;
        if (stripeSubId) {
          const subs = await base44.asServiceRole.entities.Subscription.filter({ stripe_subscription_id: stripeSubId });
          if (subs[0]) {
            await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: 'paused' });
            await base44.asServiceRole.entities.Notification.create({
              user_email: subs[0].user_email,
              title_es: '⚠️ Pago de suscripción falló',
              message_es: 'No pudimos cobrar tu suscripción. Actualiza tu método de pago.',
              type: 'order_update',
              link: '/suscripciones',
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSubId = event.data.object.id;
        const subs = await base44.asServiceRole.entities.Subscription.filter({ stripe_subscription_id: stripeSubId });
        if (subs[0]) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: 'expired',
            cancelled_at: new Date().toISOString(),
          });
        }
        break;
      }

      default:
        console.log(`[WEBHOOK] Unhandled: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[stripeWebhook ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});