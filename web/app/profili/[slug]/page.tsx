import { notFound } from "next/navigation";
import FollowProfileButton from "@/components/profiles/FollowProfileButton";
import ProfileMessageButton from "@/components/profiles/ProfileMessageButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import T from "@/components/i18n/T";
import ProfileStatusLikeButton from "@/components/social/ProfileStatusLikeButton";
import { DIRECT_MESSAGES_TERMS_VERSION } from "@/lib/messages/directMessages";
import LocalDateTime from "@/components/time/LocalDateTime";
import { getArtworkCardUrl } from "@/lib/artworks/imageUrls";

type PublicProfilePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type PublicProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "diamond" | "institution";
  bio: string | null;
  website_url: string | null;
  instagram_url: string | null;
  profile_slug: string | null;
  public_profile_enabled: boolean;
  created_at: string;
};

type PublicGallery = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  published_at: string | null;
};

type PublicArtwork = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
  technique: string | null;
  price: number | string | null;
  currency: string | null;
  image_url: string;
  thumbnail_url: string | null;
  card_url: string | null;
  optimized_url: string | null;
  is_for_sale: boolean;
};

type PublicStatus = {
  id: string;
  content: string;
  created_at: string;
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

function getPlanLabel(plan?: string | null) {
  if (plan === "institution") {
    return "Institution";
  }

  if (plan === "business") {
    return "Business";
  }

  if (plan === "pro") {
    return "Pro";
  }

  return "Free";
}

function formatPrice(price: number | string | null, currency: string | null) {
  if (price === null || price === undefined || price === "") {
    return null;
  }

  const numericPrice = Number(price);

  if (Number.isNaN(numericPrice)) {
    return `${price} ${currency || "EUR"}`;
  }

  try {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: currency || "EUR",
      maximumFractionDigits: 0,
    }).format(numericPrice);
  } catch {
    return `${numericPrice} ${currency || "EUR"}`;
  }
}

function formatStatusDate(value: string) {
  return <LocalDateTime value={value} format="datetime-long-no-year" />;
}

