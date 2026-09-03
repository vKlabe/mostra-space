import { notFound, redirect } from "next/navigation";
import DeleteArtworkButton from "@/components/dashboard/DeleteArtworkButton";
import T from "@/components/i18n/T";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import LocalDateTime from "@/components/time/LocalDateTime";

type DashboardArtworkDetailPageProps = {
  params: Promise<{
    artworkId: string;
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

type Artwork = {
  id: string;
  owner_id: string;
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
  updated_at: string | null;
};

type Gallery = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
};

type GalleryArtworkRow = {
  id: string;
  gallery_id: string;
  artwork_id: string;
  sort_order: number;
  wall_key: string | null;
  position_x: number | null;
  position_y: number | null;
  position_z: number | null;
  rotation_x: number | null;
  rotation_y: number | null;
  rotation_z: number | null;
  scale_x: number | null;
  scale_y: number | null;
  scale_z: number | null;
  galleries: Gallery | Gallery[] | null;
};

function normalizeGallery(value: Gallery | Gallery[] | null) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return <LocalDateTime value={value} format="datetime" fallback="-" />;
}

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) {
    return "0 MB";
  }

  const mb = bytes / 1024 / 1024;

  if (mb < 1024) {
    return `${mb.toFixed(2)} MB`;
  }

  const gb = mb / 1024;

  return `${gb.toFixed(2)} GB`;
}

