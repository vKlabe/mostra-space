import { shippingCountries } from '@/lib/commerce/countries';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { CommerceError, commerceConfig, configurationBlockers, cents } from '@/lib/commerce/config';
import { actor, checkedId, commerceStore, failure, json, payload, publicQuote, requirePayments, sameOrigin, stripeClient } from '@/lib/commerce/server';
import { expireCheckout, objectId, requestRefund, startCheckout, syncSession, syncRefund, syncFailedPayment } from '@/lib/commerce/engine';
import type { Order } from '@/lib/commerce/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
const stateCookie = 'mostraspace-commerce-oauth';
function checkDb(result: { error: { code?: string } | null }) {
  if (result.error) throw new CommerceError('SERVICE_UNAVAILABLE', 503);
}

async function reconcile(order: Order, cancel = false) {
  const config = commerceConfig();
  if (order.livemode !== config.livemode) throw new CommerceError('ACCOUNT_MISMATCH');
  const stripe = stripeClient(); const store = commerceStore();
  if (!order.stripe_session_id) {
    // Recover a crash between Stripe creation and saving the session ID. A full
    // absence is not treated as permission to release the inventory lock.
    let scanned = 0;
    for await (const session of stripe.checkout.sessions.list({ limit: 100,
      created: { gte: Math.floor(new Date(order.created_at).getTime() / 1000) - 60,
        lte: Math.floor(new Date(order.checkout_expires_at).getTime() / 1000) } }, { stripeAccount: order.stripe_account_id })) {
      if (session.metadata?.type === 'artwork_purchase' && session.metadata.orderId === order.id) {
        await store.command('attach_session', order.buyer_id, { order_id: order.id, session_id: session.id });
        order = { ...order, stripe_session_id: session.id }; break;
      }
      if (++scanned >= 1000) break;
    }
  }
  if (!order.stripe_session_id) return { resolved: false, orderId: order.id };
  if (cancel) await expireCheckout(store, stripe, order);
  const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id, {}, { stripeAccount: order.stripe_account_id });
  await syncSession(store, session, order.stripe_account_id);
  if (session.payment_status === 'paid') {
    const latest = await store.getOrder(order.id);
    for await (const refund of stripe.refunds.list({ payment_intent: latest.stripe_payment_intent_id!, limit: 100 }, { stripeAccount: latest.stripe_account_id })) await syncRefund(store, refund, latest);
  }
  if (session.status === 'complete' && session.payment_status !== 'paid') {
    const intentId = objectId(session.payment_intent);
    if (!intentId) return { resolved: false, orderId: order.id };
    const intent = await stripe.paymentIntents.retrieve(intentId, {}, { stripeAccount: order.stripe_account_id });
    if (['requires_payment_method', 'canceled'].includes(intent.status)) await syncFailedPayment(store, stripe, session, order.stripe_account_id);
    else return { resolved: false, orderId: order.id };
  }
  return { resolved: !cancel || session.status !== 'open', orderId: order.id };
}

async function closePending() {
  const { db } = await actor('admin');
  const { data, error } = await db.from('commerce_orders').select('*').in('state', ['reserved', 'checkout_open', 'processing']).order('last_reconciled_at', { nullsFirst: true }).order('created_at').limit(5);
  if (error) throw new CommerceError('SERVICE_UNAVAILABLE', 503);
  const pending: string[] = [];
  const cancel = !await commerceStore().enabled();
  await Promise.all(((data || []) as Order[]).map(async order => {
    try { const result = await reconcile(order, cancel); if (!result.resolved) pending.push(order.id); }
    catch { pending.push(order.id); }
    finally { await db.from('commerce_orders').update({ last_reconciled_at: new Date().toISOString() }).eq('id', order.id); }
  }));
  const count = await db.from('commerce_orders').select('id', { count: 'exact', head: true }).in('state', ['reserved', 'checkout_open', 'processing']);
  return { pending, remaining: count.count ?? null };
}

