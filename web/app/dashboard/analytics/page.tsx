import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import T from "@/components/i18n/T";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ComponentProps } from "react";

type TTextKey = ComponentProps<typeof T>["textKey"];

type DashboardAnalyticsPageProps = {
  searchParams?: Promise<{
    range?: string;
  }>;
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "diamond" | "institution";
};

type GalleryStatus = "draft" | "published" | "archived";

type Gallery = {
  id: string;
  title: string;
  slug: string;
  status: GalleryStatus;
  created_at: string;
  published_at: string | null;
};

type Artwork = {
  id: string;
  title: string;
  artist_name: string | null;
  is_public: boolean;
  is_for_sale: boolean;
  created_at: string;
};

type GalleryVisitRow = {
  gallery_id: string;
  user_id: string | null;
  visited_at: string;
};

type FavoriteGalleryRow = {
  id: string;
  gallery_id: string;
  user_id: string;
  created_at: string;
};

type FavoriteArtworkRow = {
  id: string;
  artwork_id: string;
  user_id: string;
  created_at: string;
};

type GalleryInquiryRow = {
  id: string;
  gallery_id: string;
  artwork_id: string | null;
  status: string;
  created_at: string;
};

type GalleryChatRow = {
  id: string;
  gallery_id: string;
  session_id: string | null;
  user_id: string | null;
  created_at: string;
};

type GalleryEventRow = {
  id: string;
  gallery_id: string;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

type FollowRow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

type PresenceRow = {
  gallery_id: string;
  session_id: string | null;
  user_id: string | null;
  last_seen_at: string | null;
  created_at: string | null;
};

type MetricCardProps = {
  labelKey: string;
  labelFallback: string;
  value: string | number;
  descriptionKey: string;
  descriptionFallback: string;
};

type RangeOption = "7" | "30" | "90" | "all";

const rangeOptions: Array<{
  value: RangeOption;
  labelKey: string;
  labelFallback: string;
}> = [
  {
    value: "7",
    labelKey: "dashboard.analytics.range.sevenDays",
    labelFallback: "7 giorni",
  },
  {
    value: "30",
    labelKey: "dashboard.analytics.range.thirtyDays",
    labelFallback: "30 giorni",
  },
  {
    value: "90",
    labelKey: "dashboard.analytics.range.ninetyDays",
    labelFallback: "90 giorni",
  },
  {
    value: "all",
    labelKey: "dashboard.analytics.range.all",
    labelFallback: "Tutto",
  },
];

const advancedTrackingItems = [
  {
    textKey: "dashboard.analytics.advancedTracking.artworkClicks",
    fallback: "Click sulle opere dentro la galleria",
  },
  {
    textKey: "dashboard.analytics.advancedTracking.mostViewedArtworks",
    fallback: "Opere più viste, non solo più salvate",
  },
  {
    textKey: "dashboard.analytics.advancedTracking.averageGalleryTime",
    fallback: "Tempo medio reale dentro ogni galleria",
  },
  {
    textKey: "dashboard.analytics.advancedTracking.averageArtworkTime",
    fallback: "Tempo medio davanti a una singola opera",
  },
  {
    textKey: "dashboard.analytics.advancedTracking.maximumLivePresence",
    fallback: "Presenza live massima storica per evento/galleria",
  },
  {
    textKey: "dashboard.analytics.advancedTracking.fullConversion",
    fallback: "Conversione completa visita → opera → richiesta",
  },
];

function normalizeRange(value: string | undefined): RangeOption {
  if (value === "7" || value === "30" || value === "90" || value === "all") {
    return value;
  }

  return "30";
}

function getRangeStart(range: RangeOption) {
  if (range === "all") {
    return null;
  }

  const days = Number(range);
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function isInRange(value: string | null | undefined, rangeStart: Date | null) {
  if (!rangeStart) {
    return true;
  }

  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return false;
  }

  return time >= rangeStart.getTime();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("it-IT").format(value);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${value.toFixed(1).replace(".", ",")}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "N/D";
  }

  try {
    return new Date(value).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/D";
  }
}

function formatRangeLabel(range: RangeOption) {
  if (range === "all") {
    return "tutto il periodo";
  }

  return `ultimi ${range} giorni`;
}

