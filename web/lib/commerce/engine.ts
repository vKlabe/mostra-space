import type Stripe from 'stripe';
import { CommerceError, configurationBlockers } from './config';
import type { CommerceConfig } from './config';

export type Order = {
  id: string; artwork_id: string; buyer_id: string; seller_id: string; seller_name: string;
  artwork_title: string; stripe_account_id: string; livemode: boolean; currency: string;
  artwork_cents: number; shipping_cents: number; total_cents: number; fee_cents: number;
  refund_application_fee: boolean; terms_url: string; shipping_country: string; buyer_email: string;
  state: string; inventory_held: boolean; settings_revision: number; stripe_session_id: string | null;
  stripe_payment_intent_id: string | null; checkout_expires_at: string; refunded_cents: number;
  created_at: string; fulfillment_status: string; tracking_reference: string | null;
  shipping_details: Record<string, unknown> | null;
  refund_revision: number;
};
export type Refund = { id: string; order_id: string; amount_cents: number; stripe_refund_id: string | null; state: string; created_at: string };
export type Store = {
  command<T>(action: string, actor: string | null, data: Record<string, unknown>): Promise<T>;
  getOrder(id: string): Promise<Order>;
  enabled(): Promise<boolean>;
};
export type Payments = Pick<Stripe, 'checkout' | 'refunds' | 'accounts' | 'paymentIntents'>;
export const objectId = (value: string | { id: string } | null | undefined) => typeof value === 'string' ? value : value?.id || null;

export function checkoutParams(order: Order, origin: string): Stripe.Checkout.SessionCreateParams {
  const metadata = { type: 'artwork_purchase', orderId: order.id };
  return {
    mode: 'payment', customer_email: order.buyer_email,
    integration_identifier: 'mostra_artworks_qnztrvkp',
    client_reference_id: order.id, metadata,
    payment_intent_data: { metadata, ...(order.fee_cents > 0 ? { application_fee_amount: order.fee_cents } : {}) },
    expires_at: Math.floor(new Date(order.checkout_expires_at).getTime() / 1000),
    line_items: [
      { quantity: 1, price_data: { currency: order.currency, unit_amount: order.artwork_cents, product_data: { name: order.artwork_title.slice(0, 200) } } },
      ...(order.shipping_cents > 0 ? [{ quantity: 1, price_data: { currency: order.currency, unit_amount: order.shipping_cents, product_data: { name: 'Shipping / Spedizione / Livraison / Envío' } } }] : []),
    ],
    shipping_address_collection: { allowed_countries: [order.shipping_country as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry] },
    success_url: `${origin}/account/acquisti?order=${order.id}`,
    cancel_url: `${origin}/account/acquisti?order=${order.id}&canceled=1`,
    // Prices are the seller's final prices. No automatic tax, discounts, quantity
    // adjustments or currency conversion can silently change the accepted total.
    adaptive_pricing: { enabled: false },
  };
}

export async function syncSession(store: Store, session: Stripe.Checkout.Session, accountId: string, event?: { id: string; type: string }) {
  if (session.metadata?.type !== 'artwork_purchase' || !session.metadata.orderId) return null;
  const order = await store.getOrder(session.metadata.orderId);
  if (order.stripe_account_id !== accountId || order.livemode !== session.livemode) throw new CommerceError('ACCOUNT_MISMATCH');
  if (session.mode !== 'payment' || session.client_reference_id !== order.id) throw new CommerceError('PAYMENT_MISMATCH');
  let action: string;
  if (session.payment_status === 'paid') action = 'paid';
  else if (session.status === 'expired') action = 'expired';
  else if (session.status === 'complete') action = 'processing';
  else return order;
  return store.command<Order>(action, null, {
    order_id: order.id, account_id: accountId, livemode: session.livemode,
    session_id: session.id, payment_intent_id: objectId(session.payment_intent),
    total_cents: session.amount_total, currency: session.currency,
    shipping_details: session.collected_information?.shipping_details || null,
    ...(event ? { event_id: event.id, event_type: event.type } : {}),
  });
}

