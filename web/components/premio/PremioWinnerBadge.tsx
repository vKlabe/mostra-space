import Link from "next/link";
import T from "@/components/i18n/T";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPremioEdition, getPublicAwards } from "@/lib/premio/server";
import { entryPath } from "@/lib/premio/config";
async function loadBadge({ artistId, galleryId }: { artistId: string; galleryId?: string }) {
  try {
    const edition = await getPremioEdition();
    if (!edition) return null;
    const awards = await getPublicAwards(edition);
    if (!awards.length) return null;
    let query = createAdminClient().from("premio_entries").select("id,slug").eq("artist_id", artistId).eq("edition_id", edition.id).eq("status", "admitted");
    if (galleryId) query = query.eq("gallery_id", galleryId);
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    const award = awards.find(a => a.entry_id === data.id);
    return award ? { path: entryPath(edition.year, data.slug), year: edition.year, category: award.category } : null;
  } catch { return null; } // An unavailable award badge must never break a public gallery/profile.
}

export default async function PremioWinnerBadge(props: { artistId: string; galleryId?: string }) {
  const badge = await loadBadge(props);
  return badge ? <Link href={badge.path} className="mt-4 inline-flex rounded-full border border-[var(--museum-bronze)] px-4 py-2 text-sm text-[var(--museum-bronze-light)]"><T textKey={`premio.award.${badge.category}`} /> · {badge.year}</Link> : null;
}
