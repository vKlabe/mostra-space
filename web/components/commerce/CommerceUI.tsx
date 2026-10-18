'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { commerceTranslations } from '@/lib/commerce/translations';

const button = 'rounded-full border border-amber-800 px-5 py-2 text-sm text-amber-200 hover:bg-amber-950/30 disabled:cursor-not-allowed disabled:opacity-45';
const input = 'mt-1 block w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-neutral-100 disabled:opacity-50';
const card = 'rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5';
function useCopy() { const { locale } = useLanguage(); return { c: commerceTranslations[locale], locale }; }
export function CommerceTitle({ mode }: { mode: 'sales' | 'purchases' | 'admin' }) { return <>{useCopy().c[mode]}</>; }
function useError() { const { c } = useCopy(); return (code: string) => c.errors[code as keyof typeof c.errors] || c.errors.SERVICE_UNAVAILABLE; }
async function api<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch(`/api/commerce/${path}`, { method: data === undefined ? 'GET' : 'POST', cache: 'no-store',
    ...(data !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'SERVICE_UNAVAILABLE'); return result;
}
function money(amount: number, locale: string) { return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount / 100); }

type Quote = { paymentsEnabled: boolean; available: boolean; artwork: { id: string; title: string; price: number; currency: string }; listing: { shipping_cents: number; shipping_countries: string[]; terms_url: string; updated_at: string } | null };
export function BuyArtwork({ artworkId }: { artworkId: string }) {
  const { c, locale } = useCopy(); const explain = useError(); const dialog = useRef<HTMLDialogElement>(null);
  const [quote, setQuote] = useState<Quote | null>(null); const [country, setCountry] = useState(''); const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { let active = true; api<Quote>(`artworks/${artworkId}`).then(q => { if (active) setQuote(q); }).catch(() => { if (active) setQuote(null); }); return () => { active = false; }; }, [artworkId]);
  async function buy() {
    if (!quote?.listing) return; setBusy(true); setError('');
    try { const result = await api<{ url: string }>('checkout', { artwork_id: artworkId, shipping_country: country, terms_accepted: accepted, quote_price: quote.artwork.price, quote_shipping: quote.listing.shipping_cents, quote_terms: quote.listing.terms_url, quote_version: quote.listing.updated_at }); window.location.assign(result.url); }
    catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return <div className="mt-4">
    <button className={button} disabled={!quote?.available} onClick={() => { setAccepted(false); setCountry(''); dialog.current?.showModal(); }}>{c.buy}</button>
    {!quote?.available && <p className="mt-2 text-xs text-neutral-400">{!quote?.paymentsEnabled ? c.disabled : c.unavailable}</p>}
    <dialog ref={dialog} className="m-auto w-[min(95vw,32rem)] rounded-2xl border border-neutral-700 bg-neutral-950 p-6 text-neutral-100 backdrop:bg-black/75" aria-labelledby={`buy-${artworkId}`}>
      <h2 id={`buy-${artworkId}`} className="text-2xl">{quote?.artwork.title}</h2>
      <p className="mt-3 text-sm text-neutral-400">{c.finalPrice}</p>
      {quote?.listing && <>
        <p className="mt-4">{c.shipping}: {money(quote.listing.shipping_cents, locale)}</p>
        <p className="my-3 font-semibold">{c.total}: {money(Math.round(Number(quote.artwork.price) * 100) + quote.listing.shipping_cents, locale)}</p>
        <label>{c.country}<select className={input} value={country} onChange={e => setCountry(e.target.value)} disabled={busy}><option value="">{c.choose}</option>{quote.listing.shipping_countries.map(code => <option key={code} value={code}>{new Intl.DisplayNames([locale], { type: 'region' }).of(code) || code}</option>)}</select></label>
        <a className="my-4 block underline" href={quote.listing.terms_url} target="_blank" rel="noopener noreferrer">{c.terms}</a>
        <label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={accepted} onChange={e => setAccepted(e.target.checked)} disabled={busy} />{c.accept}</label>
      </>}
      {error && <p role="alert" className="my-3 text-red-300">{explain(error)}{error === 'UNAUTHORIZED' && <Link href="/auth/login" className="ml-2 underline">{c.purchases}</Link>}</p>}
      <div className="mt-6 flex flex-wrap gap-3"><button className={button} disabled={busy || !accepted || !country} onClick={buy}>{busy ? c.loading : c.checkout}</button><button className={button} disabled={busy} onClick={() => dialog.current?.close()}>{c.close}</button></div>
    </dialog>
  </div>;
}

