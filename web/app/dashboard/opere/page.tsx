import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import CreateArtworkForm from "@/components/dashboard/CreateArtworkForm";
import EditArtworkForm from "@/components/dashboard/EditArtworkForm";
import DeleteArtworkButton from "@/components/dashboard/DeleteArtworkButton";
import DataErrorCard from "@/components/system/DataErrorCard";
import EmptyStateCard from "@/components/system/EmptyStateCard";
import { getErrorMessage } from "@/lib/system/getErrorMessage";
import {
  bytesToMb,
  canUploadArtwork,
  getPlanLimits,
  normalizePlanName,
} from "@/lib/plans";

type DashboardArtworksPageProps = {
  searchParams?: Promise<{
    filter?: string;
  }>;
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "institution";
};

type Artwork = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
  technique: string | null;
  dimensions: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  price: number | string | null;
  currency: string | null;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  is_for_sale: boolean;
  is_public: boolean;
  file_size_bytes: number | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
};

type ArtworkFilter = "all" | "public" | "private" | "for-sale" | "not-for-sale";

function normalizeArtworkFilter(value: string | undefined): ArtworkFilter {
  if (
    value === "public" ||
    value === "private" ||
    value === "for-sale" ||
    value === "not-for-sale"
  ) {
    return value;
  }

  return "all";
}

function getFilterHref(filter: ArtworkFilter) {
  if (filter === "all") {
    return "/dashboard/opere";
  }

  return `/dashboard/opere?filter=${filter}`;
}

function getFilterLabel(filter: ArtworkFilter) {
  if (filter === "public") {
    return "Pubbliche";
  }

  if (filter === "private") {
    return "Private";
  }

  if (filter === "for-sale") {
    return "In vendita";
  }

  if (filter === "not-for-sale") {
    return "Non in vendita";
  }

  return "Tutte";
}

function getArtworkRealSizeLabel(artwork: Artwork) {
  if (artwork.width_cm && artwork.height_cm) {
    return `${Number(artwork.width_cm).toFixed(2)} x ${Number(
      artwork.height_cm
    ).toFixed(2)} cm`;
  }

  return "Fallback editor: 50 x 50 cm";
}

