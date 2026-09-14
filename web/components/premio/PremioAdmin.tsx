"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Edition } from "@/lib/premio/config";
import { entryPath } from "@/lib/premio/config";
import type { Award, Entry, PrizeGrant } from "@/lib/premio/types";
import { PremioDate, usePremioText } from "./PremioUi";
export type AdminReview = { entry_id: string; reviewer_name: string; score: number; quality: number; concept: number; curation: number; texts: number; space: number; notes: string };
type AuditRow = { id: number; action: string; created_at: string; actor_id: string | null; entry_id: string | null; details: unknown };
const dates = { applications_open_at: "Apertura candidature", applications_close_at: "Chiusura candidature (istante escluso)", social_campaign_at: "Inizio campagna social", social_close_at: "Chiusura social (istante escluso)", ceremony_at: "Evento di premiazione" } as const;
export default function PremioAdmin({ edition, entries, reviews, awards, grants, audit, exclusions, counts, total }: {
  edition: Edition; entries: Entry[]; reviews: AdminReview[]; awards: Award[]; grants: PrizeGrant[];
  audit: AuditRow[]; exclusions: { follower_id: string; reason: string }[]; counts: Record<string, number>; total: number;
}) {
  const router = useRouter(); const t = usePremioText(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [failed, setFailed] = useState(false);
  async function act(body: Record<string, unknown>) {
    if (busy) return; setBusy(true); setMessage(""); setFailed(false);
    try {
      const response = await fetch("/api/admin/premio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { const key = `error.${result.code}`; const text = t(key); throw new Error(text === key ? `${t("genericError")} (${result.code})` : text); }
      setMessage("Operazione completata."); router.refresh();
    } catch (e) { setFailed(true); setMessage(e instanceof Error ? e.message : "Operazione non riuscita."); }
    finally { setBusy(false); }
  }
  function send(event: FormEvent<HTMLFormElement>, action: string, extra: Record<string, unknown> = {}) {
    event.preventDefault(); const form = new FormData(event.currentTarget); void act({ ...Object.fromEntries(form.entries()), ...extra, action });
  }
  function settings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = { action: "settings", ...Object.fromEntries(form.entries()),
      published: form.has("published"), paused: form.has("paused"), rulesApproved: form.has("rulesApproved") };
    for (const key of Object.keys(dates)) {
      const value = String(form.get(key));
      // Explicit ISO offsets avoid local-machine timezone ambiguity and DST mistakes.
      if (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) { setMessage("Inserisci date ISO con fuso esplicito, per esempio 2026-10-06T18:00:00+02:00."); setFailed(true); return; }
      body[key] = new Date(value).toISOString();
    }
    void act(body);
  }
  return <div className="space-y-7">
    <div className="premio-panel"><div className="flex flex-wrap gap-4"><Link className="museum-button-secondary" href="/premiomostraspace">Pagina pubblica</Link><a href="/api/admin/premio/export?kind=entries" className="museum-button-secondary">Esporta candidature CSV</a><a href="/api/admin/premio/export?kind=followers" className="museum-button-secondary">Esporta cronologia follow CSV</a><button className="museum-button-secondary" disabled={busy} onClick={() => void act({ action: "maintenance" })}>Aggiorna scadenze e conteggi</button></div>
      <p className="premio-note mt-4">{total} candidature · {edition.published ? "Edizione pubblicata" : "Edizione in bozza"} · {edition.results_published_at ? "Risultati pubblici" : "Risultati riservati"}</p></div>
    {message && <p role={failed ? "alert" : "status"} className={`sticky top-4 z-40 rounded-xl border bg-[#181512] p-5 ${failed ? "border-red-700 text-red-200" : "border-emerald-700 text-emerald-200"}`}>{message}</p>}
    <details className="premio-panel"><summary className="cursor-pointer text-lg font-medium">Edizione, calendario e regolamento</summary>
      <form className="premio-form mt-6" onSubmit={settings}><label>Titolo<input name="title" defaultValue={edition.title} required maxLength={150} /></label><label>Organizzatore<input name="organizer" defaultValue={edition.organizer} required /></label>
        {Object.entries(dates).map(([key, label]) => <label key={key}>{label}<input name={key} defaultValue={edition[key as keyof typeof dates]} required /><span className="premio-note"><PremioDate value={edition[key as keyof typeof dates]} /> · Europe/Rome</span></label>)}
        <p className="premio-note">Le chiusure sono istanti esclusi: 2026-11-15T23:00:00Z corrisponde alle 00:00 del 16 novembre in Italia. Testo del regolamento e calendario si bloccano all’apertura delle candidature.</p>
        <label>Giuria e responsabile del Premio della Critica<textarea name="juryText" defaultValue={edition.jury_text} required maxLength={5000} /></label>
        <label>Versione regolamento<input name="rulesVersion" defaultValue={edition.rules_version} required /></label><label>Regolamento definitivo<textarea name="rulesText" defaultValue={edition.rules_text} rows={16} maxLength={50000} /></label>
        <label>Link della diretta<input name="eventUrl" type="url" defaultValue={edition.event_url} /></label>
        <label><input type="checkbox" name="rulesApproved" defaultChecked={edition.rules_approved} />Regolamento e inquadramento dell’iniziativa verificati e approvati dall’organizzatore.</label>
        <label><input type="checkbox" name="published" defaultChecked={edition.published} />Pubblica l’edizione e abilita le candidature nelle date previste.</label>
        <label><input type="checkbox" name="paused" defaultChecked={edition.paused} />Sospendi temporaneamente nuovi invii.</label>
        <button type="submit" className="museum-button-primary" disabled={busy}>Salva configurazione</button>
      </form>
    </details>
    <section><h2 className="font-editorial text-4xl">Candidature</h2><p className="premio-note mt-3">Ordine di arrivo. I punteggi sono riservati. Pesi: opere 30%, concetto 20%, curatela 20%, testi 15%, spazio 15%. L’invio di una nuova versione annulla ammissione e valutazioni precedenti.</p>
      <div className="mt-6 space-y-5">{entries.map(entry => <details className="premio-panel" key={`${entry.id}-${entry.version}-${entry.status}`}><summary className="cursor-pointer"><strong>{entry.artist_name || "Candidatura in preparazione"}</strong> · {t(`status.${entry.status}`)} · {entry.social_count ?? counts[entry.id] ?? 0} follower validi</summary>
        <div className="mt-5 space-y-5"><p className="premio-note break-all">Account: <Link className="premio-text-link" href={`/admin/utenti#utente-${entry.artist_id}`}>{entry.artist_id}</Link> · Versione {entry.version}</p>
          <p className="premio-note whitespace-pre-wrap">{entry.statement}</p>{entry.version > 0 && <Link className="museum-button-secondary" href={`${entryPath(edition.year, entry.slug)}/archivio`} target="_blank">Esamina opere e testi inviati</Link>}
          {entry.version > 0 && <a href={`/api/admin/premio/snapshot?entryId=${entry.id}`} className="premio-text-link block">Scarica la scheda conservata con allestimento e coordinate</a>}
          {!awards.length && ["submitted", "admitted", "excluded"].includes(entry.status) && <form className="premio-form" onSubmit={e => send(e, "moderate", { entryId: entry.id })}>
            <label>Stato<select name="status" defaultValue={entry.status}><option value="submitted">Da verificare</option><option value="admitted">Ammessa</option><option value="excluded">Esclusa</option></select></label><label>Nota visibile all’artista (obbligatoria per esclusione)<textarea name="note" defaultValue={entry.public_note} maxLength={2000} /></label><button className="museum-button-secondary" disabled={busy}>Salva ammissione</button>
          </form>}
          {reviews.filter(r => r.entry_id === entry.id).map(r => <div key={r.reviewer_name} className="premio-status"><strong>{r.reviewer_name}: {Number(r.score).toFixed(2)}/100</strong><p className="premio-note">{r.quality} / {r.concept} / {r.curation} / {r.texts} / {r.space}</p><p className="premio-note whitespace-pre-wrap">{r.notes}</p></div>)}
          {!awards.length && entry.status === "admitted" && <form className="premio-form" onSubmit={e => send(e, "review", { entryId: entry.id })}><label>Nome del giurato (stesso nome aggiorna la scheda)<input name="reviewer" required minLength={2} maxLength={120} /></label>
            <div className="grid gap-3 sm:grid-cols-5">{Object.entries({ quality: "Opere", concept: "Concetto", curation: "Curatela", texts: "Testi", space: "Spazio" }).map(([key, label]) => <label key={key}>{label}<input name={key} type="number" min={0} max={100} step={1} required /></label>)}</div><label>Motivazione riservata<textarea name="note" maxLength={5000} /></label><button disabled={busy} className="museum-button-secondary">Registra valutazione</button>
          </form>}
        </div></details>)}</div>
    </section>
    <details className="premio-panel"><summary className="cursor-pointer text-lg font-medium">Verifica follower e anomalie</summary><p className="premio-note mt-4">Il CSV contiene gli intervalli dei follow. Sono validi gli account verificati prima della scadenza; ogni account conta una volta per artista. Escludi solo anomalie accertate e motiva la decisione. L’esclusione vale per tutta l’edizione e non rimuove il collegamento sociale.</p>
      {!awards.length && <form className="premio-form mt-5" onSubmit={e => send(e, "excludeFollower")}><label>ID account da escludere<input name="followerId" required pattern="[0-9a-fA-F-]{36}" /></label><label>Motivazione<textarea name="reason" required minLength={10} maxLength={3000} /></label><button disabled={busy} className="museum-button-secondary">Escludi dal conteggio</button></form>}
      {exclusions.map(x => <div className="premio-status mt-5" key={x.follower_id}><p className="break-all">{x.follower_id}</p><p>{x.reason}</p>{!awards.length && <form className="premio-form mt-3" onSubmit={e => send(e, "restoreFollower", { followerId: x.follower_id })}><label>Motivo del ripristino<input name="reason" required minLength={10} /></label><button disabled={busy} className="museum-button-secondary">Ripristina</button></form>}</div>)}
    </details>
    <details className="premio-panel"><summary className="cursor-pointer text-lg font-medium">Assegnazione dei tre premi</summary>
      <p className="premio-note mt-5">Dopo la chiusura social, completa le valutazioni di tutti gli ammessi. Indica il vincitore con la media più alta per Mostra.Space e la scelta di Vincenzo Bordoni per la Critica. Il Social viene assegnato automaticamente al primo artista restante per follower validi; parità risolta con punteggio, poi invio più antico. L’assegnazione è definitiva.</p>
      {!awards.length ? <form className="premio-form mt-5" onSubmit={e => send(e, "finalize")}><label>ID candidatura Premio Mostra.Space<input name="mainId" required pattern="[0-9a-fA-F-]{36}" /></label><label>ID candidatura Premio della Critica<input name="criticId" required pattern="[0-9a-fA-F-]{36}" /></label>
        <p className="premio-note">ID candidati in questa pagina: {entries.filter(e => e.status === "admitted").map(e => `${e.artist_name}: ${e.id}`).join(" · ")}</p>
        {["mainReason", "criticReason", "socialReason"].map((key, i) => <label key={key}>Motivazione pubblica: {['Mostra.Space', 'Critica', 'Social'][i]}<textarea name={key} required minLength={20} maxLength={5000} /></label>)}
        <label><input type="checkbox" required />Confermo le verifiche, le tre motivazioni e l’assegnazione definitiva a tre artisti diversi.</label><button disabled={busy} className="museum-button-primary">Assegna i premi senza pubblicarli</button></form>
        : <div className="mt-5 space-y-4">{awards.map(a => <div className="premio-status" key={a.id}><strong>{t(`award.${a.category}`)}</strong><p className="break-all">Candidatura {a.entry_id}</p><p>{a.motivation}</p></div>)}{!edition.results_published_at && <form onSubmit={e => send(e, "publishResults")} className="premio-form"><label><input type="checkbox" required />Confermo la pubblicazione dei vincitori. Disponibile dall’orario della cerimonia.</label><button disabled={busy} className="museum-button-primary">Pubblica i vincitori</button></form>}</div>}
    </details>
    {grants.length > 0 && <details className="premio-panel"><summary className="cursor-pointer text-lg font-medium">Consegna dei premi</summary><p className="premio-note mt-4">I vincitori con piano Free attivano il premio dalla propria candidatura. Per chi paga già un abbonamento, coordina il beneficio tramite Billing prima di registrare la consegna; questo pulsante documenta la consegna e non modifica Stripe.</p>
      {grants.map(g => <div className="premio-status mt-5" key={g.id}><p className="break-all">{g.artist_id} · {g.plan.toUpperCase()} / {g.months} mesi · {g.status}</p>{g.ends_at && <PremioDate value={g.ends_at} />}
        {g.status === "available" && <form className="premio-form mt-4" onSubmit={e => send(e, "deliver", { grantId: g.id })}><label>Beneficio effettivamente erogato e periodo concordato<textarea name="note" required minLength={20} maxLength={3000} /></label><label><input type="checkbox" required />Il premio è stato effettivamente erogato e verificato nel pannello Billing.</label><button disabled={busy} className="museum-button-secondary">Registra consegna concordata</button></form>}</div>)}
    </details>}
    <details className="premio-panel"><summary className="cursor-pointer text-lg font-medium">Registro delle ultime 100 operazioni</summary><div className="mt-5 space-y-3">{audit.map(row => <div key={row.id} className="border-b border-[var(--museum-border)] pb-3"><p><PremioDate value={row.created_at} /> · {row.action}</p><p className="premio-note break-all">{row.actor_id} · {row.entry_id}</p><pre className="premio-note overflow-x-auto">{JSON.stringify(row.details, null, 2)}</pre></div>)}</div></details>
  </div>;
}