export async function expireCheckout(store: Store, stripe: Payments, order: Order) {
  if (!order.stripe_session_id) return false; // Uncertain creation must keep its inventory lock.
  const scope = { stripeAccount: order.stripe_account_id };
  let session = await stripe.checkout.sessions.retrieve(order.stripe_session_id, {}, scope);
  if (session.status === 'open') {
    try { session = await stripe.checkout.sessions.expire(session.id, {}, scope); }
    catch { session = await stripe.checkout.sessions.retrieve(session.id, {}, scope); }
  }
  await syncSession(store, session, order.stripe_account_id);
  return session.status !== 'open';
}

// A failed payment remains reserved until Stripe confirms the PaymentIntent
// cannot settle. A failed attempt or a local timeout alone never releases stock.
export async function syncFailedPayment(store: Store, stripe: Payments, session: Stripe.Checkout.Session, accountId: string, event?: { id: string; type: string }) {
  const synced = await syncSession(store, session, accountId);
  if (!synced || session.status !== 'complete' || session.payment_status === 'paid') return synced;
  const intentId = objectId(session.payment_intent);
  if (!intentId) throw new CommerceError('REVIEW_REQUIRED');
  const scope = { stripeAccount: accountId };
  let intent = await stripe.paymentIntents.retrieve(intentId, {}, scope);
  if (intent.metadata?.orderId !== synced.id || intent.metadata?.type !== 'artwork_purchase' || intent.livemode !== synced.livemode || intent.amount !== synced.total_cents || intent.currency !== synced.currency) throw new CommerceError('PAYMENT_MISMATCH');
  if (intent.status === 'requires_payment_method') {
    try { intent = await stripe.paymentIntents.cancel(intent.id, {}, { ...scope, idempotencyKey: `artwork-cancel:${synced.id}` }); }
    catch { intent = await stripe.paymentIntents.retrieve(intentId, {}, scope); }
  }
  if (intent.status !== 'canceled') throw new CommerceError('REVIEW_REQUIRED');
  return store.command<Order>('payment_canceled', null, {
    order_id: synced.id, account_id: accountId, livemode: session.livemode,
    payment_intent_id: intent.id, total_cents: intent.amount, currency: intent.currency,
    ...(event ? { event_id: event.id, event_type: event.type } : {}),
  });
}

export async function startCheckout(store: Store, stripe: Payments, config: CommerceConfig, actor: string, data: Record<string, unknown>) {
  if (configurationBlockers(config).length) throw new CommerceError('NOT_CONFIGURED', 503);
  if (!await store.enabled()) throw new CommerceError('PAYMENTS_OFF');
  const order = await store.command<Order>('reserve', actor, { ...data, livemode: config.livemode, fee_bps: config.feeBps, fee_base: config.feeBase, refund_application_fee: config.refundApplicationFee });
  if (order.livemode !== config.livemode) throw new CommerceError('ACCOUNT_MISMATCH');
  const scope = { stripeAccount: order.stripe_account_id };
  let session: Stripe.Checkout.Session;
  if (order.stripe_session_id) {
    session = await stripe.checkout.sessions.retrieve(order.stripe_session_id, {}, scope);
  } else {
    // Stripe only guarantees idempotency retention for 24h. Never create again after
    // that window; an operator must reconcile the original attempt instead.
    if (Date.now() - new Date(order.created_at).getTime() > 23 * 3600000) throw new CommerceError('REVIEW_REQUIRED');
    const account = await stripe.accounts.retrieve(order.stripe_account_id);
    if (!account.charges_enabled || !account.payouts_enabled || !account.details_submitted) throw new CommerceError('SELLER_NOT_READY');
    session = await stripe.checkout.sessions.create(checkoutParams(order, config.origin), { ...scope, idempotencyKey: `artwork-checkout:${order.id}` });
  }
  if (session.metadata?.orderId !== order.id || session.metadata?.type !== 'artwork_purchase' || session.livemode !== order.livemode) throw new CommerceError('PAYMENT_MISMATCH');
  const attached = await store.command<{ allowed: boolean; order: Order }>('attach_session', actor, { order_id: order.id, session_id: session.id });
  await syncSession(store, session, order.stripe_account_id);
  if (session.payment_status === 'paid') return { orderId: order.id, url: `${config.origin}/account/acquisti?order=${order.id}` };
  if (!attached.allowed || !await store.enabled()) {
    await expireCheckout(store, stripe, { ...order, stripe_session_id: session.id });
    throw new CommerceError('PAYMENTS_OFF');
  }
  if (session.status !== 'open' || !session.url) return { orderId: order.id, url: `${config.origin}/account/acquisti?order=${order.id}` };
  return { orderId: order.id, url: session.url };
}

