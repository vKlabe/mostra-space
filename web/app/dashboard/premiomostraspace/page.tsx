import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import T from "@/components/i18n/T";
import PremioApplication from "@/components/premio/PremioApplication";
import { getOwnEntry, getOwnGrants, getVisiblePremio } from "@/lib/premio/server";
import { PREMIO_DASHBOARD, PREMIO_PATH } from "@/lib/premio/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { NO_INDEX_METADATA } from "@/lib/seo/site";
import "@/app/premiomostraspace/premio.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "La tua candidatura · Premio Mostra.Space", ...NO_INDEX_METADATA };
export default async function PremioDashboard() {
  const { edition, configured, user, profile, now } = await getVisiblePremio();
  if (!user) redirect(`${PREMIO_PATH}/iscriviti`);
  const creator = profile?.role === "gallerist" || profile?.role === "admin";
  const entry = configured ? await getOwnEntry(edition.id, user.id) : null;
  const grants = configured ? await getOwnGrants(user.id, edition) : [];
  const { data: galleries, error } = await createAdminClient().from("galleries").select("id,title,status").eq("owner_id", user.id).eq("status", "published").order("title");
  if (error) throw new Error("PREMIO_DATA_UNAVAILABLE");
  return <DashboardShell title={<T textKey="premio.nav" />} subtitle={<T textKey="premio.dashboardDescription" />} activeSection="premio" navMode={creator ? "creator" : "community"}>
    <div className="mb-6 flex flex-wrap gap-4"><Link href={PREMIO_PATH} className="museum-button-secondary"><T textKey="premio.publicPage" /></Link><Link href={`${PREMIO_PATH}/regolamento`} className="museum-button-secondary"><T textKey="premio.rules" /></Link></div>
    {profile?.role === "admin" ? <div className="premio-panel"><T textKey="premio.organizerExcluded" /><Link className="premio-text-link ml-3" href="/admin/premiomostraspace">Admin</Link></div> : <>
      {!creator && <div className="premio-panel mb-6"><h2 className="font-editorial text-3xl"><T textKey="premio.creatorTitle" /></h2><p className="premio-note mt-4"><T textKey="premio.creatorDescription" /></p><Link className="museum-button-primary mt-5" href={`/account/upgrade-gallerist?next=${encodeURIComponent(PREMIO_DASHBOARD)}`}><T textKey="premio.activateCreator" /></Link></div>}
      {creator && !profile?.public_profile_enabled && <div className="premio-status mb-6"><T textKey="premio.publicProfileRequired" /> <Link className="premio-text-link" href="/account"><T textKey="premio.accountSettings" /></Link></div>}
      <PremioApplication serverNow={now} edition={edition} entry={entry} galleries={galleries || []} artistName={profile?.display_name || profile?.full_name || ""} grants={grants} />
    </>}
  </DashboardShell>;
}