type Listing = { artwork_id: string; enabled: boolean; shipping_cents: number; shipping_countries: string[]; terms_url: string };
type Artwork = { id: string; title: string; price: number | null; currency: string };
type SellerInfo = { paymentsEnabled: boolean; artworks: Artwork[]; listings: Listing[]; seller: { stripe_account_id: string; charges_enabled: boolean; payouts_enabled: boolean; details_submitted: boolean; disconnected: boolean } | null };
function ListingForm({ artwork, listing, enabled }: { artwork: Artwork; listing?: Listing; enabled: boolean }) {
  const { c } = useCopy(); const explain = useError(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  return <form className={card} onSubmit={async e => { e.preventDefault(); const data = new FormData(e.currentTarget); setBusy(true); setMessage('');
    try { await api(`listings/${artwork.id}`, { enabled: data.get('enabled') === 'on', shipping_amount: data.get('shipping'), shipping_countries: data.get('countries'), terms_url: data.get('terms') }); setMessage('saved'); }
    catch (err) { setMessage((err as Error).message); } finally { setBusy(false); }
  }}>
    <Link href={`/dashboard/opere/${artwork.id}`} className="text-xl underline">{artwork.title}</Link>
    <fieldset disabled={!enabled || busy} className="mt-4 space-y-4">
      <label className="flex gap-3"><input type="checkbox" name="enabled" defaultChecked={listing?.enabled || false} />{c.enableListing}</label>
      <label className="block">{c.shippingAmount}<input className={input} name="shipping" inputMode="decimal" required defaultValue={listing ? (listing.shipping_cents / 100).toFixed(2) : ''} /></label>
      <label className="block">{c.countries}<input className={input} name="countries" required defaultValue={listing?.shipping_countries.join(', ') || ''} /></label>
      <label className="block">{c.termsUrl}<input className={input} name="terms" type="url" required defaultValue={listing?.terms_url || ''} /></label>
      <button className={button} type="submit">{c.save}</button>
    </fieldset>
    {message && <p role="status" className="mt-3">{message === 'saved' ? c.saved : explain(message)}</p>}
  </form>;
}

type OrderView = { id: string; artwork_title: string; seller_name: string; state: string; total_cents: number; refunded_cents: number; created_at: string; terms_url: string; fulfillment_status: string; tracking_reference: string | null; buyer_email?: string; shipping_details?: { name?: string; address?: Record<string, string | null> } };
type RefundView = { id: string; order_id: string; amount_cents: number; state: string };
function OrderCard({ order, refunds, manager, enabled, reload }: { order: OrderView; refunds: RefundView[]; manager: boolean; enabled: boolean; reload: () => Promise<void> }) {
  const { c, locale } = useCopy(); const explain = useError(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const retry = useRef<{ id: string; amount: string } | null>(null);
  const state = (value: string) => c.statuses[value as keyof typeof c.statuses] || value;
  async function act(action: string, data: unknown) { setBusy(true); setError(''); try { const result = await api<{ resolved?: boolean; url?: string }>(`orders/${order.id}/${action}`, data); if (result.url) window.location.assign(result.url); if (result.resolved === false) setError('REVIEW_REQUIRED'); await reload(); return true; } catch (e) { setError((e as Error).message); return false; } finally { setBusy(false); } }
  const paid = ['paid', 'partially_refunded'].includes(order.state);
  return <article className={card}>
    <div className="flex flex-wrap justify-between gap-3"><h3 className="text-xl">{order.artwork_title}</h3><strong>{state(order.state)}</strong></div>
    <p className="mt-2 text-sm text-neutral-400">{order.seller_name} · {new Date(order.created_at).toLocaleString(locale)} · #{order.id.slice(0, 8)}</p>
    <p className="mt-3">{c.total}: {money(order.total_cents, locale)} · {c.refunded}: {money(order.refunded_cents, locale)}</p>
    <a className="mt-2 inline-block text-sm underline" href={order.terms_url} target="_blank" rel="noopener noreferrer">{c.terms}</a>
    <p className="my-3">{state(order.fulfillment_status)} {order.tracking_reference && `· ${order.tracking_reference}`}</p>
    {manager && order.shipping_details && <address className="my-3 not-italic text-sm"><p>{order.shipping_details.name}</p>{Object.values(order.shipping_details.address || {}).filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}<p>{order.buyer_email}</p></address>}
    {!['expired', 'canceled'].includes(order.state) && <button className={button} disabled={busy} onClick={() => act('sync', {})}>{c.sync}</button>}
    {!manager && ['reserved', 'checkout_open'].includes(order.state) && <button className={`${button} ml-2`} disabled={busy || !enabled} onClick={() => act('resume', {})}>{c.resume}</button>}
    {!!refunds.length && <div className="my-3 text-sm"><p>{c.refunds}</p>{refunds.map(r => <p key={r.id}>{money(r.amount_cents, locale)} · {state(r.state)}</p>)}</div>}
    {manager && paid && <div className="mt-4 grid gap-5 md:grid-cols-2">
      <form onSubmit={async e => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); const amount = String(f.get('amount')); const pending = refunds.find(r => r.state === 'requested' && r.amount_cents === Math.round(Number(amount.replace(',', '.')) * 100)); if (!retry.current || retry.current.amount !== amount) retry.current = { id: pending?.id || crypto.randomUUID(), amount }; if (await act('refund', { amount, request_id: retry.current.id })) { retry.current = null; form.reset(); } }}>
        <label>{c.refundAmount}<input className={input} name="amount" required inputMode="decimal" disabled={busy} /></label><button className={`${button} mt-3`} disabled={busy}>{c.refund}</button>
      </form>
      <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void act('fulfill', { status: f.get('status'), tracking: f.get('tracking') }); }}>
        <label>{c.tracking}<input className={input} name="tracking" maxLength={300} defaultValue={order.tracking_reference || ''} disabled={busy} /></label>
        <select className={input} name="status" defaultValue={order.fulfillment_status} aria-label={c.fulfill} disabled={busy}>{['unfulfilled', 'shipped', 'delivered'].map(s => <option key={s} value={s}>{state(s)}</option>)}</select><button className={`${button} mt-3`} disabled={busy}>{c.fulfill}</button>
      </form>
    </div>}
    {error && <p role="alert" className="mt-3 text-red-300">{explain(error)}</p>}
  </article>;
}