function getStatusLabel(status: GalleryStatus | string) {
  if (status === "published") {
    return "Pubblicata";
  }

  if (status === "archived") {
    return "Archiviata";
  }

  if (status === "scheduled") {
    return "Programmato";
  }

  if (status === "live") {
    return "Live";
  }

  if (status === "completed") {
    return "Terminato";
  }

  if (status === "cancelled") {
    return "Annullato";
  }

  return "Bozza";
}

function getStatusBadgeClass(status: GalleryStatus | string) {
  if (status === "published" || status === "live") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "scheduled") {
    return "border-blue-900 bg-blue-950/40 text-blue-300";
  }

  if (status === "archived" || status === "completed") {
    return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
  }

  if (status === "cancelled") {
    return "border-red-900 bg-red-950/40 text-red-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-400";
}

function MetricCard({
  labelKey,
  labelFallback,
  value,
  descriptionKey,
  descriptionFallback,
}: MetricCardProps) {
  return (
    <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        <T textKey={labelKey} fallback={labelFallback} />
      </p>

      <p className="mt-3 text-3xl font-medium text-neutral-50">{value}</p>

      <p className="mt-2 text-sm leading-6 text-neutral-400">
        <T textKey={descriptionKey} fallback={descriptionFallback} />
      </p>
    </article>
  );
}

function countById<T>(rows: T[], getKey: (row: T) => string | null | undefined) {
  const map = new Map<string, number>();

  rows.forEach((row) => {
    const value = getKey(row);

    if (!value) {
      return;
    }

    map.set(value, (map.get(value) || 0) + 1);
  });

  return map;
}

function getMapValue(map: Map<string, number>, id: string) {
  return map.get(id) || 0;
}