function normalizeExternalUrl(value: string | null) {
  if (!value) {
    return null;
  }

  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }

  return `https://${cleaned}`;
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { slug } = await params;
  const admin = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "id, email, full_name, display_name, avatar_url, role, plan, bio, website_url, instagram_url, profile_slug, public_profile_enabled, created_at"
    )
    .eq("profile_slug", slug)
    .eq("public_profile_enabled", true)
    .single<PublicProfile>();

  if (profileError || !profile) {
    notFound();
  }

  const displayName = getDisplayName(profile);
  const roleLabel = getRoleLabel(profile.role);
  const planLabel = getPlanLabel(profile.plan);
  const websiteUrl = normalizeExternalUrl(profile.website_url);
  const instagramUrl = normalizeExternalUrl(profile.instagram_url);

  const { data: galleries } = await admin
    .from("galleries")
    .select("id, title, slug, description, cover_image_url, published_at")
    .eq("owner_id", profile.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const { data: artworks } = await admin
    .from("artworks")
    .select(
      "id, title, artist_name, year, technique, price, currency, image_url, thumbnail_url, card_url, optimized_url, is_for_sale"
    )
    .eq("owner_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const { count: followerCountResult } = await admin
    .from("account_follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profile.id);

  const { count: followingCountResult } = await admin
    .from("account_follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profile.id);

  const followerCount = followerCountResult || 0;
  const followingCount = followingCountResult || 0;

  let isFollowing = false;
  let isMutualFollowing = false;
  let targetMessagingEnabled = false;
  let hasMessagingBlock = false;

  if (user && user.id !== profile.id) {
    const [
      followResult,
      reverseFollowResult,
      messagingResult,
      blockedByCurrentResult,
      blockedByTargetResult,
    ] = await Promise.all([
      admin
        .from("account_follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .maybeSingle(),
      admin
        .from("account_follows")
        .select("follower_id")
        .eq("follower_id", profile.id)
        .eq("following_id", user.id)
        .maybeSingle(),
      admin
        .from("direct_messaging_settings")
        .select("user_id, terms_version")
        .eq("user_id", profile.id)
        .maybeSingle(),
      admin
        .from("direct_user_blocks")
        .select("blocker_id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", profile.id)
        .maybeSingle(),
      admin
        .from("direct_user_blocks")
        .select("blocker_id")
        .eq("blocker_id", profile.id)
        .eq("blocked_id", user.id)
        .maybeSingle(),
    ]);

    isFollowing = Boolean(followResult.data);
    isMutualFollowing = Boolean(followResult.data && reverseFollowResult.data);
    targetMessagingEnabled = Boolean(
      messagingResult.data &&
        messagingResult.data.terms_version === DIRECT_MESSAGES_TERMS_VERSION
    );
    hasMessagingBlock = Boolean(
      blockedByCurrentResult.data || blockedByTargetResult.data
    );
  }

  const canMessageProfile = Boolean(
    user &&
      user.id !== profile.id &&
      isMutualFollowing &&
      targetMessagingEnabled &&
      !hasMessagingBlock
  );

  const { data: currentStatusData } = await admin
    .from("profile_statuses")
    .select("id, content, created_at")
    .eq("profile_id", profile.id)
    .eq("is_current", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<PublicStatus>();

  let currentStatusLikeCount = 0;
  let currentUserLikedStatus = false;

  if (currentStatusData) {
    const { count } = await admin
      .from("profile_status_likes")
      .select("status_id", { count: "exact", head: true })
      .eq("status_id", currentStatusData.id);

    currentStatusLikeCount = count || 0;

    if (user) {
      const { data: currentUserLike } = await admin
        .from("profile_status_likes")
        .select("status_id")
        .eq("status_id", currentStatusData.id)
        .eq("user_id", user.id)
        .maybeSingle();

      currentUserLikedStatus = Boolean(currentUserLike);
    }
  }

  const safeGalleries = (galleries || []) as PublicGallery[];
  const safeArtworks = (artworks || []) as PublicArtwork[];

  return (
    <main className="min-h-screen bg-[var(--museum-black)] px-6 py-10 text-[var(--museum-ivory)]">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <a
            href="/gallerie"
            className="rounded-full border border-[var(--museum-border-soft)] px-5 py-2 text-sm text-[var(--museum-ivory-soft)] transition hover:border-[var(--museum-bronze)]"
          >
            Elenco pubblico
          </a>

          <a
            href="/account"
            className="rounded-full border border-[var(--museum-border-soft)] px-5 py-2 text-sm text-[var(--museum-ivory-soft)] transition hover:border-[var(--museum-bronze)]"
          >
            Account
          </a>
        </div>

        <section className="rounded-[2rem] border border-[var(--museum-border-soft)] bg-[var(--museum-panel)] p-6 shadow-2xl shadow-black/20 md:p-8">
          <p className="museum-label">Profilo pubblico</p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
            <div>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-[var(--museum-border-soft)] bg-black/60">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-serif text-3xl text-[var(--museum-bronze)]">
                      {displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>

                <div>
                  <h1 className="font-serif text-5xl text-[var(--museum-ivory)] md:text-6xl">
                    {displayName}
                  </h1>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--museum-border-soft)] px-4 py-2 text-sm text-[var(--museum-ivory-soft)]">
                      {roleLabel}
                    </span>
                    <span className="rounded-full border border-[var(--museum-border-soft)] px-4 py-2 text-sm text-[var(--museum-ivory-soft)]">
                      Piano {planLabel}
                    </span>
                  </div>

                  {profile.bio && (
                    <p className="mt-6 max-w-3xl whitespace-pre-line text-base leading-8 text-[var(--museum-stone)]">
                      {profile.bio}
                    </p>
                  )}

                  {!profile.bio && (
                    <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--museum-stone-muted)]">
                      Questo profilo non ha ancora inserito una biografia
                      pubblica.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-[var(--museum-border-soft)] bg-black/35 p-5">
              <FollowProfileButton
                profileId={profile.id}
                initialIsFollowing={isFollowing}
                initialFollowerCount={followerCount}
                canFollow={Boolean(user)}
                isOwnProfile={user?.id === profile.id}
              />

              <ProfileMessageButton
                profileId={profile.id}
                canMessage={canMessageProfile}
              />

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-[var(--museum-border-soft)] p-4">
                  <p className="text-2xl text-[var(--museum-ivory)]">
                    {followerCount}
                  </p>
                  <p className="mt-1 text-[var(--museum-stone-muted)]">
                    follower
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--museum-border-soft)] p-4">
                  <p className="text-2xl text-[var(--museum-ivory)]">
                    {followingCount}
                  </p>
                  <p className="mt-1 text-[var(--museum-stone-muted)]">
                    seguiti
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-[var(--museum-border-soft)] px-4 py-3 text-sm text-[var(--museum-ivory-soft)] transition hover:border-[var(--museum-bronze)]"
                  >
                    Sito / portfolio
                  </a>
                )}

                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-[var(--museum-border-soft)] px-4 py-3 text-sm text-[var(--museum-ivory-soft)] transition hover:border-[var(--museum-bronze)]"
                  >
                    Instagram / social
                  </a>
                )}

                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    className="block rounded-2xl border border-[var(--museum-bronze)] px-4 py-3 text-sm font-medium text-[var(--museum-ivory)] transition hover:bg-[var(--museum-bronze)] hover:text-black"
                  >
                    Contatta
                  </a>
                )}
              </div>
            </aside>
          </div>
        </section>

        {currentStatusData && (
          <section
            id="stato"
            className="mt-8 rounded-[2rem] border border-[var(--museum-border-soft)] bg-[var(--museum-panel)] p-6 md:p-8"
          >
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div className="max-w-4xl">
                <p className="museum-label">
                  <T textKey="profiles.status.label" fallback="Stato" />
                </p>

                <blockquote className="mt-5 font-serif text-2xl leading-relaxed text-[var(--museum-ivory)] md:text-3xl">
                  “{currentStatusData.content}”
                </blockquote>

                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
                  {formatStatusDate(currentStatusData.created_at)}
                </p>
              </div>

              <ProfileStatusLikeButton
                statusId={currentStatusData.id}
                initialLiked={currentUserLikedStatus}
                initialCount={currentStatusLikeCount}
                canLike={Boolean(user)}
              />
            </div>
          </section>
        )}

        <section className="mt-8 rounded-[2rem] border border-[var(--museum-border-soft)] bg-[var(--museum-panel)] p-6 md:p-8">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="museum-label">Gallerie pubbliche</p>
              <h2 className="mt-3 font-serif text-3xl text-[var(--museum-ivory)]">
                Spazi espositivi
              </h2>
            </div>

            <p className="text-sm text-[var(--museum-stone-muted)]">
              {safeGalleries.length} gallerie pubblicate
            </p>
          </div>

          {safeGalleries.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-[var(--museum-border-soft)] bg-black/30 p-5 text-sm text-[var(--museum-stone-muted)]">
              Nessuna galleria pubblica disponibile.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {safeGalleries.map((gallery) => (
                <a
                  key={gallery.id}
                  href={`/gallerie/${gallery.slug}`}
                  className="group overflow-hidden rounded-3xl border border-[var(--museum-border-soft)] bg-black/35 transition hover:border-[var(--museum-bronze)]"
                >
                  <div className="aspect-[16/10] bg-black">
                    {gallery.cover_image_url ? (
                      <img
                        src={gallery.cover_image_url}
                        alt={gallery.title}
                        className="h-full w-full object-cover opacity-85 transition group-hover:scale-[1.02] group-hover:opacity-100"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-[var(--museum-stone-muted)]">
                        Nessuna immagine
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="font-serif text-2xl text-[var(--museum-ivory)]">
                      {gallery.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[var(--museum-stone-muted)]">
                      {gallery.description || "Spazio espositivo pubblico."}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[2rem] border border-[var(--museum-border-soft)] bg-[var(--museum-panel)] p-6 md:p-8">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="museum-label">Opere pubbliche</p>
              <h2 className="mt-3 font-serif text-3xl text-[var(--museum-ivory)]">
                Archivio visibile
              </h2>
            </div>

            <p className="text-sm text-[var(--museum-stone-muted)]">
              {safeArtworks.length} opere pubbliche
            </p>
          </div>

          {safeArtworks.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-[var(--museum-border-soft)] bg-black/30 p-5 text-sm text-[var(--museum-stone-muted)]">
              Nessuna opera pubblica disponibile.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {safeArtworks.map((artwork) => {
                const price = formatPrice(artwork.price, artwork.currency);
                const imageUrl = getArtworkCardUrl(artwork);

                return (
                  <article
                    key={artwork.id}
                    className="overflow-hidden rounded-3xl border border-[var(--museum-border-soft)] bg-black/35"
                  >
                    <div className="aspect-square bg-black">
                      <img
                        src={imageUrl}
                        alt={artwork.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="p-4">
                      <h3 className="font-serif text-xl text-[var(--museum-ivory)]">
                        {artwork.title}
                      </h3>

                      <p className="mt-2 text-sm text-[var(--museum-stone-muted)]">
                        {[artwork.artist_name, artwork.year]
                          .filter(Boolean)
                          .join(", ") || "Opera pubblica"}
                      </p>

                      {artwork.technique && (
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--museum-bronze)]">
                          {artwork.technique}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {artwork.is_for_sale && (
                          <span className="rounded-full border border-emerald-900 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-200">
                            In vendita
                          </span>
                        )}

                        {price && (
                          <span className="rounded-full border border-[var(--museum-border-soft)] px-3 py-1 text-xs text-[var(--museum-ivory-soft)]">
                            {price}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