export function CommercePanel({ mode }: { mode: 'buyer' | 'seller' | 'admin' }) {
  const { c } = useCopy(); const explain = useError(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [admin, setAdmin] = useState<{ settings: { payments_enabled: boolean }; effectiveEnabled: boolean; blockers: string[]; mode: string } | null>(null);
  const [enabled, setEnabled] = useState(false); const [orders, setOrders] = useState<OrderView[]>([]); const [refunds, setRefunds] = useState<RefundView[]>([]);
  const [page, setPage] = useState(0); const [hasMore, setHasMore] = useState(false); const [note, setNote] = useState('');
  const reload = useCallback(async () => {
    if (mode === 'admin') setAdmin(await api('admin'));
    const list = await api<{ orders: OrderView[]; refunds: RefundView[]; hasMore: boolean }>(`orders?view=${mode}&page=${page}`);
    setOrders(list.orders); setRefunds(list.refunds); setHasMore(list.hasMore);
    const status = await api<{ paymentsEnabled: boolean }>('status'); setEnabled(status.paymentsEnabled);
    if (mode === 'seller') setSeller(await api<SellerInfo>('seller'));
  }, [mode, page]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void reload().catch(e => setError(e.message)); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);
  async function action(path: string, data: unknown) { setBusy(true); setError(''); setNote(''); try { const result = await api<{ url?: string; cleanup?: { remaining: number | null; reviewRequired?: boolean }; remaining?: number }>(path, data); if (result.url) window.location.assign(result.url); if (result.remaining || result.cleanup?.remaining || result.cleanup?.reviewRequired) setNote(c.pending); await reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <div className="space-y-6">
    <div className={card}><strong className={enabled ? 'text-green-300' : 'text-amber-300'}>{enabled ? c.on : c.off}</strong>{!enabled && <p className="mt-2">{c.disabled}</p>}<p className="mt-2 text-sm text-neutral-400">{c.history}</p></div>
    {error && <p role="alert" className="text-red-300">{explain(error)}</p>}{note && <p role="status">{note}</p>}
    {mode === 'admin' && admin && <section className={card}>
      <p>{admin.mode === 'live' ? c.live : c.test}</p>
      <label className="my-4 flex gap-3"><input type="checkbox" checked={admin.settings.payments_enabled} disabled={busy || (!admin.settings.payments_enabled && !!admin.blockers.length)} onChange={e => action('admin', { enabled: e.target.checked })} />{c.activation}</label>
      {!!admin.blockers.length && <div className="my-4"><p>{c.blockers}</p><ul className="mt-2 list-inside list-disc text-sm text-neutral-400">{admin.blockers.map(b => <li key={b}>{b}</li>)}</ul></div>}
      <button className={button} disabled={busy} onClick={() => action('admin/reconcile', {})}>{c.reconcile}</button>
    </section>}
    {mode === 'seller' && <section className={card}>
      <h2 className="text-xl">{seller?.seller ? c.connected : c.notConnected}</h2>
      {seller?.seller && <p className="mt-3">{seller.seller.charges_enabled && seller.seller.payouts_enabled && seller.seller.details_submitted && !seller.seller.disconnected ? c.ready : c.notReady}</p>}
      <div className="mt-4 flex gap-3"><button className={button} disabled={!enabled || busy} onClick={() => action('seller/connect', {})}>{seller?.seller && !seller.seller.disconnected ? c.notReady : c.connect}</button>{seller?.seller && <button className={button} disabled={busy} onClick={() => action('seller/refresh', {})}>{c.refresh}</button>}</div>
    </section>}
    {mode === 'seller' && <section><h2 className="mb-3 text-2xl">{c.listings}</h2><p className="mb-4 text-sm text-neutral-400">{c.listingHint}</p><div className="grid gap-4 lg:grid-cols-2">{seller?.artworks.map(a => <ListingForm key={a.id} artwork={a} listing={seller.listings.find(l => l.artwork_id === a.id)} enabled={enabled} />)}</div></section>}
    <section><div className="mb-4 flex justify-between"><h2 className="text-2xl">{c.orders}</h2><button className={button} disabled={busy} onClick={() => { setError(''); void reload().catch(e => setError(e.message)); }}>{c.refresh}</button></div>
      {!orders.length && <p>{c.empty}</p>}<div className="space-y-4">{orders.map(o => <OrderCard key={o.id} order={o} refunds={refunds.filter(r => r.order_id === o.id)} manager={mode !== 'buyer'} enabled={enabled} reload={reload} />)}</div>
      <div className="mt-5 flex gap-3"><button className={button} disabled={page === 0} onClick={() => setPage(p => p - 1)}>{c.previous}</button><button className={button} disabled={!hasMore} onClick={() => setPage(p => p + 1)}>{c.next}</button></div>
    </section>
  </div>;
}
