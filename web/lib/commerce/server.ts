import 'server-only';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { CommerceError, commerceConfig, configurationBlockers } from './config';
import type { Store, Order } from './engine';

export const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function checkedId(v: unknown): string { if (!uuid(v)) throw new CommerceError('INVALID_REQUEST', 400); return v; }
export function stripeClient() {
  const config = commerceConfig();
  if (!config.stripeKey) throw new CommerceError('NOT_CONFIGURED', 503);
  return new Stripe(config.stripeKey, { maxNetworkRetries: 2, timeout: 15000 });
}

export function commerceStore(): Store {
  const db = createAdminClient();
  return {
    async command<T>(action: string, actor: string | null, data: Record<string, unknown>): Promise<T> {
      const result = await db.rpc('commerce_command', { p_action: action, p_actor: actor, p_data: data });
      if (result.error) {
        const message = result.error.message;
        if (/^[A-Z_]+$/.test(message)) throw new CommerceError(message);
        if (result.error.code === '23505') throw new CommerceError('ARTWORK_UNAVAILABLE');
        console.error('Commerce database operation failed', { action, code: result.error.code });
        throw new CommerceError('SERVICE_UNAVAILABLE', 503);
      }
      return result.data as T;
    },
    async getOrder(id) {
      const { data, error } = await db.from('commerce_orders').select('*').eq('id', checkedId(id)).maybeSingle();
      if (error) throw new CommerceError('SERVICE_UNAVAILABLE', 503);
      if (!data) throw new CommerceError('ORDER_NOT_FOUND', 404);
      return data as Order;
    },
    async enabled() {
      const { data, error } = await db.from('commerce_settings').select('payments_enabled').eq('id', true).maybeSingle();
      return !error && data?.payments_enabled === true;
    },
  };
}

export async function actor(required: 'user' | 'seller' | 'admin' = 'user') {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new CommerceError('UNAUTHORIZED', 401);
  const db = createAdminClient();
  const { data: profile } = await db.from('profiles').select('id,role').eq('id', user.id).single();
  if (!profile || (required === 'admin' && profile.role !== 'admin') || (required === 'seller' && !['gallerist', 'admin'].includes(profile.role))) throw new CommerceError('FORBIDDEN', 403);
  return { user, profile, db };
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const configured = commerceConfig().origin;
  if (!origin || !configured || origin !== configured) throw new CommerceError('FORBIDDEN', 403);
}
export async function payload(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('content-length') || 0) > 16384) throw new CommerceError('INVALID_REQUEST', 400);
  const raw = await request.text();
  if (raw.length > 16384) throw new CommerceError('INVALID_REQUEST', 400);
  try { const value = JSON.parse(raw); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); return value; }
  catch { throw new CommerceError('INVALID_REQUEST', 400); }
}
export async function requirePayments() {
  if (configurationBlockers(commerceConfig()).length) throw new CommerceError('NOT_CONFIGURED', 503);
  if (!await commerceStore().enabled()) throw new CommerceError('PAYMENTS_OFF');
}
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'Vary': 'Cookie' } });
}
export function failure(error: unknown) {
  if (error instanceof CommerceError) return json({ error: error.code }, error.status);
  console.error('Commerce request failed', { type: error instanceof Error ? error.name : 'unknown' });
  return json({ error: 'SERVICE_UNAVAILABLE' }, 503);
}

export async function publicQuote(artworkId: string) {
  const db = createAdminClient();
  const { data: artwork } = await db.from('artworks').select('id,title,price,currency,owner_id,is_public,is_for_sale').eq('id', checkedId(artworkId)).maybeSingle();
  if (!artwork) throw new CommerceError('ARTWORK_UNAVAILABLE', 404);
  if (!artwork.is_public) {
    const { data: relations } = await db.from('gallery_artworks').select('galleries!inner(status)').eq('artwork_id', artwork.id).eq('galleries.status', 'published').limit(1);
    if (!relations?.length) throw new CommerceError('ARTWORK_UNAVAILABLE', 404);
  }
  const [{ data: listing }, { data: seller }, { data: held }, enabled] = await Promise.all([
    db.from('commerce_listings').select('shipping_cents,shipping_countries,terms_url,updated_at,enabled,seller_id').eq('artwork_id', artwork.id).maybeSingle(),
    db.from('commerce_sellers').select('charges_enabled,payouts_enabled,details_submitted,disconnected,livemode').eq('seller_id', artwork.owner_id).maybeSingle(),
    db.from('commerce_orders').select('id').eq('artwork_id', artwork.id).eq('inventory_held', true).limit(1),
    commerceStore().enabled(),
  ]);
  const config = commerceConfig();
  const active = enabled && configurationBlockers(config).length === 0;
  const available = active && artwork.is_for_sale && !held?.length && listing?.enabled && listing.seller_id === artwork.owner_id && seller?.charges_enabled && seller.payouts_enabled && seller.details_submitted && !seller.disconnected && seller.livemode === config.livemode && artwork.currency?.toLowerCase() === 'eur' && Number(artwork.price) > 0;
  return { artwork: { id: artwork.id, title: artwork.title, price: artwork.price, currency: artwork.currency },
    listing: listing ? { shipping_cents: listing.shipping_cents, shipping_countries: listing.shipping_countries, terms_url: listing.terms_url, updated_at: listing.updated_at } : null,
    paymentsEnabled: active, available: Boolean(available) };
}
