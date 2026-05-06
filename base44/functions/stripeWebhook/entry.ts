import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@17.5.0';

/**
 * Stripe webhook handler — verifies signature and handles real-money events.
 * Configure in Stripe Dashboard: payment_intent.succeeded, charge.refunded,
 * account.updated, transfer.created, transfer.failed
 */
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
      console.warn('[WEBHOOK] No signature verification (webhook secret missing)');
    }

    // Use service role for webhook processing
    const base44 = createClientFromRequest(req);

    console.log(`[WEBHOOK] ${event.type} · ${event.id}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const orderId = pi.metadata?.order_id;
        if (orderId) {
          await base44.asServiceRole.entities.Order.update(orderId, {
            payment_status: 'paid',
          }).catch(e => console.warn('Order update failed:', e.message));
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        const orderId = charge.metadata?.order_id;
        if (orderId) {
          await base44.asServiceRole.entities.Order.update(orderId, {
            payment_status: 'refunded',
          }).catch(e => console.warn('Order update failed:', e.message));
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
            console.log(`[WEBHOOK] Driver ${driverEmail} onboarding=${onboardingComplete}`);
          }
        }
        break;
      }
      case 'transfer.failed': {
        const transfer = event.data.object;
        const driverEmail = transfer.metadata?.driver_email;
        if (driverEmail) {
          // Refund the failed transfer back to driver balance
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
      default:
        console.log(`[WEBHOOK] Unhandled: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[stripeWebhook ERROR]:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});