import Link from "next/link";
import { notFound } from "next/navigation";
import T from "@/components/i18n/T";
import JsonLd from "@/components/seo/JsonLd";
import { PremioDate, PremioFollow, PremioShare } from "@/components/premio/PremioUi";
import { getAccessibleEntry, getPublicAwards } from "@/lib/premio/server";
import { entryPath, PREMIO_PATH } from "@/lib/premio/config";
import { absoluteUrl, createPublicMetadata, NO_INDEX_METADATA } from "@/lib/seo/site";
import type { EntryCard } from "@/lib/premio/types";
type Props = { params: Promise<{ year: string; slug: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props) {
  const { year, slug } = await params;
  const data = await getAccessibleEntry(Number(year), slug);
  if (!data || !data.isPublic) return { title: "Candidatura · Premio Mostra.Space", ...NO_INDEX_METADATA };
  return createPublicMetadata({ title: `${data.entry.artist_name} · Premio Mostra.Space ${year}`, description: data.entry.statement.slice(0, 160), path: entryPath(Number(year), slug) });
}
export default async function CandidatePage({ params }: Props) {
  const { year, slug } = await params;
  const data = await getAccessibleEntry(Number(year), slug);
  if (!data) notFound();
  const { edition, entry, user, isPublic } = data;
  const publicEntry = isPublic ? entry as EntryCard : null;
  const awards = (await getPublicAwards(edition)).filter(a => a.entry_id === entry.id);
  const path = entryPath(edition.year, entry.slug);
  return <main className="premio-wrap py-12">
    <Link href={PREMIO_PATH} className="premio-text-link">← {edition.title}</Link>
    {isPublic && <JsonLd data={{ "@context": "https://schema.org", "@type": "ProfilePage", name: entry.artist_name, url: absoluteUrl(path), mainEntity: { "@type": "Person", name: entry.artist_name } }} />}
    <section className="premio-hero"><div><p className="museum-label"><T textKey={isPublic ? "premio.admittedArtist" : "premio.privateEntry"} /></p>
      <h1 className="mt-5 break-words">{entry.artist_name || <T textKey="premio.yourEntry" />}</h1>
      {awards.map(a => <p className="premio-status mt-5" key={a.id}><T textKey={`premio.award.${a.category}`} /> · {edition.year}</p>)}
      <p className="premio-note mt-6 whitespace-pre-wrap">{entry.statement}</p>
      {publicEntry && <div className="mt-7 space-y-5"><PremioFollow entry={publicEntry} year={edition.year} viewerId={user?.id || null} />
        <p className="premio-note">{publicEntry.follower_count} <T textKey={entry.social_snapshot_at ? "premio.frozenFollowers" : "premio.validFollowers"} /></p>
        <p className="premio-note"><T textKey="premio.notificationNote" /></p>
        <PremioShare path={path} title={`${entry.artist_name} · ${edition.title}`} /></div>}
    </div><div className="premio-panel"><p className="museum-label"><T textKey="premio.submittedGallery" /></p>
      {publicEntry && <><h2 className="mt-4 font-editorial text-4xl">{publicEntry.gallery_title}</h2><Link className="museum-button-primary mt-6" href={`/gallerie/${encodeURIComponent(publicEntry.gallery_slug)}`}><T textKey="premio.visitGallery" /></Link></>}
      {entry.version > 0 && <><p className="premio-note mt-5"><T textKey="premio.submittedVersion" /> {entry.version}{entry.submitted_at && <> · <PremioDate value={entry.submitted_at} /></>}</p>
        <Link className="museum-button-secondary mt-5" href={`${path}/archivio`}><T textKey="premio.viewSnapshot" /></Link></>}
      {publicEntry?.profile_slug && <Link className="premio-text-link mt-5 block" href={`/profili/${encodeURIComponent(publicEntry.profile_slug)}`}><T textKey="premio.visitProfile" /></Link>}
    </div></section>
    <p className="premio-note mt-8"><T textKey="premio.socialExplanation" /></p>
  </main>;
}
