import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import T from "@/components/i18n/T";
import SocialNetworkActions from "@/components/social/SocialNetworkActions";

type NetworkPageProps = {
  searchParams?: Promise<{
    tab?: string | string[];
    q?: string | string[];
  }>;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: "user" | "gallerist" | "admin";
  profile_slug: string | null;
  public_profile_enabled: boolean;
};

type FollowingRow = {
  following_id: string;
  created_at: string;
};

type FollowerRow = {
  follower_id: string;
  created_at: string;
};

type MuteRow = {
  muted_profile_id: string;
};

function getProfileName(profile: Profile) {
  return (
    profile.display_name ||
    profile.full_name ||
    profile.email?.split("@")[0] ||
    null
  );
}

function getInitial(value: string | null | undefined) {
  return value?.trim().slice(0, 1).toUpperCase() || "M";
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function DashboardSocialNetworkPage({
  searchParams,
}: NetworkPageProps) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: currentProfile } = await admin
    .from("profiles")
    .select(
      "id, email, full_name, display_name, avatar_url, bio, role, profile_slug, public_profile_enabled"
    )
    .eq("id", user.id)
    .single<Profile>();

  if (!currentProfile) {
    redirect("/auth/login");
  }

  const params = (await searchParams) || {};
  const requestedTab = getSingleParam(params.tab);
  const activeTab = requestedTab === "followers" ? "followers" : "following";
  const search = getSingleParam(params.q).trim().toLocaleLowerCase();
  const isCreator =
    currentProfile.role === "gallerist" || currentProfile.role === "admin";

  const [followingResult, followerResult, muteResult] = await Promise.all([
    admin
      .from("account_follows")
      .select("following_id, created_at")
      .eq("follower_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("account_follows")
      .select("follower_id, created_at")
      .eq("following_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("account_notification_mutes")
      .select("muted_profile_id")
      .eq("user_id", user.id),
  ]);

  const followingRows = (followingResult.data || []) as FollowingRow[];
  const followerRows = (followerResult.data || []) as FollowerRow[];
  const muteRows = (muteResult.data || []) as MuteRow[];

  const followingIds = followingRows.map((row) => row.following_id);
  const followerIds = followerRows.map((row) => row.follower_id);
  const followingSet = new Set(followingIds);
  const followerSet = new Set(followerIds);
  const mutedSet = new Set(muteRows.map((row) => row.muted_profile_id));

  const profileIds = Array.from(new Set([...followingIds, ...followerIds]));

  const { data: networkProfilesData } =
    profileIds.length > 0
      ? await admin
          .from("profiles")
          .select(
            "id, email, full_name, display_name, avatar_url, bio, role, profile_slug, public_profile_enabled"
          )
          .in("id", profileIds)
      : { data: [] };

  const profileById = new Map(
    ((networkProfilesData || []) as Profile[]).map((profile) => [
      profile.id,
      profile,
    ])
  );

  const sourceIds = activeTab === "following" ? followingIds : followerIds;

  const visibleProfiles = sourceIds
    .map((id) => profileById.get(id))
    .filter(Boolean)
    .filter((profile) => {
      if (!search) {
        return true;
      }

      const safeProfile = profile as Profile;
      const haystack = [
        safeProfile.display_name,
        safeProfile.full_name,
        safeProfile.email?.split("@")[0],
        safeProfile.bio,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return haystack.includes(search);
    }) as Profile[];

  return (
    <DashboardShell
      title={<T textKey="dashboard.social.network.shell.title" fallback="Rete" />}
      subtitle={
        <T
          textKey="dashboard.social.network.shell.subtitle"
          fallback="Gestisci i profili che segui, chi ti segue e le preferenze delle notifiche."
        />
      }
      activeSection="social"
      navMode={isCreator ? "creator" : "community"}
      actions={
        <div className="flex flex-wrap gap-3">
          <a
            href="/dashboard/social"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T textKey="dashboard.social.network.actions.back" fallback="Torna a Social" />
          </a>
          <a
            href="/profili"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T textKey="dashboard.social.network.actions.explore" fallback="Esplora profili" />
          </a>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-2">
              <a
                href="/dashboard/social/rete?tab=following"
                className={
                  activeTab === "following"
                    ? "rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950"
                    : "rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-200 transition hover:border-neutral-400"
                }
              >
                <T textKey="dashboard.social.network.tabs.following" fallback="Seguiti" />{" "}
                · {followingIds.length}
              </a>

              <a
                href="/dashboard/social/rete?tab=followers"
                className={
                  activeTab === "followers"
                    ? "rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950"
                    : "rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-200 transition hover:border-neutral-400"
                }
              >
                <T textKey="dashboard.social.network.tabs.followers" fallback="Ti seguono" />{" "}
                · {followerIds.length}
              </a>
            </div>

            <form method="get" className="flex w-full gap-2 lg:max-w-md">
              <input type="hidden" name="tab" value={activeTab} />
              <label htmlFor="social-network-search" className="sr-only">
                <T
                  textKey="dashboard.social.network.search.label"
                  fallback="Cerca un profilo"
                />
              </label>
              <input
                id="social-network-search"
                type="search"
                name="q"
                defaultValue={getSingleParam(params.q)}
                className="min-w-0 flex-1 rounded-full border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 outline-none transition focus:border-neutral-400"
              />
              <button
                type="submit"
                className="rounded-full border border-neutral-700 px-4 py-2.5 text-xs uppercase tracking-[0.14em] text-neutral-200 transition hover:border-neutral-400"
              >
                <T textKey="dashboard.social.network.search.action" fallback="Cerca" />
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                <T textKey="dashboard.social.network.list.label" fallback="Community" />
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
                {activeTab === "following" ? (
                  <T textKey="dashboard.social.network.list.followingTitle" fallback="Profili che segui" />
                ) : (
                  <T textKey="dashboard.social.network.list.followersTitle" fallback="Profili che ti seguono" />
                )}
              </h2>
            </div>

            {search && (
              <a
                href={`/dashboard/social/rete?tab=${activeTab}`}
                className="text-xs text-neutral-400 underline decoration-neutral-700 underline-offset-4 transition hover:text-white"
              >
                <T textKey="dashboard.social.network.search.clear" fallback="Azzera ricerca" />
              </a>
            )}
          </div>

          {visibleProfiles.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-sm leading-6 text-neutral-500">
              {search ? (
                <T textKey="dashboard.social.network.empty.search" fallback="Nessun profilo corrisponde alla ricerca." />
              ) : activeTab === "following" ? (
                <T textKey="dashboard.social.network.empty.following" fallback="Non segui ancora nessun profilo." />
              ) : (
                <T textKey="dashboard.social.network.empty.followers" fallback="Nessun profilo ti segue ancora." />
              )}
            </p>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {visibleProfiles.map((networkProfile) => {
                const name = getProfileName(networkProfile);
                const isFollowing = followingSet.has(networkProfile.id);
                const isFollower = followerSet.has(networkProfile.id);
                const isMutual = isFollowing && isFollower;
                const profileHref =
                  networkProfile.public_profile_enabled && networkProfile.profile_slug
                    ? `/profili/${networkProfile.profile_slug}`
                    : null;

                return (
                  <article
                    key={networkProfile.id}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neutral-800 bg-black">
                        {networkProfile.avatar_url ? (
                          <img
                            src={networkProfile.avatar_url}
                            alt={name || "mostra.space"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-neutral-300">
                            {getInitial(name)}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-neutral-100">
                          {name || (
                            <T textKey="dashboard.social.network.profile.unknown" fallback="Profilo mostra.space" />
                          )}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {isMutual ? (
                            <span className="rounded-full border border-emerald-900 bg-emerald-950/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-300">
                              <T textKey="dashboard.social.network.profile.mutual" fallback="Follow reciproco" />
                            </span>
                          ) : (
                            <>
                              {isFollowing && (
                                <span className="rounded-full border border-neutral-800 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                                  <T textKey="dashboard.social.network.profile.youFollow" fallback="Lo segui" />
                                </span>
                              )}
                              {isFollower && (
                                <span className="rounded-full border border-neutral-800 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                                  <T textKey="dashboard.social.network.profile.followsYou" fallback="Ti segue" />
                                </span>
                              )}
                            </>
                          )}

                          {!networkProfile.public_profile_enabled && (
                            <span className="rounded-full border border-neutral-800 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                              <T textKey="dashboard.social.network.profile.private" fallback="Profilo non pubblico" />
                            </span>
                          )}

                          {isFollowing && mutedSet.has(networkProfile.id) && (
                            <span className="rounded-full border border-amber-900 bg-amber-950/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-300">
                              <T textKey="dashboard.social.network.profile.muted" fallback="Notifiche silenziate" />
                            </span>
                          )}
                        </div>

                        {networkProfile.bio && (
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-500">
                            {networkProfile.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      {profileHref && (
                        <a
                          href={profileHref}
                          className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200 transition hover:border-neutral-400"
                        >
                          <T textKey="dashboard.social.network.actions.openProfile" fallback="Apri profilo" />
                        </a>
                      )}

                      <SocialNetworkActions
                        profileId={networkProfile.id}
                        initialIsFollowing={isFollowing}
                        initialIsMuted={mutedSet.has(networkProfile.id)}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