export async function syncRefund(store: Store, refund: Stripe.Refund, order: Order, event?: { id: string; type: string }) {
  return store.command<Order>('refund_sync', null, {
    order_id: order.id, account_id: order.stripe_account_id, livemode: order.livemode,
    payment_intent_id: objectId(refund.payment_intent), refund_id: refund.id,
    request_id: /^[0-9a-f-]{36}$/i.test(refund.metadata?.requestId || '') ? refund.metadata?.requestId : null, amount_cents: refund.amount,
    state: refund.status, expected_refund_revision: order.refund_revision,
    ...(event ? { event_id: `${event.id}:${refund.id}`, event_type: event.type } : {}),
  });
}

// Read the order revision BEFORE Stripe. A competing update invalidates this read.
export async function refreshRefund(store: Store, stripe: Payments, order: Order, refundId: string, event?: { id: string; type: string }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.getOrder(order.id);
    if (current.stripe_account_id !== order.stripe_account_id || current.livemode !== order.livemode) throw new CommerceError('ACCOUNT_MISMATCH');
    if (!Number.isSafeInteger(current.refund_revision) || current.refund_revision < 0) throw new CommerceError('REVIEW_REQUIRED');
    const refund = await stripe.refunds.retrieve(refundId, {}, { stripeAccount: current.stripe_account_id });
    if (refund.id !== refundId) throw new CommerceError('PAYMENT_MISMATCH');
    try {
      await syncRefund(store, refund, current, event);
      return refund;
    } catch (error) {
      const code = error instanceof CommerceError ? error.code : error instanceof Error ? error.message : '';
      if (code !== 'STALE_REFUND_SNAPSHOT') throw error;
    }
  }
  throw new CommerceError('REVIEW_REQUIRED', 503);
}

export async function requestRefund(store: Store, stripe: Payments, order: Order, actor: string, requestId: string, amount: number) {
  // No global payment flag here: previously paid orders remain serviceable while OFF.
  if (!order.stripe_payment_intent_id) throw new CommerceError('NOT_REFUNDABLE');
  // Include refunds performed directly in Stripe before reserving a new amount.
  for await (const existing of stripe.refunds.list({ payment_intent: order.stripe_payment_intent_id, limit: 100 }, { stripeAccount: order.stripe_account_id })) {
    await refreshRefund(store, stripe, order, existing.id);
  }
  const request = await store.command<Refund>('refund_request', actor, { order_id: order.id, request_id: requestId, amount_cents: amount });
  if (request.stripe_refund_id) return refreshRefund(store, stripe, order, request.stripe_refund_id);
  if (Date.now() - new Date(request.created_at).getTime() > 23 * 3600000) throw new CommerceError('REVIEW_REQUIRED');
  const refund = await stripe.refunds.create({
    payment_intent: order.stripe_payment_intent_id, amount: request.amount_cents,
    refund_application_fee: order.fee_cents > 0 && order.refund_application_fee,
    metadata: { type: 'artwork_refund', orderId: order.id, requestId: request.id },
  }, { stripeAccount: order.stripe_account_id, idempotencyKey: `artwork-refund:${request.id}` });
  return refreshRefund(store, stripe, order, refund.id);
}
