import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { commerceConfig } from '@/lib/commerce/config';
import { commerceStore, json, stripeClient } from '@/lib/commerce/server';
import { objectId, refreshRefund, syncSession, syncFailedPayment } from '@/lib/commerce/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const config = commerceConfig();
  if (!config.webhookSecret || !config.stripeKey) return json({ error: 'NOT_CONFIGURED' }, 503);
  const signature = request.headers.get('stripe-signature');
  if (!signature) return json({ error: 'INVALID_SIGNATURE' }, 400);
  const stripe = stripeClient(); let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, config.webhookSecret); }
  catch { return json({ error: 'INVALID_SIGNATURE' }, 400); }
  if (!event.account || event.livemode !== config.livemode) return json({ received: true, ignored: true });
  const accountId = event.account; const scope = { stripeAccount: accountId }; const store = commerceStore();
  try {
    if (event.type.startsWith('checkout.session.')) {
      const object = event.data.object as Stripe.Checkout.Session;
      if (object.metadata?.type !== 'artwork_purchase') return json({ received: true, ignored: true });
      // Retrieve current state, rather than trusting arrival order of event snapshots.
      const session = await stripe.checkout.sessions.retrieve(object.id, {}, scope);
      if (event.type === 'checkout.session.async_payment_failed') await syncFailedPayment(store, stripe, session, accountId, event);
      else await syncSession(store, session, accountId, event);
    } else if (['refund.created', 'refund.updated', 'refund.failed', 'charge.refunded'].includes(event.type)) {
      const object = event.data.object as Stripe.Refund | Stripe.Charge;
      const paymentIntentId = objectId(object.payment_intent);
      if (!paymentIntentId) return json({ received: true, ignored: true });
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {}, scope);
      if (intent.metadata?.type !== 'artwork_purchase' || !intent.metadata.orderId) return json({ received: true, ignored: true });
      let order = await store.getOrder(intent.metadata.orderId);
      if (order.stripe_account_id !== accountId || order.livemode !== event.livemode) throw new Error('Account mismatch');
      if (!order.stripe_payment_intent_id || !['paid', 'partially_refunded', 'refunded'].includes(order.state)) {
        // A refund event can arrive before the checkout completion event.
        const sessions = await stripe.checkout.sessions.list({ payment_intent: intent.id, limit: 10 }, scope);
        const session = sessions.data.find(s => s.metadata?.orderId === order.id && s.metadata.type === 'artwork_purchase');
        if (!session) throw new Error('Payment not reconciled');
        await syncSession(store, session, accountId);
        order = await store.getOrder(order.id);
      }
      if (event.type === 'charge.refunded') {
        for await (const refund of stripe.refunds.list({ payment_intent: intent.id, limit: 100 }, scope)) await refreshRefund(store, stripe, order, refund.id, event);
      } else {
        await refreshRefund(store, stripe, order, object.id, event);
      }
    } else if (event.type === 'account.updated' || event.type === 'account.application.deauthorized') {
      const db = createAdminClient();
      if (event.type === 'account.application.deauthorized') {
        const result = await db.from('commerce_sellers').update({ disconnected: true, charges_enabled: false, payouts_enabled: false, updated_at: new Date().toISOString() }).eq('stripe_account_id', accountId).eq('livemode', event.livemode);
        if (result.error) throw new Error('Seller update failed');
      } else {
        const account = await stripe.accounts.retrieve(accountId);
        const result = await db.from('commerce_sellers').update({ charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled, details_submitted: account.details_submitted, updated_at: new Date().toISOString() }).eq('stripe_account_id', accountId).eq('livemode', event.livemode);
        if (result.error) throw new Error('Seller update failed');
      }
    }
    return json({ received: true });
  } catch (error) {
    console.error('Connect webhook processing failed', { eventId: event.id, type: event.type, errorType: error instanceof Error ? error.name : 'unknown' });
    return json({ error: 'WEBHOOK_RETRY_REQUIRED' }, 500);
  }
}
