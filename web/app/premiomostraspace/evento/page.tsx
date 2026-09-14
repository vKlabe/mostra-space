import Link from "next/link";
import T from "@/components/i18n/T";
import { PremioDate } from "@/components/premio/PremioUi";
import { getVisiblePremio } from "@/lib/premio/server";
import { PREMIO_PATH, safeWebUrl } from "@/lib/premio/config";
import { createPublicMetadata, NO_INDEX_METADATA } from "@/lib/seo/site";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { edition } = await getVisiblePremio();
  return { ...createPublicMetadata({ title: "La premiazione · Premio Mostra.Space", description: "L'evento di rivelazione dei tre artisti vincitori del Premio Mostra.Space.", path: `${PREMIO_PATH}/evento` }), ...(!edition.published ? NO_INDEX_METADATA : {}) };
}
export default async function EventPage() {
  const { edition } = await getVisiblePremio();
  return <main className="premio-wrap py-12"><Link className="premio-text-link" href={PREMIO_PATH}>← {edition.title}</Link>
    <section className="premio-section"><p className="museum-label"><T textKey="premio.ceremony" /></p><h1 className="mt-5 font-editorial text-5xl"><PremioDate value={edition.ceremony_at} /></h1>
      <p className="premio-note mt-3">Europe/Rome</p><p className="premio-note mt-6 max-w-2xl"><T textKey="premio.ceremonyDescription" /></p>
      <div className="mt-7 flex flex-wrap gap-4">{edition.published && <a href="/api/premio/calendar" className="museum-button-secondary"><T textKey="premio.addCalendar" /></a>}
        {safeWebUrl(edition.event_url) ? <a href={safeWebUrl(edition.event_url)} className="museum-button-primary" target="_blank" rel="noreferrer"><T textKey="premio.watchEvent" /></a> : <p className="premio-status"><T textKey="premio.eventLinkSoon" /></p>}</div>
      <ol className="mt-10 grid gap-4 md:grid-cols-3">{["eventIntro", "eventArtists", "eventAwards"].map((key, i) => <li className="premio-panel" key={key}><span className="museum-label">0{i + 1}</span><p className="mt-4"><T textKey={`premio.${key}`} /></p></li>)}</ol>
    </section></main>;
}