export async function GET(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const config = commerceConfig();
    if (path.join('/') === 'status') return json({ paymentsEnabled: configurationBlockers(config).length === 0 && await commerceStore().enabled() });
    if (path[0] === 'artworks' && path.length === 2) return json(await publicQuote(path[1]));

    if (path.join('/') === 'connect/callback') {
      const current = await actor('seller'); await requirePayments();
      const url = new URL(request.url); const state = url.searchParams.get('state'); const code = url.searchParams.get('code');
      const cookieStore = await cookies(); const cookie = cookieStore.get(stateCookie)?.value;
      cookieStore.set(stateCookie, '', { httpOnly: true, sameSite: 'lax', secure: config.origin.startsWith('https:'), path: '/api/commerce', maxAge: 0 });
      if (!state || !cookie || state.length !== cookie.length || !timingSafeEqual(Buffer.from(state), Buffer.from(cookie)) || !code) throw new CommerceError('INVALID_OAUTH_STATE', 400);
      const claim = await current.db.from('commerce_oauth_states').delete().eq('state_hash', createHash('sha256').update(state).digest('hex')).eq('seller_id', current.user.id).gt('expires_at', new Date().toISOString()).select('seller_id').maybeSingle();
      checkDb(claim); if (!claim.data) throw new CommerceError('INVALID_OAUTH_STATE', 400);
      const stripe = stripeClient();
      const token = await stripe.oauth.token({ grant_type: 'authorization_code', code });
      if (!token.stripe_user_id || token.scope !== 'read_write' || token.livemode !== config.livemode) throw new CommerceError('ACCOUNT_MISMATCH');
      const account = await stripe.accounts.retrieve(token.stripe_user_id);
      if (account.type !== 'standard') throw new CommerceError('ACCOUNT_MISMATCH');
      const existing = await current.db.from('commerce_sellers').select('stripe_account_id').eq('seller_id', current.user.id).maybeSingle();
      checkDb(existing);
      if (existing.data && existing.data.stripe_account_id !== account.id) throw new CommerceError('SELLER_ACCOUNT_LOCKED');
      checkDb(await current.db.from('commerce_sellers').upsert({ seller_id: current.user.id, stripe_account_id: account.id,
        livemode: config.livemode, charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted, disconnected: false, updated_at: new Date().toISOString() }));
      // OAuth access/refresh tokens are intentionally not stored or returned.
      return Response.redirect(`${config.origin}/dashboard/vendite?connected=1`, 303);
    }
    if (path.join('/') === 'seller') {
      const current = await actor('seller');
      const [seller, listings, artworks] = await Promise.all([
        current.db.from('commerce_sellers').select('stripe_account_id,charges_enabled,payouts_enabled,details_submitted,disconnected,livemode').eq('seller_id', current.user.id).maybeSingle(),
        current.db.from('commerce_listings').select('*').eq('seller_id', current.user.id),
        current.db.from('artworks').select('id,title,price,currency,is_for_sale').eq('owner_id', current.user.id).order('created_at', { ascending: false }),
      ]);
      checkDb(seller); checkDb(listings); checkDb(artworks);
      return json({ seller: seller.data, listings: listings.data || [], artworks: artworks.data || [], paymentsEnabled: configurationBlockers(config).length === 0 && await commerceStore().enabled() });
    }
    if (path.join('/') === 'orders') {
      const view = new URL(request.url).searchParams.get('view') || 'buyer';
      if (!['buyer', 'seller', 'admin'].includes(view)) throw new CommerceError('INVALID_REQUEST', 400);
      const current = await actor(view === 'admin' ? 'admin' : view === 'seller' ? 'seller' : 'user');
      const page = Math.max(0, Math.min(100000, Math.floor(Number(new URL(request.url).searchParams.get('page')) || 0)));
      let query = current.db.from('commerce_orders').select('*').order('created_at', { ascending: false }).range(page * 25, page * 25 + 24);
      if (view !== 'admin') query = query.eq(view === 'seller' ? 'seller_id' : 'buyer_id', current.user.id);
      const result = await query; checkDb(result);
      const ids = (result.data || []).map(o => o.id);
      const refunds = ids.length ? await current.db.from('commerce_refunds').select('id,order_id,amount_cents,state,created_at').in('order_id', ids) : { data: [], error: null };
      checkDb(refunds);
      // Internal account IDs, Stripe IDs and customer email are not sent to buyers.
      const orders = (result.data || []).map(o => ({ id: o.id, artwork_id: o.artwork_id, artwork_title: o.artwork_title,
        seller_name: o.seller_name, state: o.state, currency: o.currency, total_cents: o.total_cents,
        refunded_cents: o.refunded_cents, artwork_cents: o.artwork_cents, shipping_cents: o.shipping_cents,
        created_at: o.created_at, terms_url: o.terms_url, fulfillment_status: o.fulfillment_status, tracking_reference: o.tracking_reference,
        ...(view !== 'buyer' && ['paid', 'partially_refunded', 'refunded'].includes(o.state) ? { shipping_details: o.shipping_details, buyer_email: o.buyer_email } : {}) }));
      return json({ orders, refunds: refunds.data, hasMore: orders.length === 25 });
    }
    if (path.join('/') === 'admin') {
      const current = await actor('admin');
      const settings = await current.db.from('commerce_settings').select('*').eq('id', true).maybeSingle();
      const blockers = configurationBlockers(config);
      if (settings.error || !settings.data) blockers.push('DATABASE_SCHEMA');
      return json({ settings: settings.data || { payments_enabled: false }, effectiveEnabled: !blockers.length && settings.data?.payments_enabled === true, blockers, mode: config.livemode ? 'live' : 'test' });
    }
    throw new CommerceError('NOT_FOUND', 404);
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const { path } = await context.params; const data = await payload(request);
    const config = commerceConfig(); const store = commerceStore();
    if (path.join('/') === 'checkout') {
      const current = await actor();
      if (!current.user.email_confirmed_at || !current.user.email) throw new CommerceError('EMAIL_REQUIRED');
      const artworkId = checkedId(data.artwork_id);
      if (data.terms_accepted !== true || typeof data.shipping_country !== 'string' || !/^[A-Z]{2}$/.test(data.shipping_country) || typeof data.quote_terms !== 'string' || typeof data.quote_version !== 'string' || !Number.isFinite(Number(data.quote_price)) || !Number.isInteger(data.quote_shipping)) throw new CommerceError('INVALID_REQUEST', 400);
      return json(await startCheckout(store, stripeClient(), config, current.user.id, {
        artwork_id: artworkId, buyer_email: current.user.email, terms_accepted: true,
        shipping_country: data.shipping_country, quote_price: data.quote_price, quote_shipping: data.quote_shipping,
        quote_terms: data.quote_terms, quote_version: data.quote_version,
      }));
    }
    if (path.join('/') === 'seller/connect') {
      const current = await actor('seller'); await requirePayments();
      const state = randomBytes(32).toString('hex');
      checkDb(await current.db.from('commerce_oauth_states').insert({ state_hash: createHash('sha256').update(state).digest('hex'), seller_id: current.user.id, expires_at: new Date(Date.now() + 600000).toISOString() }));
      (await cookies()).set(stateCookie, state, { httpOnly: true, secure: config.origin.startsWith('https:'), sameSite: 'lax', path: '/api/commerce', maxAge: 600 });
      const url = new URL('https://connect.stripe.com/oauth/authorize');
      url.search = new URLSearchParams({ response_type: 'code', client_id: config.clientId, scope: 'read_write', state, redirect_uri: `${config.origin}/api/commerce/connect/callback` }).toString();
      return json({ url: url.toString() });
    }
    if (path.join('/') === 'seller/refresh') {
      const current = await actor('seller');
      const seller = await current.db.from('commerce_sellers').select('*').eq('seller_id', current.user.id).single();
      checkDb(seller);
      if (!seller.data || seller.data.livemode !== config.livemode) throw new CommerceError('SELLER_NOT_READY');
      const account = await stripeClient().accounts.retrieve(seller.data.stripe_account_id);
      checkDb(await current.db.from('commerce_sellers').update({ charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled, details_submitted: account.details_submitted, updated_at: new Date().toISOString() }).eq('seller_id', current.user.id));
      return json({ success: true });
    }
    if (path[0] === 'listings' && path.length === 2) {
      const current = await actor('seller'); await requirePayments();
      const id = checkedId(path[1]);
      if (typeof data.enabled !== 'boolean' || typeof data.terms_url !== 'string') throw new CommerceError('INVALID_REQUEST', 400);
      let terms: URL; try { terms = new URL(data.terms_url); } catch { throw new CommerceError('INVALID_TERMS', 400); }
      if (terms.protocol !== 'https:' || terms.username || terms.password || data.terms_url.length > 2000) throw new CommerceError('INVALID_TERMS', 400);
      const countries = typeof data.shipping_countries === 'string' ? [...new Set(data.shipping_countries.toUpperCase().split(/[,\s]+/).filter(Boolean))] : [];
      if (!countries.length || countries.length > 100 || countries.some(c => !shippingCountries.has(c))) throw new CommerceError('INVALID_COUNTRY', 400);
      return json(await store.command('save_listing', current.user.id, { artwork_id: id, enabled: data.enabled,
        shipping_cents: cents(data.shipping_amount), shipping_countries: countries, terms_url: terms.toString() }));
    }
    if (path[0] === 'orders' && path.length === 3) {
      const current = await actor(); const order = await store.getOrder(checkedId(path[1]));
      const manager = order.seller_id === current.user.id || current.profile.role === 'admin';
      if (!manager && order.buyer_id !== current.user.id) throw new CommerceError('FORBIDDEN', 403);
      if (path[2] === 'resume') {
        if (order.buyer_id !== current.user.id) throw new CommerceError('FORBIDDEN', 403);
        if (!['reserved', 'checkout_open'].includes(order.state)) throw new CommerceError('ARTWORK_UNAVAILABLE');
        return json(await startCheckout(store, stripeClient(), config, current.user.id, {
          artwork_id: order.artwork_id, buyer_email: order.buyer_email,
          terms_accepted: true, shipping_country: order.shipping_country,
        }));
      }
      if (path[2] === 'sync') return json(await reconcile(order, !await store.enabled()));
      if (!manager) throw new CommerceError('FORBIDDEN', 403);
      if (path[2] === 'refund') {
        if (order.livemode !== config.livemode) throw new CommerceError('ACCOUNT_MISMATCH');
        const refund = await requestRefund(store, stripeClient(), order, current.user.id, checkedId(data.request_id), cents(data.amount));
        return json({ refund: { id: refund.id, status: refund.status, amount: refund.amount } });
      }
      if (path[2] === 'fulfill') {
        if (!['unfulfilled', 'shipped', 'delivered'].includes(String(data.status)) || (data.tracking !== undefined && typeof data.tracking !== 'string')) throw new CommerceError('INVALID_REQUEST', 400);
        return json(await store.command('fulfill', current.user.id, { order_id: order.id, status: data.status, tracking: data.tracking || '' }));
      }
    }
    if (path.join('/') === 'admin') {
      const current = await actor('admin');
      if (typeof data.enabled !== 'boolean') throw new CommerceError('INVALID_REQUEST', 400);
      if (data.enabled && configurationBlockers(config).length) throw new CommerceError('ACTIVATION_BLOCKED', 403);
      const settings = await store.command('set_payments', current.user.id, { enabled: data.enabled });
      const cleanup = !data.enabled ? await closePending().catch(() => ({ pending: [], remaining: null, reviewRequired: true })) : null;
      return json({ settings, cleanup });
    }
    if (path.join('/') === 'admin/reconcile') { await actor('admin'); return json(await closePending()); }
    throw new CommerceError('NOT_FOUND', 404);
  } catch (error) { return failure(error); }
}