export default async function DashboardAnalyticsPage({
  searchParams,
}: DashboardAnalyticsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedRange = normalizeRange(resolvedSearchParams.range);
  const rangeStart = getRangeStart(selectedRange);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name, full_name, role, plan")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
        <section className="mx-auto max-w-5xl">
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-red-400">
            <T textKey="dashboard.analytics.error.label" fallback="Errore" />
          </p>

          <h1 className="text-4xl font-semibold">
            <T
              textKey="dashboard.analytics.error.profileNotFound"
              fallback="Profilo non trovato"
            />
          </h1>

          <p className="mt-4 text-neutral-300">
            <T
              textKey="dashboard.analytics.error.profileUnavailable"
              fallback="Non riesco a leggere il profilo utente."
            />
          </p>
        </section>
      </main>
    );
  }

  const canReadAnalytics =
    profile.role === "gallerist" || profile.role === "admin";

  if (!canReadAnalytics) {
    return (
      <DashboardShell
        title="Analytics non disponibili"
        subtitle="Le statistiche sono disponibili per account gallerista, admin e piani creator."
        activeSection="analytics"
        navMode="community"
      >
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm leading-6 text-neutral-400">
            <T
              textKey="dashboard.analytics.unavailable.description"
              fallback="Il tuo account è attualmente in modalità community. Puoi continuare a usare profilo, preferiti, calendario e social dashboard."
            />
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/social"
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              <T
                textKey="dashboard.analytics.unavailable.goToSocial"
                fallback="Vai al Social"
              />
            </Link>

            <Link
              href="/pricing"
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              <T
                textKey="dashboard.analytics.unavailable.viewPlans"
                fallback="Vedi piani"
              />
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const admin = createAdminClient();

  const { data: galleriesData, error: galleriesError } = await admin
    .from("galleries")
    .select("id, title, slug, status, created_at, published_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const { data: artworksData, error: artworksError } = await admin
    .from("artworks")
    .select("id, title, artist_name, is_public, is_for_sale, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const galleries = (galleriesData || []) as Gallery[];
  const artworks = (artworksData || []) as Artwork[];

  const galleryIds = galleries.map((gallery) => gallery.id);
  const artworkIds = artworks.map((artwork) => artwork.id);

  let visitRows: GalleryVisitRow[] = [];
  let favoriteGalleryRows: FavoriteGalleryRow[] = [];
  let favoriteArtworkRows: FavoriteArtworkRow[] = [];
  let inquiryRows: GalleryInquiryRow[] = [];
  let chatRows: GalleryChatRow[] = [];
  let eventRows: GalleryEventRow[] = [];
  let followerRows: FollowRow[] = [];
  let livePresenceRows: PresenceRow[] = [];

  const optionalWarnings: string[] = [];

  if (galleryIds.length > 0) {
    const { data: visitsData, error: visitsError } = await admin
      .from("recent_gallery_visits")
      .select("gallery_id, user_id, visited_at")
      .in("gallery_id", galleryIds)
      .order("visited_at", { ascending: false })
      .range(0, 9999);

    if (visitsError) {
      optionalWarnings.push("Visite recenti non disponibili.");
    }

    visitRows = ((visitsData || []) as GalleryVisitRow[]).filter((row) =>
      isInRange(row.visited_at, rangeStart)
    );

    const { data: favoriteGalleriesData, error: favoriteGalleriesError } =
      await admin
        .from("favorite_galleries")
        .select("id, gallery_id, user_id, created_at")
        .in("gallery_id", galleryIds)
        .order("created_at", { ascending: false })
        .range(0, 9999);

    if (favoriteGalleriesError) {
      optionalWarnings.push("Salvataggi gallerie non disponibili.");
    }

    favoriteGalleryRows = (
      (favoriteGalleriesData || []) as FavoriteGalleryRow[]
    ).filter((row) => isInRange(row.created_at, rangeStart));

    const { data: inquiriesData, error: inquiriesError } = await admin
      .from("gallery_inquiries")
      .select("id, gallery_id, artwork_id, status, created_at")
      .in("gallery_id", galleryIds)
      .order("created_at", { ascending: false })
      .range(0, 9999);

    if (inquiriesError) {
      optionalWarnings.push("Richieste ricevute non disponibili.");
    }

    inquiryRows = ((inquiriesData || []) as GalleryInquiryRow[]).filter((row) =>
      isInRange(row.created_at, rangeStart)
    );

    const { data: chatData, error: chatError } = await admin
      .from("gallery_chat_messages")
      .select("id, gallery_id, session_id, user_id, created_at")
      .in("gallery_id", galleryIds)
      .order("created_at", { ascending: false })
      .range(0, 9999);

    if (chatError) {
      optionalWarnings.push("Messaggi chat non disponibili.");
    }

    chatRows = ((chatData || []) as GalleryChatRow[]).filter((row) =>
      isInRange(row.created_at, rangeStart)
    );

    const liveThreshold = new Date(Date.now() - 90 * 1000).toISOString();
    const { data: presenceData, error: presenceError } = await admin
      .from("gallery_presence")
      .select("gallery_id, session_id, user_id, last_seen_at, created_at")
      .in("gallery_id", galleryIds)
      .gte("last_seen_at", liveThreshold)
      .range(0, 9999);

    if (!presenceError) {
      livePresenceRows = (presenceData || []) as PresenceRow[];
    }
  }

  if (artworkIds.length > 0) {
    const { data: favoriteArtworksData, error: favoriteArtworksError } =
      await admin
        .from("favorite_artworks")
        .select("id, artwork_id, user_id, created_at")
        .in("artwork_id", artworkIds)
        .order("created_at", { ascending: false })
        .range(0, 9999);

    if (favoriteArtworksError) {
      optionalWarnings.push("Salvataggi opere non disponibili.");
    }

    favoriteArtworkRows = (
      (favoriteArtworksData || []) as FavoriteArtworkRow[]
    ).filter((row) => isInRange(row.created_at, rangeStart));
  }

  const { data: eventsData, error: eventsError } = await admin
    .from("gallery_events")
    .select("id, gallery_id, title, status, starts_at, ends_at, created_at")
    .eq("owner_id", user.id)
    .order("starts_at", { ascending: false })
    .range(0, 9999);

  if (eventsError) {
    optionalWarnings.push("Eventi non disponibili.");
  }

  eventRows = ((eventsData || []) as GalleryEventRow[]).filter((row) =>
    isInRange(row.created_at, rangeStart)
  );

  const { data: followersData, error: followersError } = await admin
    .from("account_follows")
    .select("follower_id, following_id, created_at")
    .eq("following_id", user.id)
    .order("created_at", { ascending: false })
    .range(0, 9999);

  if (followersError) {
    optionalWarnings.push("Follower non disponibili.");
  }

  followerRows = ((followersData || []) as FollowRow[]).filter((row) =>
    isInRange(row.created_at, rangeStart)
  );

  const visitCountByGalleryId = countById(
    visitRows,
    (row) => row.gallery_id
  );
  const favoriteCountByGalleryId = countById(
    favoriteGalleryRows,
    (row) => row.gallery_id
  );
  const inquiryCountByGalleryId = countById(
    inquiryRows,
    (row) => row.gallery_id
  );
  const chatCountByGalleryId = countById(
    chatRows,
    (row) => row.gallery_id
  );
  const liveCountByGalleryId = countById(
    livePresenceRows,
    (row) => row.gallery_id
  );
  const favoriteCountByArtworkId = countById(
    favoriteArtworkRows,
    (row) => row.artwork_id
  );
  const inquiryCountByArtworkId = countById(
    inquiryRows.filter((row) => Boolean(row.artwork_id)),
    (row) => row.artwork_id
  );

  const uniqueVisitorKeys = new Set<string>();

  visitRows.forEach((row) => {
    if (row.user_id) {
      uniqueVisitorKeys.add(`user:${row.user_id}`);
    }
  });

  chatRows.forEach((row) => {
    if (row.user_id) {
      uniqueVisitorKeys.add(`user:${row.user_id}`);
      return;
    }

    if (row.session_id) {
      uniqueVisitorKeys.add(`session:${row.session_id}`);
    }
  });

  livePresenceRows.forEach((row) => {
    if (row.user_id) {
      uniqueVisitorKeys.add(`user:${row.user_id}`);
      return;
    }

    if (row.session_id) {
      uniqueVisitorKeys.add(`session:${row.session_id}`);
    }
  });

  const topGalleries = galleries
    .map((gallery) => {
      const visits = getMapValue(visitCountByGalleryId, gallery.id);
      const saves = getMapValue(favoriteCountByGalleryId, gallery.id);
      const inquiries = getMapValue(inquiryCountByGalleryId, gallery.id);
      const chatMessages = getMapValue(chatCountByGalleryId, gallery.id);
      const liveNow = getMapValue(liveCountByGalleryId, gallery.id);
      const score = visits * 3 + saves * 2 + inquiries * 4 + chatMessages;

      return {
        ...gallery,
        visits,
        saves,
        inquiries,
        chatMessages,
        liveNow,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || b.visits - a.visits)
    .slice(0, 8);

  const topArtworks = artworks
    .map((artwork) => {
      const saves = getMapValue(favoriteCountByArtworkId, artwork.id);
      const inquiries = getMapValue(inquiryCountByArtworkId, artwork.id);
      const score = saves * 2 + inquiries * 4;

      return {
        ...artwork,
        saves,
        inquiries,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || b.saves - a.saves)
    .slice(0, 8);

  const recentInquiries = inquiryRows.slice(0, 6);
  const upcomingOrRecentEvents = eventRows.slice(0, 6);

  const publishedGalleries = galleries.filter(
    (gallery) => gallery.status === "published"
  ).length;

  const publicArtworks = artworks.filter((artwork) => artwork.is_public).length;
  const liveNowTotal = livePresenceRows.length;
  const artworkInquiries = inquiryRows.filter((row) => row.artwork_id).length;
  const visitToInquiryRate = visitRows.length
    ? (inquiryRows.length / visitRows.length) * 100
    : 0;
  const saveToInquiryRate = favoriteArtworkRows.length
    ? (artworkInquiries / favoriteArtworkRows.length) * 100
    : 0;

  return (
    <DashboardShell
      title="Analytics"
      subtitle="Una prima lettura delle performance dei tuoi spazi: visite registrate, salvataggi, richieste, chat, eventi e community."
      activeSection="analytics"
      actions={
        <div className="flex flex-wrap gap-2">
          {rangeOptions.map((option) => {
            const isActive = selectedRange === option.value;

            return (
              <Link
                key={option.value}
                href={
                  option.value === "30"
                    ? "/dashboard/analytics"
                    : `/dashboard/analytics?range=${option.value}`
                }
                className={
                  isActive
                    ? "rounded-full bg-white px-4 py-2 text-xs font-medium text-neutral-950"
                    : "rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400"
                }
              >
                <T
  textKey={option.labelKey as TTextKey}
  fallback={option.labelFallback}
/>
              </Link>
            );
          })}
        </div>
      }
    >
      {(galleriesError || artworksError) && (
        <div className="mb-6 rounded-3xl border border-red-900 bg-red-950/30 p-6">
          <p className="text-sm font-medium text-red-200">
            <T
              textKey="dashboard.analytics.errors.mainDataUnavailable"
              fallback="Alcuni dati principali non sono disponibili."
            />
          </p>

          <p className="mt-2 text-sm leading-6 text-red-100/70">
            {galleriesError?.message || artworksError?.message}
          </p>
        </div>
      )}

      {galleries.length === 0 && (
        <div className="mb-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            <T
              textKey="dashboard.analytics.emptyGalleries.label"
              fallback="Nessuna galleria"
            />
          </p>

          <h2 className="mt-3 text-2xl font-medium text-neutral-50">
            <T
              textKey="dashboard.analytics.emptyGalleries.title"
              fallback="Crea una galleria per iniziare a raccogliere dati"
            />
          </h2>

          <p className="mt-2 text-sm leading-6 text-neutral-400">
            <T
              textKey="dashboard.analytics.emptyGalleries.description"
              fallback="Gli analytics diventano utili quando una galleria è pubblicata, visitata, salvata o collegata a richieste ed eventi."
            />
          </p>

          <Link
            href="/dashboard/gallerie"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            <T
              textKey="dashboard.analytics.emptyGalleries.action"
              fallback="Vai alle gallerie"
            />
          </Link>
        </div>
      )}

      <div className="mb-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              <T
                textKey="dashboard.analytics.period.label"
                fallback="Periodo"
              />
            </p>

            <h2 className="mt-3 text-2xl font-medium text-neutral-50">
              <T
                textKey="dashboard.analytics.period.dataOn"
                fallback="Dati su"
              />{" "}
              {formatRangeLabel(selectedRange)}
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
              <T
                textKey="dashboard.analytics.period.description"
                fallback="Questa è una prima dashboard analytics basata sui dati già presenti in piattaforma. Click opere, tempo medio visita e presenze massime storiche richiederanno il tracking dedicato delle sessioni."
              />
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm md:min-w-72">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-neutral-500">
                <T
                  textKey="dashboard.analytics.period.galleries"
                  fallback="Gallerie"
                />
              </p>

              <p className="mt-1 text-xl text-neutral-50">
                {formatNumber(galleries.length)}
              </p>

              <p className="mt-1 text-xs text-neutral-600">
                {formatNumber(publishedGalleries)}{" "}
                <T
                  textKey="dashboard.analytics.period.published"
                  fallback="pubblicate"
                />
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-neutral-500">
                <T
                  textKey="dashboard.analytics.period.artworks"
                  fallback="Opere"
                />
              </p>

              <p className="mt-1 text-xl text-neutral-50">
                {formatNumber(artworks.length)}
              </p>

              <p className="mt-1 text-xs text-neutral-600">
                {formatNumber(publicArtworks)}{" "}
                <T
                  textKey="dashboard.analytics.period.public"
                  fallback="pubbliche"
                />
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
  labelKey="dashboard.analytics.metrics.registeredVisits.label"
  labelFallback="Visite registrate"
  value={formatNumber(visitRows.length)}
  descriptionKey="dashboard.analytics.metrics.registeredVisits.description"
  descriptionFallback="Aperture registrate nelle visite recenti delle tue gallerie."
/>

<MetricCard
  labelKey="dashboard.analytics.metrics.registeredVisits.label"
  labelFallback="Visitatori unici stimati"
  value={formatNumber(uniqueVisitorKeys.size)}
  descriptionKey="dashboard.analytics.metrics.registeredVisits.description"
  descriptionFallback="Stima da utenti, sessioni chat e presenze live disponibili."
/>
        
<MetricCard
  labelKey="dashboard.analytics.metrics.registeredVisits.label"
  labelFallback="Gallerie salvate"
   value={formatNumber(favoriteGalleryRows.length)}
  descriptionKey="dashboard.analytics.metrics.registeredVisits.description"
  descriptionFallback="Quante volte gli utenti hanno salvato le tue gallerie."
/>

<MetricCard
  labelKey="dashboard.analytics.metrics.registeredVisits.label"
  labelFallback="Opere salvate"
  value={formatNumber(favoriteArtworkRows.length)}
  descriptionKey="dashboard.analytics.metrics.registeredVisits.description"
  descriptionFallback="Salvataggi delle opere appartenenti al tuo archivio."
/>
       
<MetricCard
  labelKey="dashboard.analytics.metrics.registeredVisits.label"
  labelFallback="Richieste ricevute"
  value={formatNumber(inquiryRows.length)}
  descriptionKey="dashboard.analytics.metrics.registeredVisits.description"
  descriptionFallback="Contatti arrivati dalle tue gallerie e dalle tue opere."
/>
      
<MetricCard
  labelKey="dashboard.analytics.metrics.registeredVisits.label"
  labelFallback="Messaggi chat"
  value={formatNumber(chatRows.length)}
  descriptionKey="dashboard.analytics.metrics.registeredVisits.description"
  descriptionFallback="Messaggi inviati nelle chat collegate alle tue gallerie."
/>    

<MetricCard
  labelKey="dashboard.analytics.metrics.registeredVisits.label"
  labelFallback="Eventi creati"
  value={formatNumber(eventRows.length)}
  descriptionKey="dashboard.analytics.metrics.registeredVisits.description"
  descriptionFallback="Eventi collegati alle tue gallerie nel periodo selezionato."
/>
        
       <MetricCard
  labelKey="dashboard.analytics.metrics.registeredVisits.label"
  labelFallback="Visite registrate"
  value={formatNumber(followerRows.length)}
  descriptionKey="dashboard.analytics.metrics.registeredVisits.description"
  descriptionFallback="Aperture registrate nelle visite recenti delle tue gallerie."
/>

       
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                <T
                  textKey="dashboard.analytics.galleries.label"
                  fallback="Gallerie"
                />
              </p>

              <h2 className="mt-3 text-2xl font-medium text-neutral-50">
                <T
                  textKey="dashboard.analytics.galleries.title"
                  fallback="Spazi più attivi"
                />
              </h2>
            </div>

            <Link
              href="/dashboard/gallerie"
              className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400"
            >
              <T
                textKey="dashboard.analytics.galleries.manage"
                fallback="Gestisci gallerie"
              />
            </Link>
          </div>

          {topGalleries.length === 0 && (
            <p className="mt-5 text-sm leading-6 text-neutral-400">
              <T
                textKey="dashboard.analytics.galleries.empty"
                fallback="Nessuna galleria da analizzare nel periodo selezionato."
              />
            </p>
          )}

          {topGalleries.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                  <tr>
                    <th className="pb-3 pr-4 font-normal">
                      <T
                        textKey="dashboard.analytics.galleries.table.gallery"
                        fallback="Galleria"
                      />
                    </th>
                    <th className="pb-3 pr-4 font-normal">
                      <T
                        textKey="dashboard.analytics.galleries.table.visits"
                        fallback="Visite"
                      />
                    </th>
                    <th className="pb-3 pr-4 font-normal">
                      <T
                        textKey="dashboard.analytics.galleries.table.saves"
                        fallback="Salvataggi"
                      />
                    </th>
                    <th className="pb-3 pr-4 font-normal">
                      <T
                        textKey="dashboard.analytics.galleries.table.inquiries"
                        fallback="Richieste"
                      />
                    </th>
                    <th className="pb-3 pr-4 font-normal">
                      <T
                        textKey="dashboard.analytics.galleries.table.chat"
                        fallback="Chat"
                      />
                    </th>
                    <th className="pb-3 font-normal">
                      <T
                        textKey="dashboard.analytics.galleries.table.liveNow"
                        fallback="Live ora"
                      />
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-800">
                  {topGalleries.map((gallery) => (
                    <tr key={gallery.id}>
                      <td className="py-4 pr-4 align-top">
                        <Link
                          href={`/dashboard/gallerie/${gallery.id}`}
                          className="font-medium text-neutral-100 transition hover:text-white"
                        >
                          {gallery.title}
                        </Link>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${getStatusBadgeClass(
                              gallery.status
                            )}`}
                          >
                            {getStatusLabel(gallery.status)}
                          </span>

                          {gallery.status === "published" && (
                            <Link
                              href={`/gallerie/${gallery.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-neutral-500 transition hover:text-neutral-200"
                            >
                              <T
                                textKey="dashboard.analytics.galleries.openPublic"
                                fallback="Apri pubblica"
                              />
                            </Link>
                          )}
                        </div>
                      </td>

                      <td className="py-4 pr-4 text-neutral-300">
                        {formatNumber(gallery.visits)}
                      </td>

                      <td className="py-4 pr-4 text-neutral-300">
                        {formatNumber(gallery.saves)}
                      </td>

                      <td className="py-4 pr-4 text-neutral-300">
                        {formatNumber(gallery.inquiries)}
                      </td>

                      <td className="py-4 pr-4 text-neutral-300">
                        {formatNumber(gallery.chatMessages)}
                      </td>

                      <td className="py-4 text-neutral-300">
                        {formatNumber(gallery.liveNow)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            <T
              textKey="dashboard.analytics.conversion.label"
              fallback="Conversione"
            />
          </p>

          <h2 className="mt-3 text-2xl font-medium text-neutral-50">
            <T
              textKey="dashboard.analytics.conversion.title"
              fallback="Segnali commerciali"
            />
          </h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-neutral-400">
                  <T
                    textKey="dashboard.analytics.conversion.visitsToInquiries"
                    fallback="Visite → richieste"
                  />
                </p>

                <p className="text-lg font-medium text-neutral-50">
                  {formatPercent(visitToInquiryRate)}
                </p>
              </div>

              <p className="mt-2 text-xs leading-5 text-neutral-600">
                <T
                  textKey="dashboard.analytics.conversion.visitsDescription"
                  fallback="Rapporto tra visite registrate e richieste ricevute."
                />
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-neutral-400">
                  <T
                    textKey="dashboard.analytics.conversion.savesToInquiries"
                    fallback="Opere salvate → richieste"
                  />
                </p>

                <p className="text-lg font-medium text-neutral-50">
                  {formatPercent(saveToInquiryRate)}
                </p>
              </div>

              <p className="mt-2 text-xs leading-5 text-neutral-600">
                <T
                  textKey="dashboard.analytics.conversion.savesDescription"
                  fallback="Rapporto tra salvataggi opera e richieste collegate a opere."
                />
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-neutral-400">
                  <T
                    textKey="dashboard.analytics.conversion.livePresence"
                    fallback="Presenze live attive"
                  />
                </p>

                <p className="text-lg font-medium text-neutral-50">
                  {formatNumber(liveNowTotal)}
                </p>
              </div>

              <p className="mt-2 text-xs leading-5 text-neutral-600">
                <T
                  textKey="dashboard.analytics.conversion.liveDescription"
                  fallback="Utenti o sessioni rilevate come attive negli ultimi 90 secondi."
                />
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                <T
                  textKey="dashboard.analytics.artworks.label"
                  fallback="Opere"
                />
              </p>

              <h2 className="mt-3 text-2xl font-medium text-neutral-50">
                <T
                  textKey="dashboard.analytics.artworks.title"
                  fallback="Opere più forti"
                />
              </h2>
            </div>

            <Link
              href="/dashboard/opere"
              className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400"
            >
              <T
                textKey="dashboard.analytics.artworks.archive"
                fallback="Archivio opere"
              />
            </Link>
          </div>

          {topArtworks.length === 0 && (
            <p className="mt-5 text-sm leading-6 text-neutral-400">
              <T
                textKey="dashboard.analytics.artworks.empty"
                fallback="Nessuna opera salvata o richiesta nel periodo selezionato."
              />
            </p>
          )}

          {topArtworks.length > 0 && (
  <div className="mt-6 space-y-3">
    {topArtworks.map((artwork) => (
      <article
        key={artwork.id}
        className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
      >
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <p className="font-medium text-neutral-100">
              {artwork.title}
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              {artwork.artist_name ? (
                artwork.artist_name
              ) : (
                <T
                  textKey="dashboard.analytics.artworks.artistMissing"
                  fallback="Artista non indicato"
                />
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
            <span className="rounded-full border border-neutral-800 px-3 py-1">
              {formatNumber(artwork.saves)}{" "}
              <T
                textKey="dashboard.analytics.artworks.saves"
                fallback="salvataggi"
              />
            </span>

            <span className="rounded-full border border-neutral-800 px-3 py-1">
              {formatNumber(artwork.inquiries)}{" "}
              <T
                textKey="dashboard.analytics.artworks.inquiries"
                fallback="richieste"
              />
            </span>
          </div>
        </div>
      </article>
    ))}
  </div>
)}
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            <T
              textKey="dashboard.analytics.inquiries.label"
              fallback="Richieste"
            />
          </p>

          <h2 className="mt-3 text-2xl font-medium text-neutral-50">
            <T
              textKey="dashboard.analytics.inquiries.title"
              fallback="Ultimi contatti ricevuti"
            />
          </h2>

          {recentInquiries.length === 0 && (
            <p className="mt-5 text-sm leading-6 text-neutral-400">
              <T
                textKey="dashboard.analytics.inquiries.empty"
                fallback="Nessuna richiesta ricevuta nel periodo selezionato."
              />
            </p>
          )}

          {recentInquiries.length > 0 && (
            <div className="mt-6 space-y-3">
              {recentInquiries.map((inquiry) => {
                const gallery = galleries.find(
                  (item) => item.id === inquiry.gallery_id
                );
                const artwork = inquiry.artwork_id
                  ? artworks.find((item) => item.id === inquiry.artwork_id)
                  : null;

                return (
                  <article
                    key={inquiry.id}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="font-medium text-neutral-100">
                          {gallery?.title ? (
                            gallery.title
                          ) : (
                            <T
                              textKey="dashboard.analytics.common.galleryNotFound"
                              fallback="Galleria non trovata"
                            />
                          )}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {artwork ? (
                            <>
                              <T
                                textKey="dashboard.analytics.inquiries.artwork"
                                fallback="Opera:"
                              />{" "}
                              {artwork.title}
                            </>
                          ) : (
                            <T
                              textKey="dashboard.analytics.inquiries.general"
                              fallback="Richiesta generale sulla galleria"
                            />
                          )}
                        </p>
                      </div>

                      <span className="text-xs text-neutral-500">
                        {formatDateTime(inquiry.created_at)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <Link
            href="/dashboard/richieste"
            className="mt-6 inline-flex rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="dashboard.analytics.inquiries.open"
              fallback="Apri richieste"
            />
          </Link>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            <T
              textKey="dashboard.analytics.events.label"
              fallback="Eventi"
            />
          </p>

          <h2 className="mt-3 text-2xl font-medium text-neutral-50">
            <T
              textKey="dashboard.analytics.events.title"
              fallback="Eventi recenti e programmati"
            />
          </h2>

          {upcomingOrRecentEvents.length === 0 && (
            <p className="mt-5 text-sm leading-6 text-neutral-400">
              <T
                textKey="dashboard.analytics.events.empty"
                fallback="Nessun evento creato nel periodo selezionato."
              />
            </p>
          )}

          {upcomingOrRecentEvents.length > 0 && (
            <div className="mt-6 space-y-3">
              {upcomingOrRecentEvents.map((event) => {
                const gallery = galleries.find(
                  (item) => item.id === event.gallery_id
                );

                return (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <p className="font-medium text-neutral-100">
                          {event.title}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {gallery?.title ? (
                            gallery.title
                          ) : (
                            <T
                              textKey="dashboard.analytics.common.galleryNotFound"
                              fallback="Galleria non trovata"
                            />
                          )}{" "}
                          · {formatDateTime(event.starts_at)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.14em] ${getStatusBadgeClass(
                          event.status
                        )}`}
                      >
                        {getStatusLabel(event.status)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <Link
            href="/dashboard/eventi"
            className="mt-6 inline-flex rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="dashboard.analytics.events.manage"
              fallback="Gestisci eventi"
            />
          </Link>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
            <T
              textKey="dashboard.analytics.advancedTracking.label"
              fallback="Tracking avanzato"
            />
          </p>

          <h2 className="mt-3 text-2xl font-medium text-neutral-50">
            <T
              textKey="dashboard.analytics.advancedTracking.title"
              fallback="Prossimo livello analytics"
            />
          </h2>

          <div className="mt-6 space-y-3">
            {advancedTrackingItems.map((item) => (
              <div
                key={item.textKey}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300"
              >
                <T textKey={item.textKey as TTextKey} fallback={item.fallback} />
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs leading-5 text-neutral-600">
            <T
              textKey="dashboard.analytics.advancedTracking.description"
              fallback="Queste metriche richiedono una tabella analytics dedicata e un piccolo tracking dal viewer WebGL/sito pubblico. Non sono state attivate in questa prima versione per non appesantire il viewer."
            />
          </p>
        </section>
      </div>

      {optionalWarnings.length > 0 && (
        <div className="mt-6 rounded-3xl border border-yellow-900 bg-yellow-950/20 p-5">
          <p className="text-sm font-medium text-yellow-200">
            <T
              textKey="dashboard.analytics.warnings.title"
              fallback="Alcune sorgenti analytics non hanno risposto."
            />
          </p>

          <p className="mt-2 text-sm leading-6 text-yellow-100/70">
            {optionalWarnings.join(" ")}
          </p>
        </div>
      )}
    </DashboardShell>
  );
}