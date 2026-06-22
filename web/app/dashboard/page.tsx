import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import PlanUsageCard from "@/components/dashboard/PlanUsageCard";
import { normalizePlanName } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "institution";
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

type FavoriteGalleryRow = {
  gallery_id: string;
  created_at: string;
};

type FavoriteGalleryRecord = {
  id: string;
  title: string;
  slug: string;
  status: GalleryStatus;
};

type FavoritePublicGallery = FavoriteGalleryRecord & {
  saved_at: string;
};

type RecentGalleryVisitRow = {
  gallery_id: string;
  visited_at: string;
};

type RecentPublicGallery = FavoriteGalleryRecord & {
  visited_at: string;
};

type Artwork = {
  id: string;
  title: string;
  is_public: boolean;
  is_for_sale: boolean;
  file_size_bytes: number | null;
  created_at: string;
};

type FavoriteArtworkRow = {
  artwork_id: string;
  created_at: string;
};

type FavoriteArtworkRecord = {
  id: string;
  title: string;
  artist_name: string | null;
  is_public: boolean;
};

type FavoriteArtworkGalleryRelation = {
  id: string;
  title: string;
  slug: string;
  status: GalleryStatus;
};

type FavoriteArtworkPlacement = {
  id: string;
  artwork_id: string;
  galleries: FavoriteArtworkGalleryRelation | FavoriteArtworkGalleryRelation[] | null;
};

type FavoritePublicArtwork = FavoriteArtworkRecord & {
  saved_at: string;
  gallery_title: string | null;
  gallery_slug: string | null;
};

type InquiryStatus = "new" | "read" | "closed";

type GalleryRelation = {
  id: string;
  title: string;
  slug: string;
};

type Inquiry = {
  id: string;
  name: string;
  email: string;
  status: InquiryStatus;
  created_at: string;
  galleries: GalleryRelation | GalleryRelation[] | null;
};

type SentInquiry = {
  id: string;
  gallery_id: string;
  artwork_id: string | null;
  status: string;
  created_at: string;
  galleries: GalleryRelation | GalleryRelation[] | null;
};

function normalizeGalleryRelation(
  value: GalleryRelation | GalleryRelation[] | null
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function getStatusBadgeClass(status: GalleryStatus) {
  if (status === "published") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "archived") {
    return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-400";
}

function getStatusLabel(status: GalleryStatus) {
  if (status === "published") {
    return "Pubblicata";
  }

  if (status === "archived") {
    return "Archiviata";
  }

  return "Bozza";
}

function getInquiryBadgeClass(status: InquiryStatus) {
  if (status === "new") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "closed") {
    return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-300";
}

function getInquiryLabel(status: InquiryStatus) {
  if (status === "new") {
    return "Nuova";
  }

  if (status === "closed") {
    return "Chiusa";
  }

  return "Letta";
}

function getSentInquiryBadgeClass(status: string) {
  if (status === "new") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "read") {
    return "border-blue-900 bg-blue-950/40 text-blue-300";
  }

  if (status === "replied") {
    return "border-purple-900 bg-purple-950/40 text-purple-300";
  }

  if (status === "archived" || status === "closed") {
    return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-300";
}

function getSentInquiryLabel(status: string) {
  if (status === "new") {
    return "Nuova";
  }

  if (status === "read") {
    return "Letta";
  }

  if (status === "replied") {
    return "Risposta";
  }

  if (status === "archived" || status === "closed") {
    return "Archiviata";
  }

  return status;
}

function getCurrentMonthStart() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "N/D";
  }

  try {
    return new Date(value).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "N/D";
  }
}

function formatStorage(bytes: number) {
  if (bytes <= 0) {
    return "0 MB";
  }

  const mb = bytes / 1024 / 1024;

  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }

  return `${(mb / 1024).toFixed(2)} GB`;
}

