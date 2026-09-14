import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import PremioAdmin, { type AdminReview } from "@/components/premio/PremioAdmin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getPremioEdition } from "@/lib/premio/server";
import type { Award, Entry, PrizeGrant } from "@/lib/premio/types";
import "@/app/premiomostraspace/premio.css";
export const dynamic = "force-dynamic";
export default async function AdminPremioPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { admin } = await requireAdmin(); const edition = await getPremioEdition();
  if (!edition) return <AdminShell title="Premio Mostra.Space" activeSection="premio"><p className="premio-status">Esegui le migrazioni Premio Mostra.Space nel database per iniziare la configurazione.</p></AdminShell>;
  const page = Math.max(1, Math.floor(Number((await searchParams).page) || 1));
  const [entries, awards, audit, exclusions] = await Promise.all([
    admin.from("premio_entries").select("*", { count: "exact" }).eq("edition_id", edition.id).order("created_at").order("id").range((page - 1) * 30, page * 30 - 1),
    admin.from("premio_awards").select("*").eq("edition_id", edition.id),
    admin.from("premio_audit_log").select("id,action,created_at,actor_id,entry_id,details").eq("edition_id", edition.id).order("id", { ascending: false }).limit(100),
    admin.from("premio_follow_exclusions").select("follower_id,reason").eq("edition_id", edition.id).limit(1000),
  ]);
  if ([entries, awards, audit, exclusions].some(r => r.error)) throw new Error("PREMIO_DATA_UNAVAILABLE");
  const ids = (entries.data || []).map(e => e.id);
  const [reviews, grants, counts] = await Promise.all([
    ids.length ? admin.from("premio_reviews").select("*").in("entry_id", ids) : { data: [], error: null },
    awards.data?.length ? admin.from("premio_grants").select("*").in("award_id", awards.data.map(a => a.id)) : { data: [], error: null },
    ids.length ? admin.rpc("premio_counts", { p_edition: edition.id }).in("entry_id", ids) : { data: [], error: null },
  ]);
  if ([reviews, grants, counts].some(r => r.error)) throw new Error("PREMIO_DATA_UNAVAILABLE");
  return <AdminShell title="Premio Mostra.Space" subtitle="Candidature, giuria, Premio Social e premiazione." activeSection="premio">
    <PremioAdmin edition={edition} entries={(entries.data || []) as Entry[]} reviews={(reviews.data || []) as AdminReview[]} awards={(awards.data || []) as Award[]} grants={(grants.data || []) as PrizeGrant[]} audit={audit.data || []} exclusions={exclusions.data || []} counts={Object.fromEntries((counts.data || []).map((c: { entry_id: string; total: number }) => [c.entry_id, c.total]))} total={entries.count || 0} />
    <nav className="mt-8 flex justify-between">{page > 1 ? <Link href={`?page=${page - 1}`} className="premio-text-link">← Precedenti</Link> : <span />}{page * 30 < (entries.count || 0) && <Link href={`?page=${page + 1}`} className="premio-text-link">Successive →</Link>}</nav>
  </AdminShell>;
}
