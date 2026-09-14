import Link from "next/link";
import T from "@/components/i18n/T";
import { PremioCard } from "@/components/premio/PremioUi";
import { getPublicAwards, getPublicEntries, getVisiblePremio } from "@/lib/premio/server";
import { AWARD_KEYS, PREMIO_PATH } from "@/lib/premio/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicMetadata, NO_INDEX_METADATA } from "@/lib/seo/site";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { edition } = await getVisiblePremio();
  return { ...createPublicMetadata({ title: "Vincitori · Premio Mostra.Space", description: "Gli artisti vincitori del Premio Mostra.Space, Premio della Critica e Premio Social.", path: `${PREMIO_PATH}/vincitori` }), ...(!edition.results_published_at ? NO_INDEX_METADATA : {}) };
}
export default async function WinnersPage() {
  const { edition, user } = await getVisiblePremio();
  const awards = await getPublicAwards(edition);
  const cards = awards.length ? await createAdminClient().from("premio_entries").select("id,slug").in("id", awards.map(a => a.entry_id)) : { data: [], error: null };
  if (cards.error) throw new Error("PREMIO_DATA_UNAVAILABLE");
  const entries = (await Promise.all((cards.data || []).map(e => getPublicEntries(edition, user?.id || null, 1, "", e.slug)))).flatMap(e => e.entries);
  return <main className="premio-wrap py-12"><Link className="premio-text-link" href={PREMIO_PATH}>← {edition.title}</Link><h1 className="mt-8 font-editorial text-5xl"><T textKey="premio.winners" /></h1>
    {!awards.length ? <p className="premio-status mt-8"><T textKey="premio.resultsSoon" /></p> : <div className="premio-prizes">{AWARD_KEYS.map(key => {
      const award = awards.find(a => a.category === key); const entry = entries.find(e => e.id === award?.entry_id);
      return award && <section key={key}><h2 className="mb-5 font-editorial text-3xl"><T textKey={`premio.award.${key}`} /></h2>{entry && <PremioCard entry={entry} year={edition.year} />}<p className="premio-note mt-5 whitespace-pre-wrap">{award.motivation}</p><p className="mt-4"><T textKey={`premio.benefit.${key}`} /></p></section>;
    })}</div>}
  </main>;
}
