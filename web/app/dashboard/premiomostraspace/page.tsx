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
    <section className="premio-panel mb-6" aria-labelledby="premio-application-guide-title">
      <h2 id="premio-application-guide-title" className="font-editorial text-3xl">
        <T textKey="premio.applicationGuide.title" />
      </h2>
      <p className="premio-status mt-4 text-base font-semibold text-[var(--museum-ivory)] sm:text-lg">
        <T textKey="premio.applicationGuide.requirement" />
      </p>
      {!creator && (
        <p className="premio-note mt-4">
          <T textKey="premio.applicationGuide.creator" />{" "}
          <Link className="premio-text-link" href={`/account/upgrade-gallerist?next=${encodeURIComponent(PREMIO_DASHBOARD)}`}>
            <T textKey="premio.activateCreator" />
          </Link>
        </p>
      )}
      <ol className="mt-5 list-decimal space-y-2 pl-6 text-sm leading-relaxed text-[var(--museum-ivory-soft)] marker:font-semibold marker:text-[var(--museum-bronze-light)] sm:text-base">
        <li>
          <T textKey="premio.applicationGuide.upload" />{" "}
          <Link className="premio-text-link" href="/dashboard/opere">
            <T textKey="dashboard.shell.creatorNav.artworks.label" fallback="Opere" />
          </Link>.
        </li>
        <li>
          <T textKey="premio.applicationGuide.create" />{" "}
          <Link className="premio-text-link" href="/dashboard/gallerie">
            <T textKey="dashboard.shell.creatorNav.galleries.label" fallback="Gallerie" />
          </Link>.
        </li>
        <li><T textKey="premio.applicationGuide.connect" /></li>
        <li><T textKey="premio.applicationGuide.place" /></li>
        <li><T textKey="premio.applicationGuide.publish" /></li>
        <li><T textKey="premio.applicationGuide.submit" /></li>
      </ol>
    </section>
    <div className="mb-6 flex flex-wrap gap-4"><Link href={PREMIO_PATH} className="museum-button-secondary"><T textKey="premio.publicPage" /></Link><Link href={`${PREMIO_PATH}/regolamento`} className="museum-button-secondary"><T textKey="premio.rules" /></Link></div>
    {profile?.role === "admin" ? <div className="premio-panel"><T textKey="premio.organizerExcluded" /><Link className="premio-text-link ml-3" href="/admin/premiomostraspace">Admin</Link></div> : <>
      {creator && !profile?.public_profile_enabled && <div className="premio-status mb-6"><T textKey="premio.publicProfileRequired" /> <Link className="premio-text-link" href="/account"><T textKey="premio.accountSettings" /></Link></div>}
      <PremioApplication serverNow={now} edition={edition} entry={entry} galleries={galleries || []} artistName={profile?.display_name || profile?.full_name || ""} grants={grants} />
    </>}
  </DashboardShell>;
}
