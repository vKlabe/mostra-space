import Link from "next/link";
import FollowProfileButton from "@/components/profiles/FollowProfileButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ProfilesIndexPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

type PublicProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "institution";
  bio: string | null;
  website_url: string | null;
  instagram_url: string | null;
  profile_slug: string | null;
  public_profile_enabled: boolean;
  created_at: string;
};

type FollowRow = {
  following_id: string;
};

type GalleryOwnerRow = {
  owner_id: string;
};

type ArtworkOwnerRow = {
  owner_id: string;
};

function getDisplayName(profile: PublicProfile) {
  return (
    profile.display_name ||
    profile.full_name ||
    profile.email?.split("@")[0] ||
    "Profilo mostra.space"
  );
}

function getRoleLabel(role?: string | null) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "gallerist") {
    return "Gallerista / Artista";
  }

  return "Community";
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "M";
}

function getAlphabetKey(name: string) {
  const first = getInitial(name);

  if (/^[A-ZÀ-ÖØ-Ý]$/i.test(first)) {
    return first;
  }

  return "#";
}

function matchesSearch(profile: PublicProfile, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const searchableText = [
    profile.display_name,
    profile.full_name,
    profile.email,
    profile.bio,
    profile.website_url,
    profile.instagram_url,
    profile.role,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

function incrementCount(map: Map<string, number>, key: string | null | undefined) {
  if (!key) {
    return;
  }

  map.set(key, (map.get(key) || 0) + 1);
}

export default async function ProfilesIndexPage({
  searchParams,
}: ProfilesIndexPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const searchQuery = (resolvedSearchParams.q || "").trim();

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select(
      "id, email, full_name, display_name, avatar_url, role, plan, bio, website_url, instagram_url, profile_slug, public_profile_enabled, created_at"
    )
    .eq("public_profile_enabled", true)
    .not("profile_slug", "is", null)
    .order("display_name", { ascending: true, nullsFirst: false })
    .limit(250);

  const safeProfiles = ((profiles || []) as PublicProfile[])
    .filter((profile) => Boolean(profile.profile_slug))
    .filter((profile) => matchesSearch(profile, searchQuery))
    .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b), "it"));

  const profileIds = safeProfiles.map((profile) => profile.id);

  const followerCountByProfile = new Map<string, number>();
  const publicGalleryCountByProfile = new Map<string, number>();
  const publicArtworkCountByProfile = new Map<string, number>();
  const followingSet = new Set<string>();

  if (profileIds.length > 0) {
    const { data: followRows } = await admin
      .from("account_follows")
      .select("following_id")
      .in("following_id", profileIds);

    ((followRows || []) as FollowRow[]).forEach((row) => {
      incrementCount(followerCountByProfile, row.following_id);
    });

    const { data: galleryRows } = await admin
      .from("galleries")
      .select("owner_id")
      .in("owner_id", profileIds)
      .eq("status", "published");

    ((galleryRows || []) as GalleryOwnerRow[]).forEach((row) => {
      incrementCount(publicGalleryCountByProfile, row.owner_id);
    });

    const { data: artworkRows } = await admin
      .from("artworks")
      .select("owner_id")
      .in("owner_id", profileIds)
      .eq("is_public", true);

    ((artworkRows || []) as ArtworkOwnerRow[]).forEach((row) => {
      incrementCount(publicArtworkCountByProfile, row.owner_id);
    });

    if (user) {
      const { data: myFollowRows } = await admin
        .from("account_follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", profileIds);

      ((myFollowRows || []) as FollowRow[]).forEach((row) => {
        followingSet.add(row.following_id);
      });
    }
  }

  const groups = safeProfiles.reduce((accumulator, profile) => {
    const name = getDisplayName(profile);
    const key = getAlphabetKey(name);

    if (!accumulator.has(key)) {
      accumulator.set(key, []);
    }

    accumulator.get(key)?.push(profile);

    return accumulator;
  }, new Map<string, PublicProfile[]>());

  const orderedGroups = Array.from(groups.entries()).sort(([a], [b]) =>
    a.localeCompare(b, "it")
  );

  return (
    <main className="museum-page min-h-screen px-4 py-10 text-[var(--museum-ivory)] md:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/gallerie"
            className="rounded-full border border-[var(--museum-border-soft)] px-5 py-2 text-sm text-[var(--museum-ivory-soft)] transition hover:border-[var(--museum-bronze)]"
          >
            Gallerie
          </Link>

          <Link
            href="/account"
            className="rounded-full border border-[var(--museum-border-soft)] px-5 py-2 text-sm text-[var(--museum-ivory-soft)] transition hover:border-[var(--museum-bronze)]"
          >
            Account
          </Link>
        </div>

        <section className="rounded-[2rem] border border-[var(--museum-border-soft)] bg-[var(--museum-panel)] p-6 shadow-2xl shadow-black/20 md:p-8">
          <p className="museum-label">Community</p>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <h1 className="font-serif text-5xl text-[var(--museum-ivory)] md:text-7xl">
                Profili pubblici
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--museum-stone)]">
                Scopri artisti, galleristi, curatori e istituzioni presenti su
                mostra.space. Segui i profili che ti interessano e ritrovali
                nella tua area account.
              </p>
            </div>

            <form action="/profili" className="rounded-3xl border border-[var(--museum-border-soft)] bg-black/35 p-4">
              <label
                htmlFor="profile-search"
                className="text-xs uppercase tracking-[0.22em] text-[var(--museum-bronze)]"
              >
                Cerca profilo
              </label>

              <div className="mt-3 flex gap-2">
                <input
                  id="profile-search"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Nome, bio, ruolo..."
                  className="min-w-0 flex-1 rounded-2xl border border-[var(--museum-border-soft)] bg-black/60 px-4 py-3 text-sm text-[var(--museum-ivory)] outline-none transition placeholder:text-[var(--museum-stone-muted)] focus:border-[var(--museum-bronze)]"
                />

                <button
                  type="submit"
                  className="rounded-2xl bg-[var(--museum-bronze)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:brightness-110"
                >
                  Cerca
                </button>
              </div>

              {searchQuery && (
                <Link
                  href="/profili"
                  className="mt-3 inline-flex text-xs text-[var(--museum-stone-muted)] underline decoration-[var(--museum-border-soft)] underline-offset-4 transition hover:text-[var(--museum-ivory)]"
                >
                  Cancella ricerca
                </Link>
              )}
            </form>
          </div>
        </section>

        {profilesError && (
          <section className="mt-8 rounded-[2rem] border border-red-900 bg-red-950/30 p-6 text-red-100">
            <p className="font-medium">Non riesco a caricare i profili.</p>
            <p className="mt-2 text-sm text-red-200">{profilesError.message}</p>
          </section>
        )}

        {!profilesError && safeProfiles.length === 0 && (
          <section className="mt-8 rounded-[2rem] border border-[var(--museum-border-soft)] bg-[var(--museum-panel)] p-8">
            <p className="museum-label">Nessun risultato</p>
            <h2 className="mt-3 font-serif text-3xl text-[var(--museum-ivory)]">
              Non ci sono profili pubblici per questa ricerca.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--museum-stone-muted)]">
              Prova con un nome, una galleria, una parola della bio oppure
              cancella la ricerca.
            </p>
          </section>
        )}

        {!profilesError && safeProfiles.length > 0 && (
          <section className="mt-8 space-y-8">
            {orderedGroups.map(([letter, groupProfiles]) => (
              <div key={letter} className="grid gap-5 lg:grid-cols-[72px_1fr]">
                <div>
                  <div className="sticky top-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--museum-border-soft)] bg-[var(--museum-panel)] font-serif text-3xl text-[var(--museum-bronze)]">
                    {letter}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groupProfiles.map((profile) => {
                    const displayName = getDisplayName(profile);
                    const followerCount =
                      followerCountByProfile.get(profile.id) || 0;
                    const galleryCount =
                      publicGalleryCountByProfile.get(profile.id) || 0;
                    const artworkCount =
                      publicArtworkCountByProfile.get(profile.id) || 0;

                    return (
                      <article
                        key={profile.id}
                        className="rounded-[1.75rem] border border-[var(--museum-border-soft)] bg-[var(--museum-panel)] p-5 transition hover:border-[var(--museum-bronze)]"
                      >
                        <div className="flex items-start gap-4">
                          <Link
                            href={`/profili/${profile.profile_slug}`}
                            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--museum-border-soft)] bg-black/60"
                          >
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="font-serif text-2xl text-[var(--museum-bronze)]">
                                {getInitial(displayName)}
                              </span>
                            )}
                          </Link>

                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/profili/${profile.profile_slug}`}
                              className="block truncate text-lg font-semibold text-[var(--museum-ivory)] transition hover:text-[var(--museum-bronze)]"
                            >
                              {displayName}
                            </Link>

                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--museum-stone-muted)]">
                              {getRoleLabel(profile.role)}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[var(--museum-stone-muted)]">
                          {profile.bio ||
                            "Profilo pubblico mostra.space. Bio non ancora inserita."}
                        </p>

                        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-2xl border border-[var(--museum-border-soft)] px-3 py-2">
                            <p className="text-base text-[var(--museum-ivory)]">
                              {followerCount}
                            </p>
                            <p className="mt-1 text-[var(--museum-stone-muted)]">
                              follower
                            </p>
                          </div>

                          <div className="rounded-2xl border border-[var(--museum-border-soft)] px-3 py-2">
                            <p className="text-base text-[var(--museum-ivory)]">
                              {galleryCount}
                            </p>
                            <p className="mt-1 text-[var(--museum-stone-muted)]">
                              gallerie
                            </p>
                          </div>

                          <div className="rounded-2xl border border-[var(--museum-border-soft)] px-3 py-2">
                            <p className="text-base text-[var(--museum-ivory)]">
                              {artworkCount}
                            </p>
                            <p className="mt-1 text-[var(--museum-stone-muted)]">
                              opere
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <Link
                            href={`/profili/${profile.profile_slug}`}
                            className="rounded-full border border-[var(--museum-border-soft)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--museum-ivory-soft)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)]"
                          >
                            Vedi profilo
                          </Link>

                          <FollowProfileButton
                            profileId={profile.id}
                            initialIsFollowing={followingSet.has(profile.id)}
                            initialFollowerCount={followerCount}
                            canFollow={Boolean(user)}
                            isOwnProfile={user?.id === profile.id}
                            compact
                            showCount={false}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