function formatPriceContent(
  price: number | string | null,
  currency: string | null
) {
  if (price === null || price === undefined || price === "") {
    return (
      <T
        textKey="dashboard.artworkDetail.details.priceNotSpecified"
        fallback="Non indicato"
      />
    );
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

function getGalleryStatusBadgeClass(
  status: "draft" | "published" | "archived"
) {
  if (status === "published") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "archived") {
    return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-400";
}

function getGalleryStatusTranslation(
  status: "draft" | "published" | "archived"
) {
  if (status === "published") {
    return {
      textKey: "dashboard.artworkDetail.galleryStatus.published",
      fallback: "Pubblicata",
    };
  }

  if (status === "archived") {
    return {
      textKey: "dashboard.artworkDetail.galleryStatus.archived",
      fallback: "Archiviata",
    };
  }

  return {
    textKey: "dashboard.artworkDetail.galleryStatus.draft",
    fallback: "Bozza",
  };
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }

  return Number(value).toFixed(2);
}

function formatCmContent(value: number | null) {
  if (value === null || value === undefined) {
    return (
      <T
        textKey="dashboard.artworkDetail.editorDimensions.notSpecified"
        fallback="Non indicata"
      />
    );
  }

  return `${Number(value).toFixed(2)} cm`;
}

function getEditorFallbackLabel(artwork: Artwork) {
  if (artwork.width_cm && artwork.height_cm) {
    return `${Number(artwork.width_cm).toFixed(2)} x ${Number(
      artwork.height_cm
    ).toFixed(2)} cm`;
  }

  return "50 x 50 cm";
}

function hasRealEditorDimensions(artwork: Artwork) {
  return Boolean(artwork.width_cm && artwork.height_cm);
}

export default async function DashboardArtworkDetailPage({
  params,
}: DashboardArtworkDetailPageProps) {
  const { artworkId } = await params;

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
    redirect("/dashboard");
  }

  const isAdmin = profile.role === "admin";
  const db = isAdmin ? createAdminClient() : supabase;

  const { data: artwork, error: artworkError } = await db
    .from("artworks")
    .select(
      "id, owner_id, title, artist_name, year, technique, dimensions, width_cm, height_cm, depth_cm, price, currency, description, image_url, thumbnail_url, is_for_sale, is_public, file_size_bytes, storage_path, created_at, updated_at"
    )
    .eq("id", artworkId)
    .single<Artwork>();

  if (artworkError || !artwork) {
    notFound();
  }

  const isOwner = artwork.owner_id === user.id;

  if (!isOwner && !isAdmin) {
    redirect("/dashboard/opere");
  }

  const { data: galleryArtworks, error: galleryArtworksError } = await db
    .from("gallery_artworks")
    .select(
      `
      id,
      gallery_id,
      artwork_id,
      sort_order,
      wall_key,
      position_x,
      position_y,
      position_z,
      rotation_x,
      rotation_y,
      rotation_z,
      scale_x,
      scale_y,
      scale_z,
      galleries (
        id,
        title,
        slug,
        status
      )
    `
    )
    .eq("artwork_id", artwork.id)
    .order("sort_order", { ascending: true });

  const safeGalleryArtworks =
    (galleryArtworks || []) as unknown as GalleryArtworkRow[];

  const linkedGalleries = safeGalleryArtworks
    .map((item) => ({
      relation: item,
      gallery: normalizeGallery(item.galleries),
    }))
    .filter((item) => Boolean(item.gallery)) as Array<{
    relation: GalleryArtworkRow;
    gallery: Gallery;
  }>;

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-50">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 border-b border-neutral-800 pb-8 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-neutral-500">
              <T
                textKey="dashboard.artworkDetail.header.label"
                fallback="Dettaglio opera"
              />
            </p>

            <h1 className="text-4xl font-semibold leading-tight">
              {artwork.title}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-400">
              <T
                textKey="dashboard.artworkDetail.header.description"
                fallback="Scheda tecnica, immagine, stato pubblico, dati commerciali, storage e gallerie in cui l’opera è stata allestita."
              />
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard/opere"
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              <T
                textKey="dashboard.artworkDetail.actions.backToArtworks"
                fallback="Torna alle opere"
              />
            </a>

            <a
              href="/dashboard"
              className="rounded-full border border-neutral-800 px-5 py-2 text-sm text-neutral-400 transition hover:border-neutral-600 hover:text-neutral-100"
            >
              <T
                textKey="dashboard.artworkDetail.actions.dashboard"
                fallback="Dashboard"
              />
            </a>

            {isAdmin && (
              <a
                href="/admin/storage"
                className="rounded-full border border-red-800 px-5 py-2 text-sm text-red-200 transition hover:border-red-500"
              >
                <T
                  textKey="dashboard.artworkDetail.actions.adminStorage"
                  fallback="Admin storage"
                />
              </a>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
            <div className="bg-neutral-950">
              <img
                src={artwork.thumbnail_url || artwork.image_url}
                alt={artwork.title}
                className="max-h-[680px] w-full object-contain"
              />
            </div>

            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                <span
                  className={
                    artwork.is_public
                      ? "rounded-full border border-green-900 bg-green-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-green-300"
                      : "rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-400"
                  }
                >
                  {artwork.is_public ? (
                    <T
                      textKey="dashboard.artworkDetail.status.public"
                      fallback="Pubblica"
                    />
                  ) : (
                    <T
                      textKey="dashboard.artworkDetail.status.private"
                      fallback="Privata"
                    />
                  )}
                </span>

                <span
                  className={
                    artwork.is_for_sale
                      ? "rounded-full border border-blue-900 bg-blue-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-blue-300"
                      : "rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-400"
                  }
                >
                  {artwork.is_for_sale ? (
                    <T
                      textKey="dashboard.artworkDetail.status.forSale"
                      fallback="In vendita"
                    />
                  ) : (
                    <T
                      textKey="dashboard.artworkDetail.status.notForSale"
                      fallback="Non in vendita"
                    />
                  )}
                </span>
              </div>

              {artwork.description ? (
                <p className="mt-5 text-sm leading-7 text-neutral-400">
                  {artwork.description}
                </p>
              ) : (
                <p className="mt-5 text-sm leading-7 text-neutral-500">
                  <T
                    textKey="dashboard.artworkDetail.image.noDescription"
                    fallback="Nessuna descrizione inserita."
                  />
                </p>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                <T
                  textKey="dashboard.artworkDetail.details.label"
                  fallback="Scheda opera"
                />
              </p>

              <dl className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                  <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                    <T
                      textKey="dashboard.artworkDetail.details.artist"
                      fallback="Artista"
                    />
                  </dt>

                  <dd className="mt-2 text-sm text-neutral-100">
                    {artwork.artist_name ? (
                      artwork.artist_name
                    ) : (
                      <T
                        textKey="dashboard.artworkDetail.details.notSpecifiedMasculine"
                        fallback="Non indicato"
                      />
                    )}
                  </dd>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                  <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                    <T
                      textKey="dashboard.artworkDetail.details.year"
                      fallback="Anno"
                    />
                  </dt>

                  <dd className="mt-2 text-sm text-neutral-100">
                    {artwork.year ? (
                      artwork.year
                    ) : (
                      <T
                        textKey="dashboard.artworkDetail.details.notSpecifiedMasculine"
                        fallback="Non indicato"
                      />
                    )}
                  </dd>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                  <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                    <T
                      textKey="dashboard.artworkDetail.details.technique"
                      fallback="Tecnica"
                    />
                  </dt>

                  <dd className="mt-2 text-sm text-neutral-100">
                    {artwork.technique ? (
                      artwork.technique
                    ) : (
                      <T
                        textKey="dashboard.artworkDetail.details.notSpecifiedFeminine"
                        fallback="Non indicata"
                      />
                    )}
                  </dd>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                  <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                    <T
                      textKey="dashboard.artworkDetail.details.textDimensions"
                      fallback="Dimensioni testuali"
                    />
                  </dt>

                  <dd className="mt-2 text-sm text-neutral-100">
                    {artwork.dimensions ? (
                      artwork.dimensions
                    ) : (
                      <T
                        textKey="dashboard.artworkDetail.details.notSpecifiedPlural"
                        fallback="Non indicate"
                      />
                    )}
                  </dd>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 md:col-span-2">
                  <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                    <T
                      textKey="dashboard.artworkDetail.editorDimensions.title"
                      fallback="Dimensioni reali per editor 3D"
                    />
                  </dt>

                  <dd className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                    <div>
                      <span className="block text-neutral-500">
                        <T
                          textKey="dashboard.artworkDetail.editorDimensions.width"
                          fallback="Larghezza"
                        />
                      </span>

                      <span className="mt-1 block text-neutral-100">
                        {formatCmContent(artwork.width_cm)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-neutral-500">
                        <T
                          textKey="dashboard.artworkDetail.editorDimensions.height"
                          fallback="Altezza"
                        />
                      </span>

                      <span className="mt-1 block text-neutral-100">
                        {formatCmContent(artwork.height_cm)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-neutral-500">
                        <T
                          textKey="dashboard.artworkDetail.editorDimensions.depth"
                          fallback="Profondità"
                        />
                      </span>

                      <span className="mt-1 block text-neutral-100">
                        {formatCmContent(artwork.depth_cm)}
                      </span>
                    </div>
                  </dd>

                  <div
                    className={
                      hasRealEditorDimensions(artwork)
                        ? "mt-4 rounded-2xl border border-green-900 bg-green-950/30 p-4"
                        : "mt-4 rounded-2xl border border-yellow-900 bg-yellow-950/30 p-4"
                    }
                  >
                    <p
                      className={
                        hasRealEditorDimensions(artwork)
                          ? "text-sm leading-6 text-green-100"
                          : "text-sm leading-6 text-yellow-100"
                      }
                    >
                      <T
                        textKey="dashboard.artworkDetail.editorDimensions.usedSize"
                        fallback="Dimensione usata dall editor:"
                      />{" "}
                      <span className="font-medium">
                        {getEditorFallbackLabel(artwork)}
                      </span>
                      {!hasRealEditorDimensions(artwork) && (
                        <T
                          textKey="dashboard.artworkDetail.editorDimensions.fallbackNotice"
                          fallback=". Mancando larghezza o altezza, Unity userà il fallback 50 x 50 cm."
                        />
                      )}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                  <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                    <T
                      textKey="dashboard.artworkDetail.details.price"
                      fallback="Prezzo"
                    />
                  </dt>

                  <dd className="mt-2 text-sm text-neutral-100">
                    {formatPriceContent(artwork.price, artwork.currency)}
                  </dd>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                  <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                    <T
                      textKey="dashboard.artworkDetail.details.fileSize"
                      fallback="Peso file"
                    />
                  </dt>

                  <dd className="mt-2 text-sm text-neutral-100">
                    {formatBytes(artwork.file_size_bytes)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                <T
                  textKey="dashboard.artworkDetail.galleries.label"
                  fallback="Allestimenti"
                />
              </p>

              <h2 className="text-2xl font-medium">
                <T
                  textKey="dashboard.artworkDetail.galleries.title"
                  fallback="Gallerie collegate"
                />
              </h2>

              {galleryArtworksError && (
                <div className="mt-5 rounded-2xl border border-red-800 bg-red-950/30 p-4">
                  <p className="text-sm text-red-100">
                    {galleryArtworksError.message}
                  </p>
                </div>
              )}

              {!galleryArtworksError && linkedGalleries.length === 0 && (
                <p className="mt-4 text-sm leading-7 text-neutral-400">
                  <T
                    textKey="dashboard.artworkDetail.galleries.empty"
                    fallback="Questa opera non e ancora collegata a nessuna galleria."
                  />
                </p>
              )}

              {linkedGalleries.length > 0 && (
                <div className="mt-5 space-y-3">
                  {linkedGalleries.map(({ relation, gallery }) => (
                    <article
                      key={relation.id}
                      className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                        <div>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getGalleryStatusBadgeClass(
                              gallery.status
                            )}`}
                          >
                            <T
  textKey={getGalleryStatusTranslation(gallery.status).textKey}
  fallback={getGalleryStatusTranslation(gallery.status).fallback}
/>
                          </span>

                          <p className="mt-3 text-sm font-medium text-neutral-100">
                            {gallery.title}
                          </p>

                          <p className="mt-1 break-all text-xs text-neutral-500">
                            /gallerie/{gallery.slug}
                          </p>

                          <dl className="mt-3 grid gap-2 text-xs text-neutral-500 md:grid-cols-3">
                            <div>
                              <dt>
                                <T
                                  textKey="dashboard.artworkDetail.galleries.wall"
                                  fallback="Wall"
                                />
                              </dt>

                              <dd className="mt-1 text-neutral-300">
                                {relation.wall_key || "-"}
                              </dd>
                            </div>

                            <div>
                              <dt>
                                <T
                                  textKey="dashboard.artworkDetail.galleries.position"
                                  fallback="Posizione"
                                />
                              </dt>

                              <dd className="mt-1 text-neutral-300">
                                {formatNumber(relation.position_x)},{" "}
                                {formatNumber(relation.position_y)},{" "}
                                {formatNumber(relation.position_z)}
                              </dd>
                            </div>

                            <div>
                              <dt>
                                <T
                                  textKey="dashboard.artworkDetail.galleries.rotation"
                                  fallback="Rotazione"
                                />
                              </dt>

                              <dd className="mt-1 text-neutral-300">
                                {formatNumber(relation.rotation_x)},{" "}
                                {formatNumber(relation.rotation_y)},{" "}
                                {formatNumber(relation.rotation_z)}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <a
                            href={`/dashboard/gallerie/${gallery.id}`}
                            className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                          >
                            <T
                              textKey="dashboard.artworkDetail.galleries.manage"
                              fallback="Gestisci"
                            />
                          </a>

                          <a
                            href={`/dashboard/gallerie-editor/${gallery.id}`}
                            className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                          >
                            <T
                              textKey="dashboard.artworkDetail.galleries.editor"
                              fallback="Editor"
                            />
                          </a>

                          {gallery.status === "published" && (
                            <a
                              href={`/gallerie/${gallery.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                            >
                              <T
                                textKey="dashboard.artworkDetail.galleries.open"
                                fallback="Apri"
                              />
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                <T
                  textKey="dashboard.artworkDetail.technical.label"
                  fallback="Dati tecnici"
                />
              </p>

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-neutral-500">
                    <T
                      textKey="dashboard.artworkDetail.technical.id"
                      fallback="ID"
                    />
                  </dt>

                  <dd className="mt-1 break-all text-neutral-200">
                    {artwork.id}
                  </dd>
                </div>

                <div>
                  <dt className="text-neutral-500">
                    <T
                      textKey="dashboard.artworkDetail.technical.storagePath"
                      fallback="Storage path"
                    />
                  </dt>

                  <dd className="mt-1 break-all text-neutral-200">
                    {artwork.storage_path || "-"}
                  </dd>
                </div>

                <div>
                  <dt className="text-neutral-500">
                    <T
                      textKey="dashboard.artworkDetail.technical.imageUrl"
                      fallback="Image URL"
                    />
                  </dt>

                  <dd className="mt-1 break-all text-neutral-200">
                    {artwork.image_url}
                  </dd>
                </div>

                <div>
                  <dt className="text-neutral-500">
                    <T
                      textKey="dashboard.artworkDetail.technical.createdAt"
                      fallback="Creata"
                    />
                  </dt>

                  <dd className="mt-1 text-neutral-200">
                    {formatDate(artwork.created_at)}
                  </dd>
                </div>

                <div>
                  <dt className="text-neutral-500">
                    <T
                      textKey="dashboard.artworkDetail.technical.updatedAt"
                      fallback="Aggiornata"
                    />
                  </dt>

                  <dd className="mt-1 text-neutral-200">
                    {formatDate(artwork.updated_at)}
                  </dd>
                </div>
              </dl>
            </div>

            {isOwner && (
              <DeleteArtworkButton
                artworkId={artwork.id}
                artworkTitle={artwork.title}
              />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}