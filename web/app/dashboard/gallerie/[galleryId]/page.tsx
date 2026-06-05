import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import AddArtworkToGalleryForm from "@/components/dashboard/AddArtworkToGalleryForm";
import RemoveGalleryArtworkButton from "@/components/dashboard/RemoveGalleryArtworkButton";
import GalleryPublishStatusButton from "@/components/dashboard/GalleryPublishStatusButton";
import EditGalleryDetailsForm from "@/components/dashboard/EditGalleryDetailsForm";
import GalleryCoverUploadForm from "@/components/dashboard/GalleryCoverUploadForm";
import DeleteGalleryButton from "@/components/dashboard/DeleteGalleryButton";
import {
  canAddArtworkToGallery,
  getPlanLimits,
  normalizePlanName,
} from "@/lib/plans";

type GalleryDetailPageProps = {
  params: Promise<{
    galleryId: string;
  }>;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "institution";
};

type Gallery = {
  id: string;
  owner_id: string;
  template_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

type GalleryTemplate = {
  id: string;
  name: string;
  slug: string;
  unity_scene_key: string;
  max_artworks: number;
};

type Artwork = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
  image_url: string;
};

type GalleryArtworkRow = {
  id: string;
  gallery_id: string;
  artwork_id: string;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_x: number;
  rotation_y: number;
  rotation_z: number;
  scale_x: number;
  scale_y: number;
  scale_z: number;
  wall_key: string | null;
  sort_order: number;
  artworks: {
    id: string;
    title: string;
    artist_name: string | null;
    year: string | null;
    technique: string | null;
    dimensions: string | null;
    image_url: string;
    is_for_sale: boolean;
    is_public: boolean;
  } | null;
};

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "0";
  }

  return Number(value).toFixed(2);
}

function getStatusLabel(status: Gallery["status"]) {
  if (status === "published") {
    return "Pubblicata";
  }

  if (status === "archived") {
    return "Archiviata";
  }

  return "Bozza";
}

function getStatusBadgeClass(status: Gallery["status"]) {
  if (status === "published") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "archived") {
    return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-400";
}

function getEffectiveLimit(
  planLimit: number | null,
  templateLimit: number | null
) {
  if (planLimit === null && templateLimit === null) {
    return null;
  }

  if (planLimit === null) {
    return templateLimit;
  }

  if (templateLimit === null) {
    return planLimit;
  }

  return Math.min(planLimit, templateLimit);
}

