/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import T from "@/components/i18n/T";
import { PremioDate } from "@/components/premio/PremioUi";
import { getAccessibleEntry, getEntrySnapshot } from "@/lib/premio/server";
import { entryPath } from "@/lib/premio/config";
import { NO_INDEX_METADATA } from "@/lib/seo/site";
export const dynamic = "force-dynamic";
export const metadata = { title: "Archivio della candidatura · Premio Mostra.Space", ...NO_INDEX_METADATA };
export default async function ArchivePage({ params }: { params: Promise<{ year: string; slug: string }> }) {
  const { year, slug } = await params;
  const data = await getAccessibleEntry(Number(year), slug);
  if (!data) notFound();
  const snapshot = await getEntrySnapshot(data.entry);
  if (!snapshot) notFound();
  return <main className="premio-wrap py-12"><Link className="premio-text-link" href={entryPath(Number(year), slug)}>← {data.entry.artist_name}</Link>
    <section className="premio-section"><p className="museum-label"><T textKey="premio.submittedVersion" /> {snapshot.version} · <PremioDate value={snapshot.created_at} /></p>
      <h1 className="mt-5 font-editorial text-5xl">{snapshot.manifest.gallery.title}</h1><p className="premio-note mt-5"><T textKey="premio.archiveNote" /></p>
      <p className="mt-6 whitespace-pre-wrap leading-8">{snapshot.manifest.gallery.description}</p>
      <div className="mt-10 grid gap-8 md:grid-cols-2">{snapshot.manifest.artworks.map((work, index) => <article className="premio-panel" key={`${work.id}-${index}`}>
        <img className="mb-6 h-auto max-h-[600px] w-full object-contain" src={`/api/premio/assets/${data.entry.id}/${snapshot.version}/${index}`} alt={`${work.title}${work.artist_name ? ` — ${work.artist_name}` : ""}`} width={1000} height={1000} loading="lazy" />
        <h2 className="font-editorial text-3xl">{work.title}</h2><p className="premio-note mt-3">{[work.artist_name, work.year, work.technique, work.dimensions].filter(Boolean).join(" · ")}</p>
        <p className="premio-note mt-4 whitespace-pre-wrap">{work.description}</p>
      </article>)}</div>
    </section></main>;
}