export default async function DashboardPage() {
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
            Errore
          </p>

          <h1 className="text-4xl font-semibold">Profilo non trovato</h1>

          <p className="mt-4 text-neutral-300">
            Non riesco a leggere il profilo utente.
          </p>

          <div className="mt-8 rounded-3xl border border-red-800 bg-red-950/30 p-6">
            {profileError?.message || "Profilo assente."}
          </div>
        </section>
      </main>
    );
  }

  const canManage = profile.role === "gallerist" || profile.role === "admin";

    const admin = createAdminClient();

  const { data: favoriteGalleryRowsData } = await admin
    .from("favorite_galleries")
    .select("gallery_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const favoriteGalleryRows =
    (favoriteGalleryRowsData || []) as FavoriteGalleryRow[];

  const favoriteGalleryIds = favoriteGalleryRows.map(
    (favorite) => favorite.gallery_id
  );

  let favoriteGalleries: FavoritePublicGallery[] = [];

  if (favoriteGalleryIds.length > 0) {
    const { data: favoriteGalleriesData } = await admin
      .from("galleries")
      .select("id, title, slug, status")
      .in("id", favoriteGalleryIds)
      .eq("status", "published");

    const favoriteGalleryById = new Map(
      ((favoriteGalleriesData || []) as FavoriteGalleryRecord[]).map(
        (gallery) => [gallery.id, gallery]
      )
    );

    favoriteGalleries = favoriteGalleryRows
      .map((favorite) => {
        const gallery = favoriteGalleryById.get(favorite.gallery_id);

        if (!gallery) {
          return null;
        }

        return {
          ...gallery,
          saved_at: favorite.created_at,
        };
      })
      .filter(Boolean) as FavoritePublicGallery[];
  }

    const { data: favoriteArtworkRowsData } = await admin
    .from("favorite_artworks")
    .select("artwork_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const favoriteArtworkRows =
    (favoriteArtworkRowsData || []) as FavoriteArtworkRow[];

  const favoriteArtworkIds = favoriteArtworkRows.map(
    (favorite) => favorite.artwork_id
  );

  let favoriteArtworks: FavoritePublicArtwork[] = [];

  if (favoriteArtworkIds.length > 0) {
    const { data: favoriteArtworksData } = await admin
      .from("artworks")
      .select("id, title, artist_name, is_public")
      .in("id", favoriteArtworkIds)
      .eq("is_public", true);

    const { data: favoriteArtworkPlacementsData } = await admin
      .from("gallery_artworks")
      .select(
        `
        id,
        artwork_id,
        galleries (
          id,
          title,
          slug,
          status
        )
      `
      )
      .in("artwork_id", favoriteArtworkIds);

    const favoriteArtworkById = new Map(
      ((favoriteArtworksData || []) as FavoriteArtworkRecord[]).map(
        (artwork) => [artwork.id, artwork]
      )
    );

    const favoriteArtworkPlacementByArtworkId = new Map<
      string,
      FavoriteArtworkPlacement
    >();

    ((favoriteArtworkPlacementsData || []) as unknown as FavoriteArtworkPlacement[])
      .forEach((placement) => {
        const galleries = Array.isArray(placement.galleries)
          ? placement.galleries
          : placement.galleries
            ? [placement.galleries]
            : [];

        const publishedGallery = galleries.find(
          (gallery) => gallery.status === "published"
        );

        if (publishedGallery && !favoriteArtworkPlacementByArtworkId.has(placement.artwork_id)) {
          favoriteArtworkPlacementByArtworkId.set(placement.artwork_id, {
            ...placement,
            galleries: publishedGallery,
          });
        }
      });

    favoriteArtworks = favoriteArtworkRows
      .map((favorite) => {
        const artwork = favoriteArtworkById.get(favorite.artwork_id);

        if (!artwork) {
          return null;
        }

        const placement = favoriteArtworkPlacementByArtworkId.get(artwork.id);
        const gallery = Array.isArray(placement?.galleries)
          ? placement?.galleries[0] || null
          : placement?.galleries || null;

        return {
          ...artwork,
          saved_at: favorite.created_at,
          gallery_title: gallery?.title || null,
          gallery_slug: gallery?.slug || null,
        };
      })
      .filter(Boolean) as FavoritePublicArtwork[];
  }

    const { data: recentGalleryVisitRowsData } = await admin
    .from("recent_gallery_visits")
    .select("gallery_id, visited_at")
    .eq("user_id", user.id)
    .order("visited_at", { ascending: false })
    .limit(6);

  const recentGalleryVisitRows =
    (recentGalleryVisitRowsData || []) as RecentGalleryVisitRow[];

  const recentGalleryIds = recentGalleryVisitRows.map(
    (visit) => visit.gallery_id
  );

  let recentGalleries: RecentPublicGallery[] = [];

  if (recentGalleryIds.length > 0) {
    const { data: recentGalleriesData } = await admin
      .from("galleries")
      .select("id, title, slug, status")
      .in("id", recentGalleryIds)
      .eq("status", "published");

    const recentGalleryById = new Map(
      ((recentGalleriesData || []) as FavoriteGalleryRecord[]).map(
        (gallery) => [gallery.id, gallery]
      )
    );

    recentGalleries = recentGalleryVisitRows
      .map((visit) => {
        const gallery = recentGalleryById.get(visit.gallery_id);

        if (!gallery) {
          return null;
        }

        return {
          ...gallery,
          visited_at: visit.visited_at,
        };
      })
      .filter(Boolean) as RecentPublicGallery[];
  }

  const recentGalleriesCard = (
    <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600">
      <h3 className="text-lg font-semibold text-neutral-100">
        Gallerie visitate recentemente
      </h3>

      {recentGalleries.length === 0 && (
        <p className="mt-3 text-sm leading-6 text-neutral-400">
          Non hai ancora visitato gallerie pubbliche. Esplora il portale e
          ritroverai qui gli ultimi spazi aperti.
        </p>
      )}

      {recentGalleries.length > 0 && (
        <div className="mt-4 space-y-3">
          {recentGalleries.slice(0, 3).map((gallery) => (
            <a
              key={gallery.id}
              href={`/gallerie/${gallery.slug}`}
              className="block rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-600"
            >
              <p className="font-medium text-neutral-100">{gallery.title}</p>
              <p className="mt-1 text-xs text-neutral-500">
                Visitata il{" "}
                {new Date(gallery.visited_at).toLocaleDateString("it-IT")}
              </p>
            </a>
          ))}
        </div>
      )}

      <a
        href="/gallerie"
        className="mt-5 inline-flex rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white"
      >
        Esplora gallerie
      </a>
    </article>
  );

    const { data: sentInquiriesData } = await admin
    .from("gallery_inquiries")
    .select(
      `
      id,
      gallery_id,
      artwork_id,
      status,
      created_at,
      galleries (
        id,
        title,
        slug
      )
    `
    )
    .eq("submitted_by_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(6);

  const sentInquiries = (sentInquiriesData || []) as unknown as SentInquiry[];

  const sentInquiriesCard = (
    <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600">
      <h3 className="text-lg font-semibold text-neutral-100">
        Richieste inviate
      </h3>

      {sentInquiries.length === 0 && (
        <p className="mt-3 text-sm leading-6 text-neutral-400">
          Non hai ancora inviato richieste. Apri una galleria pubblica e usa il
          form informazioni.
        </p>
      )}

      {sentInquiries.length > 0 && (
        <div className="mt-4 space-y-3">
          {sentInquiries.slice(0, 3).map((inquiry) => {
            const gallery = normalizeGalleryRelation(inquiry.galleries);

            return (
              <a
                key={inquiry.id}
                href={gallery ? `/gallerie/${gallery.slug}` : "/gallerie"}
                className="block rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-600"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-neutral-100">
                    {gallery?.title || "Galleria non trovata"}
                  </p>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${getSentInquiryBadgeClass(
                      inquiry.status
                    )}`}
                  >
                    {getSentInquiryLabel(inquiry.status)}
                  </span>
                </div>

                <p className="mt-2 text-xs text-neutral-500">
                  Inviata il{" "}
                  {new Date(inquiry.created_at).toLocaleDateString("it-IT")}
                </p>
              </a>
            );
          })}
        </div>
      )}

      <a
        href="/gallerie"
        className="mt-5 inline-flex rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white"
      >
        Esplora gallerie
      </a>
    </article>
  );

  const favoriteArtworksCard = (
    <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600">
      <h3 className="text-lg font-semibold text-neutral-100">
        Opere preferite
      </h3>

      {favoriteArtworks.length === 0 && (
        <p className="mt-3 text-sm leading-6 text-neutral-400">
          Non hai ancora salvato opere. Apri una galleria pubblica e usa il
          pulsante Salva opera.
        </p>
      )}

      {favoriteArtworks.length > 0 && (
        <div className="mt-4 space-y-3">
          {favoriteArtworks.slice(0, 3).map((artwork) => (
            <a
              key={artwork.id}
              href={
                artwork.gallery_slug
                  ? `/gallerie/${artwork.gallery_slug}#catalogo`
                  : "/gallerie"
              }
              className="block rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-600"
            >
              <p className="font-medium text-neutral-100">{artwork.title}</p>

              {artwork.artist_name && (
                <p className="mt-1 text-xs text-neutral-400">
                  {artwork.artist_name}
                </p>
              )}

              {artwork.gallery_title && (
                <p className="mt-1 text-xs text-neutral-500">
                  Da: {artwork.gallery_title}
                </p>
              )}

              <p className="mt-1 text-xs text-neutral-500">
                Salvata il{" "}
                {new Date(artwork.saved_at).toLocaleDateString("it-IT")}
              </p>
            </a>
          ))}
        </div>
      )}

      <a
        href="/gallerie"
        className="mt-5 inline-flex rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white"
      >
        Esplora opere
      </a>
    </article>
  );

  const favoriteGalleriesCard = (
    <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600">
      <h3 className="text-lg font-semibold text-neutral-100">
        Gallerie preferite
      </h3>

      {favoriteGalleries.length === 0 && (
        <p className="mt-3 text-sm leading-6 text-neutral-400">
          Non hai ancora salvato gallerie. Esplora il portale e usa il pulsante
          Salva galleria.
        </p>
      )}

      {favoriteGalleries.length > 0 && (
        <div className="mt-4 space-y-3">
          {favoriteGalleries.slice(0, 3).map((gallery) => (
            <a
              key={gallery.id}
              href={`/gallerie/${gallery.slug}`}
              className="block rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:border-neutral-600"
            >
              <p className="font-medium text-neutral-100">{gallery.title}</p>
              <p className="mt-1 text-xs text-neutral-500">
                Salvata il{" "}
                {new Date(gallery.saved_at).toLocaleDateString("it-IT")}
              </p>
            </a>
          ))}
        </div>
      )}

      <a
        href="/gallerie"
        className="mt-5 inline-flex rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white"
      >
        Esplora gallerie
      </a>
    </article>
  );

    if (!canManage) {
    const visitorName =
      profile.display_name || profile.full_name || profile.email || "Visitor";

    return (
      <DashboardShell
        title={`Ciao, ${visitorName}`}
        subtitle="Questa e la tua dashboard community: il tuo spazio personale dentro mostra.space."
        activeSection="dashboard"
          navMode="community"
        actions={
          <a
            href="/gallerie"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Esplora gallerie pubbliche
          </a>
        }
      >
        <div className="space-y-8">
          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Community
            </p>

            <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
              Il tuo spazio personale
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
              Il tuo account e attivo come Visitor. Puoi esplorare il portale,
              visitare gallerie pubbliche, salvare preferiti e gestire le tue
              richieste. Questi strumenti community resteranno disponibili anche
              se passerai ad account Gallerista o Artista.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  {favoriteGalleriesCard}

  {favoriteArtworksCard}

  {sentInquiriesCard}

  {recentGalleriesCard}

  <a
    href="/account"
    
              className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600"
            >
              <h3 className="text-lg font-semibold text-neutral-100">
                Impostazioni account
              </h3>
              <p className="mt-3 text-sm leading-6 text-neutral-400">
                Gestisci sicurezza, preferenze e dati del tuo account.
              </p>
            </a>
          </section>

          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                  Creator tools
                </p>

                <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
                  Vuoi creare una galleria?
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                  Puoi trasformare questo stesso account in account Gallerista
                  o Artista. La parte community resta attiva, ma si aggiungono
                  gallerie, opere, editor 3D e richieste ricevute.
                </p>
              </div>

              <a
                href="/account/upgrade-gallerist"
                className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                Passa a Gallerista / Artista
              </a>
            </div>
          </section>

          <section className="rounded-3xl border border-dashed border-neutral-800 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Prossimamente
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-sm text-neutral-400">
              <span className="rounded-full border border-neutral-800 px-4 py-2">
                Chat
              </span>
              <span className="rounded-full border border-neutral-800 px-4 py-2">
                Follow
              </span>
              <span className="rounded-full border border-neutral-800 px-4 py-2">
                Notifiche
              </span>
              <span className="rounded-full border border-neutral-800 px-4 py-2">
                Eventi
              </span>
              <span className="rounded-full border border-neutral-800 px-4 py-2">
                Liste personali
              </span>
              <span className="rounded-full border border-neutral-800 px-4 py-2">
                Feed
              </span>
            </div>
          </section>
        </div>
      </DashboardShell>
    );
  }

  const { data: galleries } = await supabase
    .from("galleries")
    .select("id, title, slug, status, created_at, published_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const { data: artworks } = await supabase
    .from("artworks")
    .select("id, title, is_public, is_for_sale, file_size_bytes, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const { data: inquiries } = await supabase
    .from("gallery_inquiries")
    .select(
      `
      id,
      name,
      email,
      status,
      created_at,
      galleries (
        id,
        title,
        slug
      )
    `
    )
    .order("created_at", { ascending: false });

  const safeGalleries = (galleries || []) as Gallery[];
  const safeArtworks = (artworks || []) as Artwork[];
  const safeInquiries = (inquiries || []) as unknown as Inquiry[];

  const draftGalleriesList = safeGalleries.filter(
    (gallery) => gallery.status === "draft"
  );

  const publishedGalleriesList = safeGalleries.filter(
    (gallery) => gallery.status === "published"
  );

  const archivedGalleriesList = safeGalleries.filter(
    (gallery) => gallery.status === "archived"
  );

  const draftGalleries = draftGalleriesList.length;
  const publishedGalleries = publishedGalleriesList.length;
  const archivedGalleries = archivedGalleriesList.length;

  const publicArtworks = safeArtworks.filter(
    (artwork) => artwork.is_public === true
  ).length;

  const forSaleArtworks = safeArtworks.filter(
    (artwork) => artwork.is_for_sale === true
  ).length;

  const newInquiries = safeInquiries.filter(
    (inquiry) => inquiry.status === "new"
  ).length;

  const monthStart = getCurrentMonthStart();

  const monthlyRequestsCount = safeInquiries.filter((inquiry) => {
    return new Date(inquiry.created_at) >= monthStart;
  }).length;

  const storageUsedBytes = safeArtworks.reduce(
    (total, artwork) => total + (artwork.file_size_bytes || 0),
    0
  );

  const latestGalleries = safeGalleries.slice(0, 4);
  const latestInquiries = safeInquiries.slice(0, 4);
  const plan = normalizePlanName(profile.plan);

  const displayName =
    profile.display_name || profile.full_name || profile.email || "Gallerista";

  const firstDraftGallery = draftGalleriesList[0] || null;
  const latestPublishedGallery = publishedGalleriesList[0] || null;
  const primaryGallery = firstDraftGallery || latestPublishedGallery || null;

  const hasGalleries = safeGalleries.length > 0;
  const hasArtworks = safeArtworks.length > 0;
  const hasPublishedGallery = publishedGalleries > 0;
  const hasNewInquiries = newInquiries > 0;

  let onboardingTitle = "Crea la tua prima galleria virtuale";
  let onboardingDescription =
    "Parti creando uno spazio, poi carica le opere, apri l’editor 3D e pubblica la pagina visitatore.";
  let onboardingPrimaryHref = "/dashboard/gallerie";
  let onboardingPrimaryLabel = "Crea galleria";
  let onboardingSecondaryHref = "/dashboard/opere";
  let onboardingSecondaryLabel = "Carica opere";

  if (hasGalleries && !hasArtworks) {
    onboardingTitle = "Carica le prime opere";
    onboardingDescription =
      "Hai già creato una galleria. Ora carica le opere da inserire nello spazio 3D.";
    onboardingPrimaryHref = "/dashboard/opere";
    onboardingPrimaryLabel = "Carica opere";
    onboardingSecondaryHref = `/dashboard/gallerie/${primaryGallery?.id}`;
    onboardingSecondaryLabel = "Apri galleria";
  }

  if (hasGalleries && hasArtworks && firstDraftGallery) {
    onboardingTitle = "Continua la configurazione della bozza";
    onboardingDescription =
      "Completa cover, opere e allestimento 3D. Quando la checklist è pronta, potrai pubblicare.";
    onboardingPrimaryHref = `/dashboard/gallerie/${firstDraftGallery.id}`;
    onboardingPrimaryLabel = "Continua configurazione";
    onboardingSecondaryHref = `/dashboard/gallerie-editor/${firstDraftGallery.id}`;
    onboardingSecondaryLabel = "Apri editor 3D";
  }

  if (hasPublishedGallery && !firstDraftGallery) {
    onboardingTitle = "La tua galleria è online";
    onboardingDescription =
      "Controlla le richieste ricevute, aggiorna le opere o crea un nuovo spazio espositivo.";
    onboardingPrimaryHref = latestPublishedGallery
      ? `/gallerie/${latestPublishedGallery.slug}`
      : "/gallerie";
    onboardingPrimaryLabel = "Apri pagina pubblica";
    onboardingSecondaryHref = "/dashboard/richieste";
    onboardingSecondaryLabel = "Vedi richieste";
  }

  return (
    <DashboardShell
      title={`Ciao, ${displayName}`}
      subtitle="Da qui controlli gallerie virtuali, opere, pubblicazioni, limiti piano e richieste ricevute dai visitatori."
      activeSection="dashboard"
      actions={
        <>
          <a
            href="/dashboard/gallerie"
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            Crea / gestisci gallerie
          </a>

          <a
            href="/gallerie"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Elenco pubblico
          </a>
        </>
      }
    >
          <section className="mb-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          Community
        </p>

        <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
          Il tuo spazio personale
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
          Anche come Gallerista o Artista mantieni tutti gli strumenti community:
          profilo, preferiti, richieste inviate, cronologia visite e impostazioni
          account. La community e unica, cambiano solo gli strumenti creator
          disponibili in base al ruolo.
        </p>
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  <a
    href="/account"
    className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600"
  >
    <h3 className="text-lg font-semibold text-neutral-100">
      Profilo
    </h3>
    <p className="mt-3 text-sm leading-6 text-neutral-400">
      Gestisci nome, dati account e informazioni personali.
    </p>
  </a>

  {favoriteGalleriesCard}

  {favoriteArtworksCard}

              
          {sentInquiriesCard}


        {recentGalleriesCard}

        <a
          href="/account"
          className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600"
        >
          <h3 className="text-lg font-semibold text-neutral-100">
            Impostazioni account
          </h3>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            Gestisci sicurezza, preferenze e dati del tuo account.
          </p>
        </a>
      </section>

      <section className="mb-8 rounded-3xl border border-dashed border-neutral-800 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
          Prossimamente
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-sm text-neutral-400">
          <span className="rounded-full border border-neutral-800 px-4 py-2">
            Chat
          </span>
          <span className="rounded-full border border-neutral-800 px-4 py-2">
            Follow
          </span>
          <span className="rounded-full border border-neutral-800 px-4 py-2">
            Notifiche
          </span>
          <span className="rounded-full border border-neutral-800 px-4 py-2">
            Eventi
          </span>
          <span className="rounded-full border border-neutral-800 px-4 py-2">
            Liste personali
          </span>
          <span className="rounded-full border border-neutral-800 px-4 py-2">
            Feed
          </span>
        </div>
      </section>
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Onboarding
            </p>

            <h2 className="text-3xl font-semibold">{onboardingTitle}</h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
              {onboardingDescription}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={onboardingPrimaryHref}
                target={
                  onboardingPrimaryHref.startsWith("/gallerie/")
                    ? "_blank"
                    : undefined
                }
                rel={
                  onboardingPrimaryHref.startsWith("/gallerie/")
                    ? "noreferrer"
                    : undefined
                }
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                {onboardingPrimaryLabel}
              </a>

              <a
                href={onboardingSecondaryHref}
                className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
              >
                {onboardingSecondaryLabel}
              </a>

              {primaryGallery && (
                <a
                  href={`/unity-frame?galleryId=${primaryGallery.id}&mode=visitor`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-blue-800 px-5 py-2 text-sm text-blue-200 transition hover:border-blue-500"
                >
                  Anteprima viewer 3D
                </a>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex items-start gap-3">
                <span
                  className={
                    hasGalleries
                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-800 bg-green-950 text-sm text-green-300"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-sm text-neutral-500"
                  }
                >
                  {hasGalleries ? "✓" : "1"}
                </span>

                <div>
                  <p className="text-sm font-medium text-neutral-100">
                    Crea una galleria
                  </p>

                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {hasGalleries
                      ? `${safeGalleries.length} gallerie create.`
                      : "Crea il primo spazio espositivo dal pannello gallerie."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex items-start gap-3">
                <span
                  className={
                    hasArtworks
                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-800 bg-green-950 text-sm text-green-300"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-sm text-neutral-500"
                  }
                >
                  {hasArtworks ? "✓" : "2"}
                </span>

                <div>
                  <p className="text-sm font-medium text-neutral-100">
                    Carica opere
                  </p>

                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {hasArtworks
                      ? `${safeArtworks.length} opere caricate, ${publicArtworks} pubbliche.`
                      : "Carica immagini, dati, prezzi e stato pubblico delle opere."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex items-start gap-3">
                <span
                  className={
                    hasPublishedGallery
                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-800 bg-green-950 text-sm text-green-300"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-yellow-800 bg-yellow-950 text-sm text-yellow-300"
                  }
                >
                  {hasPublishedGallery ? "✓" : "3"}
                </span>

                <div>
                  <p className="text-sm font-medium text-neutral-100">
                    Allestisci e pubblica
                  </p>

                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {hasPublishedGallery
                      ? `${publishedGalleries} gallerie online.`
                      : "Apri l’editor 3D, posiziona le opere e pubblica quando la checklist è pronta."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex items-start gap-3">
                <span
                  className={
                    hasNewInquiries
                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-800 bg-green-950 text-sm text-green-300"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-sm text-neutral-500"
                  }
                >
                  {hasNewInquiries ? "!" : "4"}
                </span>

                <div>
                  <p className="text-sm font-medium text-neutral-100">
                    Gestisci richieste
                  </p>

                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {hasNewInquiries
                      ? `Hai ${newInquiries} nuove richieste da controllare.`
                      : "Quando i visitatori inviano richieste, le troverai nella sezione richieste."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Gallerie
          </p>

          <p className="text-4xl font-semibold">{safeGalleries.length}</p>

          <p className="mt-3 text-sm text-neutral-400">
            {publishedGalleries} pubblicate · {draftGalleries} bozze ·{" "}
            {archivedGalleries} archiviate
          </p>

          <a
            href="/dashboard/gallerie"
            className="mt-6 inline-flex rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Gestisci gallerie
          </a>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Opere
          </p>

          <p className="text-4xl font-semibold">{safeArtworks.length}</p>

          <p className="mt-3 text-sm text-neutral-400">
            {publicArtworks} pubbliche · {forSaleArtworks} in vendita
          </p>

          <a
            href="/dashboard/opere"
            className="mt-6 inline-flex rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Gestisci opere
          </a>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Richieste
          </p>

          <p className="text-4xl font-semibold">{safeInquiries.length}</p>

          <p className="mt-3 text-sm text-neutral-400">
            {newInquiries} nuove · {monthlyRequestsCount} questo mese
          </p>

          <a
            href="/dashboard/richieste"
            className="mt-6 inline-flex rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Apri richieste
          </a>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Piano
          </p>

          <p className="text-4xl font-semibold capitalize">{plan}</p>

          <p className="mt-3 text-sm text-neutral-400">
            {formatStorage(storageUsedBytes)} usati · ruolo {profile.role}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href="/account"
              className="inline-flex rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-500 transition hover:border-neutral-600 hover:text-neutral-300"
            >
              Account
            </a>

            <a
              href="/pricing"
              className="inline-flex rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Piani
            </a>
          </div>
        </article>
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-4">
        <a
          href="/dashboard/gallerie"
          className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
            Azione rapida
          </p>

          <h3 className="mt-3 text-lg font-medium">Crea galleria</h3>

          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Apri la sezione gallerie e crea o modifica uno spazio virtuale.
          </p>
        </a>

        <a
          href="/dashboard/opere"
          className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
            Azione rapida
          </p>

          <h3 className="mt-3 text-lg font-medium">Carica opera</h3>

          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Aggiungi immagini, dati, dimensioni, prezzo e visibilità.
          </p>
        </a>

        <a
          href={primaryGallery ? `/dashboard/gallerie/${primaryGallery.id}` : "/dashboard/gallerie"}
          className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
            Azione rapida
          </p>

          <h3 className="mt-3 text-lg font-medium">Checklist galleria</h3>

          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Controlla cover, opere, allestimento, anteprima e pubblicazione.
          </p>
        </a>

        <a
          href="/dashboard/richieste"
          className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
            Azione rapida
          </p>

          <h3 className="mt-3 text-lg font-medium">Richieste ricevute</h3>

          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Leggi e gestisci i contatti arrivati dalle gallerie pubbliche.
          </p>
        </a>
      </section>

      <div className="mt-6">
        <PlanUsageCard
          plan={plan}
          galleriesCount={safeGalleries.length}
          artworksCount={safeArtworks.length}
          storageUsedBytes={storageUsedBytes}
          monthlyRequestsCount={monthlyRequestsCount}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Ultime gallerie
              </p>

              <h2 className="text-2xl font-medium">Spazi recenti</h2>
            </div>

            <a
              href="/dashboard/gallerie"
              className="text-sm text-neutral-400 underline-offset-4 hover:text-white hover:underline"
            >
              Vedi tutte
            </a>
          </div>

          {latestGalleries.length === 0 && (
            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
              <p className="text-neutral-300">
                Non hai ancora creato gallerie.
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Crea la prima galleria, poi carica opere e apri l’editor 3D per
                iniziare l’allestimento.
              </p>

              <a
                href="/dashboard/gallerie"
                className="mt-4 inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                Crea la prima galleria
              </a>
            </div>
          )}

          {latestGalleries.length > 0 && (
            <div className="mt-6 space-y-3">
              {latestGalleries.map((gallery) => (
                <article
                  key={gallery.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-medium">
                          {gallery.title}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getStatusBadgeClass(
                            gallery.status
                          )}`}
                        >
                          {getStatusLabel(gallery.status)}
                        </span>
                      </div>

                      <p className="mt-2 break-all text-xs text-neutral-500">
                        /gallerie/{gallery.slug}
                      </p>

                      <p className="mt-2 text-xs text-neutral-600">
                        Creata il {formatDate(gallery.created_at)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <a
                        href={`/dashboard/gallerie/${gallery.id}`}
                        className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                      >
                        Gestisci
                      </a>

                      <a
                        href={`/dashboard/gallerie-editor/${gallery.id}`}
                        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                      >
                        Editor
                      </a>

                      {gallery.status === "published" && (
                        <a
                          href={`/gallerie/${gallery.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-green-800 px-4 py-2 text-sm text-green-200 transition hover:border-green-500"
                        >
                          Pubblica
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Ultime richieste
              </p>

              <h2 className="text-2xl font-medium">Lead recenti</h2>
            </div>

            <a
              href="/dashboard/richieste"
              className="text-sm text-neutral-400 underline-offset-4 hover:text-white hover:underline"
            >
              Vedi tutte
            </a>
          </div>

          {latestInquiries.length === 0 && (
            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
              <p className="text-neutral-300">
                Non hai ancora ricevuto richieste.
              </p>

              <p className="mt-2 text-sm text-neutral-500">
                Pubblica una galleria e condividi il link per iniziare a
                ricevere contatti.
              </p>

              {latestPublishedGallery && (
                <a
                  href={`/gallerie/${latestPublishedGallery.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-full border border-green-800 px-5 py-2 text-sm text-green-200 transition hover:border-green-500"
                >
                  Apri galleria pubblica
                </a>
              )}
            </div>
          )}

          {latestInquiries.length > 0 && (
            <div className="mt-6 space-y-3">
              {latestInquiries.map((inquiry) => {
                const gallery = normalizeGalleryRelation(inquiry.galleries);

                return (
                  <article
                    key={inquiry.id}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-medium">
                            {inquiry.name}
                          </h3>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getInquiryBadgeClass(
                              inquiry.status
                            )}`}
                          >
                            {getInquiryLabel(inquiry.status)}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-neutral-400">
                          {inquiry.email}
                        </p>

                        <p className="mt-2 text-xs text-neutral-500">
                          {gallery
                            ? `Da: ${gallery.title}`
                            : "Galleria non trovata"}
                        </p>
                      </div>

                      <a
                        href="/dashboard/richieste"
                        className="shrink-0 rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                      >
                        Apri
                      </a>
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