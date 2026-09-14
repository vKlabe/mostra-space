import Link from "next/link";
import T from "@/components/i18n/T";
import JsonLd from "@/components/seo/JsonLd";
import { PremioCard, PremioDate } from "@/components/premio/PremioUi";
import { getPublicAwards, getPublicEntries, getVisiblePremio } from "@/lib/premio/server";
import { AWARD_KEYS, PREMIO_DASHBOARD, PREMIO_PATH, premioPhase } from "@/lib/premio/config";
import { absoluteUrl, createPublicMetadata, NO_INDEX_METADATA } from "@/lib/seo/site";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { edition } = await getVisiblePremio();
  return { ...createPublicMetadata({ title: "Premio Mostra.Space 2026 — Il premio dedicato agli artisti", description: "Candida gratuitamente la tua galleria personale. Premio Mostra.Space, Premio della Critica e Premio Social: tre riconoscimenti per tre artisti.", path: PREMIO_PATH }),
    ...(!edition.published ? NO_INDEX_METADATA : {}) };
}
export default async function PremioPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const query = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(query.page)) || 1));
  const { edition, user, preview } = await getVisiblePremio();
  const phase = premioPhase(edition);
  const { entries, count } = await getPublicEntries(edition, user?.id || null, Math.floor(page), query.q || "");
  const awards = await getPublicAwards(edition);
  const cta = user ? PREMIO_DASHBOARD : `${PREMIO_PATH}/iscriviti`;
  return <main className="premio-wrap">
    {edition.published && <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: edition.title, url: absoluteUrl(PREMIO_PATH), description: "Premio gratuito dedicato agli artisti e alle loro gallerie personali su Mostra.Space." }} />}
    {preview && <p className="premio-status mt-6">Anteprima admin · <Link className="premio-text-link" href="/admin/premiomostraspace">Configura e pubblica l’edizione</Link></p>}
    <section className="premio-hero"><div>
      <p className="museum-label">{edition.title}</p>
      <h1 className="mt-6"><T textKey="premio.heroTitle" /></h1>
      <p className="premio-note mt-6 max-w-xl"><T textKey="premio.heroDescription" /></p>
      <p className="mt-5 text-sm text-[var(--museum-bronze-light)]"><T textKey="premio.freePromise" /></p>
      <div className="mt-8 flex flex-wrap gap-3"><Link className="museum-button-primary" href={cta}><T textKey={user ? "premio.yourEntry" : "premio.participate"} /></Link>
        <a className="museum-button-secondary" href="#candidature"><T textKey="premio.explore" /></a></div>
      <p className="premio-note mt-5"><T textKey={`premio.phase.${phase}`} /></p>
      {edition.published && <p className="premio-note mt-2"><T textKey="premio.deadline" /> <PremioDate value={new Date(Date.parse(edition.applications_close_at) - 60000).toISOString()} /> · Europe/Rome</p>}
    </div><div className="premio-medallion" aria-hidden="true"><span>Premio Mostra.Space</span><strong>{edition.year}</strong><span>Arte · Ricerca · Identità</span></div></section>
    <section className="premio-section"><p className="museum-label"><T textKey="premio.threeArtists" /></p><h2 className="mt-3"><T textKey="premio.prizesTitle" /></h2>
      <div className="premio-prizes">{AWARD_KEYS.map((key, i) => <article className="premio-prize" key={key}>
        <span className="museum-label">0{i + 1}</span><h3><T textKey={`premio.award.${key}`} /></h3>
        <p className="text-lg text-[var(--museum-bronze-light)]"><T textKey={`premio.benefit.${key}`} /></p>
        <p className="premio-note mt-4"><T textKey={`premio.description.${key}`} /></p>
      </article>)}</div><p className="premio-note mt-5"><T textKey="premio.prizeExtras" /></p>
    </section>
    {awards.length > 0 && <section className="premio-section"><h2><T textKey="premio.winners" /></h2><div className="premio-prizes">{awards.map(award => <article className="premio-prize" key={award.id}>
      <h3><T textKey={`premio.award.${award.category}`} /></h3><p className="premio-note">{award.motivation}</p>
      <Link className="premio-text-link mt-4 inline-block" href={`${PREMIO_PATH}/vincitori`}><T textKey="premio.discoverWinner" /></Link>
    </article>)}</div></section>}
    <section className="premio-section"><h2><T textKey="premio.howTitle" /></h2><ol className="mt-7 grid gap-5 md:grid-cols-4">{["account", "create", "publish", "submit"].map((key, i) => <li key={key} className="premio-panel">
      <span className="museum-label">0{i + 1}</span><h3 className="mt-3 font-medium"><T textKey={`premio.step.${key}`} /></h3><p className="premio-note mt-3"><T textKey={`premio.stepDescription.${key}`} /></p>
    </li>)}</ol><p className="premio-note mt-5"><T textKey="premio.oneArtist" /></p></section>
    <section id="candidature" className="premio-section scroll-mt-24"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="museum-label">{count} <T textKey="premio.admittedArtists" /></p><h2 className="mt-3"><T textKey="premio.entriesTitle" /></h2></div>
      <form className="premio-form" action={PREMIO_PATH}><label><span className="sr-only"><T textKey="premio.searchArtist" /></span><input name="q" defaultValue={query.q || ""} maxLength={80}  /></label><button className="museum-button-secondary" type="submit"><T textKey="premio.search" /></button></form></div>
      {entries.length ? <div className="premio-entries">{entries.map(entry => <PremioCard key={entry.id} entry={entry} year={edition.year} />)}</div> : <p className="premio-panel premio-note mt-7"><T textKey={query.q ? "premio.noSearch" : "premio.noEntries"} /></p>}
      <div className="mt-6 flex justify-between">{page > 1 ? <Link className="premio-text-link" href={`?page=${page - 1}&q=${encodeURIComponent(query.q || "")}#candidature`}><T textKey="premio.previous" /></Link> : <span />}
        {page * 24 < count && <Link className="premio-text-link" href={`?page=${page + 1}&q=${encodeURIComponent(query.q || "")}#candidature`}><T textKey="premio.next" /></Link>}</div>
    </section>
    <section className="premio-section grid gap-7 md:grid-cols-2"><div className="premio-panel"><h2><T textKey="premio.socialTitle" /></h2><p className="premio-note mt-5"><T textKey="premio.socialExplanation" /></p><p className="premio-note mt-4"><T textKey="premio.notificationNote" /></p></div>
      <div className="premio-panel"><p className="museum-label"><T textKey="premio.ceremony" /></p><h2 className="mt-4"><PremioDate value={edition.ceremony_at} /></h2><p className="premio-note mt-5"><T textKey="premio.ceremonyDescription" /></p><Link className="museum-button-secondary mt-5" href={`${PREMIO_PATH}/evento`}><T textKey="premio.eventDetails" /></Link></div></section>
    <section className="premio-section"><h2><T textKey="premio.faqTitle" /></h2><div className="mt-6 grid gap-3">{["free", "artists", "changes", "followers", "plans"].map(key => <details className="premio-panel" key={key}><summary className="cursor-pointer font-medium"><T textKey={`premio.faq.${key}.q`} /></summary><p className="premio-note mt-4"><T textKey={`premio.faq.${key}.a`} /></p></details>)}</div>
      {edition.published && <div className="premio-panel mt-6"><p className="museum-label">{edition.organizer}</p><p className="premio-note mt-3 whitespace-pre-wrap">{edition.jury_text}</p></div>}
      <div className="mt-8 flex flex-wrap gap-4"><Link className="museum-button-primary" href={cta}><T textKey="premio.participate" /></Link><Link className="museum-button-secondary" href={`${PREMIO_PATH}/regolamento`}><T textKey="premio.rules" /></Link><Link className="museum-button-secondary" href={`${PREMIO_PATH}/vincitori`}><T textKey="premio.winners" /></Link></div>
    </section>
  </main>;
}