export default async function DashboardGalleryDetailPage({
  params,
}: GalleryDetailPageProps) {
  const { galleryId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, plan")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    redirect("/auth/login");
  }

  const isAdmin = profile.role === "admin";
  const plan = normalizePlanName(profile.plan);
  const limits = getPlanLimits(plan);

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select(
      "id, owner_id, template_id, title, slug, description, status, cover_image_url, created_at, updated_at, published_at"
    )
    .eq("id", galleryId)
    .single<Gallery>();

  if (galleryError || !gallery) {
    return (
      <DashboardShell
        title="Galleria non trovata"
        subtitle="La galleria non esiste oppure non hai i permessi per leggerla."
        activeSection="gallerie"
      >
        <div className="rounded-3xl border border-red-800 bg-red-950/30 p-6">
          {galleryError?.message || "Nessun dato disponibile."}
        </div>

        <a
          href="/dashboard/gallerie"
          className="mt-8 inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          Torna alle gallerie
        </a>
      </DashboardShell>
    );
  }

  const canManage = gallery.owner_id === user.id || isAdmin;

  if (!canManage) {
    return (
      <DashboardShell
        title="Accesso negato"
        subtitle="Non puoi gestire questa galleria perche non sei il proprietario."
        activeSection="gallerie"
      >
        <a
          href="/dashboard/gallerie"
          className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          Torna alle gallerie
        </a>
      </DashboardShell>
    );
  }

  let template: GalleryTemplate | null = null;

  if (gallery.template_id) {
    const { data } = await supabase
      .from("gallery_templates")
      .select("id, name, slug, unity_scene_key, max_artworks")
      .eq("id", gallery.template_id)
      .single<GalleryTemplate>();

    template = data;
  }

  const { data: artworks } = await supabase
    .from("artworks")
    .select("id, title, artist_name, year, image_url")
    .eq("owner_id", gallery.owner_id)
    .order("created_at", { ascending: false });

  const { data: galleryArtworks, error: galleryArtworksError } = await supabase
    .from("gallery_artworks")
    .select(
      `
      id,
      gallery_id,
      artwork_id,
      position_x,
      position_y,
      position_z,
      rotation_x,
      rotation_y,
      rotation_z,
      scale_x,
      scale_y,
      scale_z,
      wall_key,
      sort_order,
      artworks (
        id,
        title,
        artist_name,
        year,
        technique,
        dimensions,
        image_url,
        is_for_sale,
        is_public
      )
    `
    )
    .eq("gallery_id", gallery.id)
    .order("sort_order", { ascending: true });

  const safeArtworks = (artworks || []) as Artwork[];
  const safeGalleryArtworks = (galleryArtworks || []) as unknown as GalleryArtworkRow[];
  const linkedArtworkIds = safeGalleryArtworks.map((item) => item.artwork_id);

  const templateMaxArtworks =
    template && template.max_artworks > 0 ? template.max_artworks : null;

  const planMaxArtworksPerGallery = limits.maxArtworksPerGallery;

  const effectiveLimit = getEffectiveLimit(
    planMaxArtworksPerGallery,
    templateMaxArtworks
  );

  const planAddCheck = canAddArtworkToGallery(
    plan,
    safeGalleryArtworks.length
  );

  const templateLimitReached =
    templateMaxArtworks !== null &&
    safeGalleryArtworks.length >= templateMaxArtworks;

  const effectiveLimitReached =
    effectiveLimit !== null && safeGalleryArtworks.length >= effectiveLimit;

  const canAddArtwork =
    planAddCheck.allowed && !templateLimitReached && !effectiveLimitReached;

  const limitMessage = !planAddCheck.allowed
    ? planAddCheck.reason
    : templateLimitReached
      ? `Questo template consente massimo ${templateMaxArtworks} opere.`
      : effectiveLimitReached
        ? `Questa galleria ha raggiunto il limite massimo di ${effectiveLimit} opere.`
        : undefined;

  return (
    <DashboardShell
      title={gallery.title}
      subtitle="Gestisci dati pubblici, opere collegate, pubblicazione e apertura dell editor Unity WebGL."
      activeSection="gallerie"
      actions={
        <>
          <a
            href="/dashboard/gallerie"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Tutte le gallerie
          </a>

          <a
            href={`/dashboard/gallerie-editor/${gallery.id}`}
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            Apri editor Unity
          </a>

          <a
            href={`/gallerie/${gallery.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Viewer pubblico
          </a>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-medium">Dati galleria</h2>

            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getStatusBadgeClass(
                gallery.status
              )}`}
            >
              {getStatusLabel(gallery.status)}
            </span>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="text-neutral-500">ID</dt>
              <dd className="mt-1 break-all text-neutral-200">
                {gallery.id}
              </dd>
            </div>

            <div>
              <dt className="text-neutral-500">Titolo</dt>
              <dd className="mt-1 text-neutral-200">{gallery.title}</dd>
            </div>

            <div>
              <dt className="text-neutral-500">Slug</dt>
              <dd className="mt-1 text-neutral-200">{gallery.slug}</dd>
            </div>

            <div>
              <dt className="text-neutral-500">Status</dt>
              <dd className="mt-1 text-neutral-200">{gallery.status}</dd>
            </div>

            <div>
              <dt className="text-neutral-500">Descrizione</dt>
              <dd className="mt-1 text-neutral-200">
                {gallery.description || "Non inserita"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-2xl font-medium">Template e limiti</h2>

          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="text-neutral-500">Template</dt>
              <dd className="mt-1 text-neutral-200">
                {template?.name || "Template non trovato"}
              </dd>
            </div>

            <div>
              <dt className="text-neutral-500">Unity scene key</dt>
              <dd className="mt-1 text-neutral-200">
                {template?.unity_scene_key || "N/D"}
              </dd>
            </div>

            <div>
              <dt className="text-neutral-500">Piano</dt>
              <dd className="mt-1 text-neutral-200">{limits.label}</dd>
            </div>

            <div>
              <dt className="text-neutral-500">Limite piano</dt>
              <dd className="mt-1 text-neutral-200">
                {planMaxArtworksPerGallery === null
                  ? "Illimitato"
                  : planMaxArtworksPerGallery}
              </dd>
            </div>

            <div>
              <dt className="text-neutral-500">Limite template</dt>
              <dd className="mt-1 text-neutral-200">
                {templateMaxArtworks === null
                  ? "N/D"
                  : templateMaxArtworks}
              </dd>
            </div>

            <div>
              <dt className="text-neutral-500">Limite effettivo</dt>
              <dd className="mt-1 text-neutral-200">
                {effectiveLimit === null ? "Illimitato" : effectiveLimit}
              </dd>
            </div>

            <div>
              <dt className="text-neutral-500">Opere inserite</dt>
              <dd className="mt-1 text-neutral-200">
                {safeGalleryArtworks.length}
                {effectiveLimit !== null ? ` / ${effectiveLimit}` : ""}
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <div className="mt-6">
        <GalleryPublishStatusButton
          galleryId={gallery.id}
          currentStatus={gallery.status}
        />
      </div>

      <div className="mt-6">
        <EditGalleryDetailsForm
          galleryId={gallery.id}
          currentTitle={gallery.title}
          currentSlug={gallery.slug}
          currentDescription={gallery.description}
        />
      </div>

      <div className="mt-6">
  <GalleryCoverUploadForm
    galleryId={gallery.id}
    ownerId={gallery.owner_id}
    currentTitle={gallery.title}
    currentDescription={gallery.description || ""}
    currentCoverImageUrl={gallery.cover_image_url}
  />
</div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
        <AddArtworkToGalleryForm
          galleryId={gallery.id}
          artworks={safeArtworks}
          linkedArtworkIds={linkedArtworkIds}
          plan={plan}
          currentGalleryArtworkCount={safeGalleryArtworks.length}
          maxArtworksPerGallery={planMaxArtworksPerGallery}
          templateMaxArtworks={templateMaxArtworks}
          effectiveLimit={effectiveLimit}
          canAddArtwork={canAddArtwork}
          limitMessage={limitMessage}
        />

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Allestimento
              </p>

              <h2 className="text-2xl font-medium">Opere nella galleria</h2>
            </div>

            <p className="text-sm text-neutral-500">
              Totale: {safeGalleryArtworks.length}
            </p>
          </div>

          {galleryArtworksError && (
            <div className="mt-8 rounded-2xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-100">
              {galleryArtworksError.message}
            </div>
          )}

          {safeGalleryArtworks.length === 0 && (
            <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
              <p className="text-neutral-300">
                Non hai ancora aggiunto opere a questa galleria.
              </p>

              <p className="mt-2 text-sm text-neutral-500">
                Usa il form a sinistra per iniziare l allestimento.
              </p>
            </div>
          )}

          {safeGalleryArtworks.length > 0 && (
            <div className="mt-6 space-y-4">
              {safeGalleryArtworks.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
                >
                  <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                    <div className="aspect-[4/3] bg-neutral-900 md:aspect-auto">
                      {item.artworks?.image_url ? (
                        <img
                          src={item.artworks.image_url}
                          alt={item.artworks.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                          Immagine assente
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-medium">
                              {item.artworks?.title || "Opera non trovata"}
                            </h3>

                            {item.artworks?.is_public ? (
                              <span className="rounded-full border border-green-900 bg-green-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-green-300">
                                Pubblica
                              </span>
                            ) : (
                              <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-400">
                                Privata
                              </span>
                            )}

                            {item.artworks?.is_for_sale && (
                              <span className="rounded-full border border-blue-900 bg-blue-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-blue-300">
                                In vendita
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm text-neutral-500">
                            {item.artworks?.artist_name ||
                              "Artista non indicato"}
                            {item.artworks?.year
                              ? `, ${item.artworks.year}`
                              : ""}
                          </p>

                          <dl className="mt-4 grid gap-2 text-xs text-neutral-500 md:grid-cols-2">
                            <div>
                              <dt className="text-neutral-600">Parete</dt>
                              <dd className="text-neutral-300">
                                {item.wall_key || "N/D"}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-neutral-600">Ordine</dt>
                              <dd className="text-neutral-300">
                                {item.sort_order}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-neutral-600">Posizione</dt>
                              <dd className="text-neutral-300">
                                x {formatNumber(item.position_x)} · y{" "}
                                {formatNumber(item.position_y)} · z{" "}
                                {formatNumber(item.position_z)}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-neutral-600">Rotazione</dt>
                              <dd className="text-neutral-300">
                                x {formatNumber(item.rotation_x)} · y{" "}
                                {formatNumber(item.rotation_y)} · z{" "}
                                {formatNumber(item.rotation_z)}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-neutral-600">Scala</dt>
                              <dd className="text-neutral-300">
                                x {formatNumber(item.scale_x)} · y{" "}
                                {formatNumber(item.scale_y)} · z{" "}
                                {formatNumber(item.scale_z)}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <RemoveGalleryArtworkButton
                          galleryArtworkId={item.id}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
          Unity readiness
        </p>

        <h2 className="text-2xl font-medium">
          Dati pronti per il viewer 3D
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
          Ogni opera aggiunta qui crea una riga in{" "}
          <span className="text-neutral-100">gallery_artworks</span>. Unity
          leggera queste righe, scarichera le immagini da{" "}
          <span className="text-neutral-100">image_url</span> e creera i quadri
          nello spazio 3D usando posizione, rotazione e scala.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`/gallerie/${gallery.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Apri viewer pubblico
          </a>

          <a
            href={`/dashboard/gallerie-editor/${gallery.id}`}
            className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            Apri editor Unity
          </a>

          <a
            href={`/api/unity/galleries/${gallery.id}?mode=editor`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Apri JSON Unity
          </a>
        </div>
      </div>

      <div className="mt-6">
        <DeleteGalleryButton
          galleryId={gallery.id}
          galleryTitle={gallery.title}
          currentStatus={gallery.status}
        />
      </div>
    </DashboardShell>
  );
}