export default async function DashboardArtworksPage({
  searchParams,
}: DashboardArtworksPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedFilter = normalizeArtworkFilter(resolvedSearchParams.filter);

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
          <DataErrorCard
            title="Profilo non trovato"
            message="Non riesco a leggere il profilo utente. Effettua di nuovo il login oppure torna alla dashboard."
            details={getErrorMessage(profileError)}
            actionHref="/auth/login"
            actionLabel="Vai al login"
            secondaryHref="/dashboard"
            secondaryLabel="Dashboard"
          />
        </section>
      </main>
    );
  }

  const canManageArtworks =
    profile.role === "gallerist" || profile.role === "admin";

  if (!canManageArtworks) {
    return (
      <DashboardShell
        title="Area riservata ai galleristi"
        subtitle={`Il tuo ruolo attuale e ${profile.role}. Per creare e gestire opere devi avere il ruolo gallerista.`}
        activeSection="opere"
      >
        <a
          href="/dashboard"
          className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          Torna alla dashboard
        </a>
      </DashboardShell>
    );
  }

  const plan = normalizePlanName(profile.plan);
  const limits = getPlanLimits(plan);

  const { data: artworks, error: artworksError } = await supabase
    .from("artworks")
    .select(
      "id, title, artist_name, year, technique, dimensions, width_cm, height_cm, depth_cm, price, currency, description, image_url, thumbnail_url, is_for_sale, is_public, file_size_bytes, storage_path, created_at, updated_at"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const safeArtworks = (artworks || []) as Artwork[];

  const storageUsedBytes = safeArtworks.reduce(
    (total, artwork) => total + (artwork.file_size_bytes || 0),
    0
  );

  const uploadAvailability = canUploadArtwork({
    profilePlan: plan,
    currentArtworkCount: safeArtworks.length,
    currentStorageUsedMb: bytesToMb(storageUsedBytes),
    newFileSizeMb: 0,
  });

  const visibleArtworks = safeArtworks.filter((artwork) => {
    if (selectedFilter === "public") {
      return artwork.is_public === true;
    }

    if (selectedFilter === "private") {
      return artwork.is_public !== true;
    }

    if (selectedFilter === "for-sale") {
      return artwork.is_for_sale === true;
    }

    if (selectedFilter === "not-for-sale") {
      return artwork.is_for_sale !== true;
    }

    return true;
  });

  const filters: Array<{
    filter: ArtworkFilter;
    count: number;
  }> = [
    {
      filter: "all",
      count: safeArtworks.length,
    },
    {
      filter: "public",
      count: safeArtworks.filter((artwork) => artwork.is_public === true)
        .length,
    },
    {
      filter: "private",
      count: safeArtworks.filter((artwork) => artwork.is_public !== true)
        .length,
    },
    {
      filter: "for-sale",
      count: safeArtworks.filter((artwork) => artwork.is_for_sale === true)
        .length,
    },
    {
      filter: "not-for-sale",
      count: safeArtworks.filter((artwork) => artwork.is_for_sale !== true)
        .length,
    },
  ];

  return (
    <DashboardShell
      title="Archivio opere"
      subtitle="Qui carichi, organizzi e modifichi le opere che poi potranno essere inserite nelle gallerie virtuali e posizionate negli spazi espositivi."
      activeSection="opere"
      actions={
        <a
          href="/dashboard/gallerie"
          className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          Gallerie
        </a>
      }
    >
      {artworksError && (
        <div className="mb-6">
          <DataErrorCard
            title="Non riesco a caricare le opere"
            message="Le opere non sono state recuperate correttamente da Supabase. Puoi ricaricare la pagina oppure tornare alla dashboard."
            details={getErrorMessage(artworksError)}
            actionHref="/dashboard/opere"
            actionLabel="Ricarica opere"
            secondaryHref="/dashboard"
            secondaryLabel="Dashboard"
          />
        </div>
      )}

      <div className="mb-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Limiti piano
            </p>

            <h2 className="text-2xl font-medium">{limits.label}</h2>

            <p className="mt-2 text-sm text-neutral-400">
              Opere caricate: {safeArtworks.length} /{" "}
              {limits.maxArtworksTotal === null
                ? "Illimitato"
                : limits.maxArtworksTotal}
            </p>

            <p className="mt-1 text-sm text-neutral-400">
              Storage usato: {bytesToMb(storageUsedBytes).toFixed(2)} MB /{" "}
              {limits.maxStorageMb === null
                ? "Illimitato"
                : `${limits.maxStorageMb} MB`}
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              Peso massimo singola opera:{" "}
              {limits.maxArtworkFileMb === null
                ? "Illimitato"
                : `${limits.maxArtworkFileMb} MB`}
            </p>
          </div>

          {!uploadAvailability.allowed && (
            <a
              href="/pricing"
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              Passa a un piano superiore
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <CreateArtworkForm
          plan={plan}
          currentArtworkCount={safeArtworks.length}
          maxArtworksTotal={limits.maxArtworksTotal}
          storageUsedBytes={storageUsedBytes}
          maxStorageMb={limits.maxStorageMb}
          maxArtworkFileMb={limits.maxArtworkFileMb}
          canUpload={uploadAvailability.allowed}
          limitMessage={
            uploadAvailability.reason ||
            `Hai raggiunto un limite del piano ${limits.label}.`
          }
        />

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Archivio
              </p>

              <h2 className="text-2xl font-medium">Opere create</h2>
            </div>

            <p className="text-sm text-neutral-500">
              Totale: {safeArtworks.length}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {filters.map((item) => {
              const isActive = selectedFilter === item.filter;

              return (
                <a
                  key={item.filter}
                  href={getFilterHref(item.filter)}
                  className={
                    isActive
                      ? "rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950"
                      : "rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-100"
                  }
                >
                  {getFilterLabel(item.filter)}{" "}
                  <span
                    className={isActive ? "text-neutral-700" : "text-neutral-600"}
                  >
                    {item.count}
                  </span>
                </a>
              );
            })}
          </div>

          {!artworksError && safeArtworks.length === 0 && (
            <div className="mt-8">
              <EmptyStateCard
                eyebrow="Archivio vuoto"
                title="Non hai ancora creato opere"
                message="Usa il form di caricamento per aggiungere la prima opera al tuo archivio. Dopo il caricamento potrai inserirla in una galleria virtuale."
              />
            </div>
          )}

          {!artworksError &&
            safeArtworks.length > 0 &&
            visibleArtworks.length === 0 && (
              <div className="mt-8">
                <EmptyStateCard
                  eyebrow="Filtro vuoto"
                  title="Nessuna opera in questa categoria"
                  message="Cambia filtro oppure crea una nuova opera. Le opere non sono state eliminate: semplicemente non rientrano nel filtro selezionato."
                  actionHref="/dashboard/opere"
                  actionLabel="Mostra tutte"
                />
              </div>
            )}

          {visibleArtworks.length > 0 && (
            <div className="mt-6 space-y-6">
              {visibleArtworks.map((artwork) => (
                <div key={artwork.id} className="space-y-4">
                  <EditArtworkForm
                    artwork={{
                      id: artwork.id,
                      title: artwork.title,
                      artist_name: artwork.artist_name,
                      year: artwork.year,
                      technique: artwork.technique,
                      dimensions: artwork.dimensions,
                      width_cm: artwork.width_cm,
                      height_cm: artwork.height_cm,
                      depth_cm: artwork.depth_cm,
                      description: artwork.description,
                      image_url: artwork.thumbnail_url || artwork.image_url,
                      price:
                        artwork.price === null || artwork.price === undefined
                          ? null
                          : String(artwork.price),
                      currency: artwork.currency || "EUR",
                      is_for_sale: artwork.is_for_sale,
                      is_public: artwork.is_public,
                    }}
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={`/dashboard/opere/${artwork.id}`}
                      className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                    >
                      Dettaglio
                    </a>

                    <div className="rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs text-neutral-500">
                      Peso file:{" "}
                      {artwork.file_size_bytes
                        ? `${bytesToMb(artwork.file_size_bytes).toFixed(2)} MB`
                        : "Non registrato"}
                    </div>

                    <div className="rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs text-neutral-500">
                      Misure: {getArtworkRealSizeLabel(artwork)}
                    </div>
                  </div>

                  <DeleteArtworkButton
                    artworkId={artwork.id}
                    artworkTitle={artwork.title}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}