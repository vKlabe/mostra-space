import 'server-only';
import { createHash } from 'node:crypto';
import type { createAdminClient } from '@/lib/supabase/admin';
import { CommerceError, type CommerceConfig } from './config';
import { artworkCommercialTerms, ARTWORK_TERMS_URL } from './commercial-terms';

type Database = ReturnType<typeof createAdminClient>;
const action = 'seller_terms_accepted';
const hash = createHash('sha256').update(JSON.stringify(artworkCommercialTerms)).digest('hex');
export function sellerTermsOffer(config: CommerceConfig) {
  return { version: artworkCommercialTerms.version, hash, url: ARTWORK_TERMS_URL,
    feeBps: 1000, feeBase: 'artwork', refundApplicationFee: true,
    available: config.feeBps === 1000 && config.feeBase === 'artwork' && config.refundApplicationFee === true };
}
export async function sellerTermsStatus(db: Database, sellerId: string, config: CommerceConfig) {
  const offer = sellerTermsOffer(config);
  const result = await db.from('commerce_audit').select('details,created_at').eq('actor_id', sellerId)
    .eq('action', action).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw new CommerceError('SERVICE_UNAVAILABLE', 503);
  const d = result.data?.details;
  const accepted = offer.available && d?.version === offer.version && d?.hash === hash
    && d?.fee_bps === 1000 && d?.fee_base === 'artwork' && d?.refund_application_fee === true
    && d?.livemode === config.livemode;
  return { ...offer, accepted, acceptedAt: accepted ? result.data!.created_at : null };
}
export async function requireSellerTerms(db: Database, sellerId: string, config: CommerceConfig) {
  if (!(await sellerTermsStatus(db, sellerId, config)).accepted) throw new CommerceError('SELLER_TERMS_REQUIRED', 409);
}
export async function acceptSellerTerms(db: Database, sellerId: string, config: CommerceConfig, data: Record<string, unknown>) {
  const offer = sellerTermsOffer(config);
  if (!offer.available) throw new CommerceError('NOT_CONFIGURED', 503);
  if (data.accepted !== true || data.version !== offer.version || data.hash !== offer.hash
    || typeof data.locale !== 'string' || !['it', 'en', 'fr', 'es'].includes(data.locale)) {
    throw new CommerceError('SELLER_TERMS_REQUIRED', 400);
  }
  const current = await sellerTermsStatus(db, sellerId, config);
  if (current.accepted) return current;
  const result = await db.from('commerce_audit').insert({
    actor_id: sellerId, action, details: {
      version: offer.version, hash, url: offer.url, document: artworkCommercialTerms,
      fee_bps: 1000, fee_base: 'artwork', refund_application_fee: true, livemode: config.livemode,
      ui_locale: data.locale, document_locale: 'it',
    },
  });
  if (result.error) throw new CommerceError('SERVICE_UNAVAILABLE', 503);
  return sellerTermsStatus(db, sellerId, config);
}
