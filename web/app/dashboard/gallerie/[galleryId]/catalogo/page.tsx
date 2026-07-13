import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GalleryCatalogBuilder from "@/components/catalog/GalleryCatalogBuilder";

export const dynamic = "force-dynamic";

type CatalogPageProps = {
  params: Promise<{
    galleryId: string;
  }>;
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: "user" | "gallerist" | "admin";
  plan: string | null;
};

type Gallery = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  cover_image_url: string | null;
};

type ArtworkRelation = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
  technique: string | null;
  dimensions: string | null;
  description: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  optimized_url: string | null;
  webgl_url: string | null;
  price: number | string | null;
  currency: string | null;
  is_for_sale: boolean | null;
  is_public: boolean | null;
  width_cm: number | string | null;
  height_cm: number | string | null;
  depth_cm: number | string | null;
};

type GalleryArtworkRow = {
  id: string;
  gallery_id: string;
  artwork_id: string;
  sort_order: number | null;
  artworks: ArtworkRelation | ArtworkRelation[] | null;
};

function normalizeArtworkRelation(
  value: ArtworkRelation | ArtworkRelation[] | null
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getArtworkImageUrl(artwork: ArtworkRelation) {
  return (
    artwork.webgl_url ||
    artwork.optimized_url ||
    artwork.thumbnail_url ||
    artwork.image_url ||
    ""
  );
}

function getAppUrl() {
  const rawUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://mostra.space";

  return rawUrl.replace(/\/$/, "");
}

export default async function GalleryCatalogPage({ params }: CatalogPageProps) {
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
    .select("id, email, display_name, full_name, role, plan")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    redirect("/auth/login");
  }

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("id, owner_id, title, slug, description, status, cover_image_url")
    .eq("id", galleryId)
    .single<Gallery>();

  if (galleryError || !gallery) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
        <section className="mx-auto max-w-4xl rounded-3xl border border-red-900 bg-red-950/30 p-6">
          <p className="text-lg font-medium">Galleria non trovata</p>
          <p className="mt-2 text-sm text-red-100">
            {galleryError?.message || "Non riesco a caricare questa galleria."}
          </p>

          <a
            href="/dashboard/gallerie"
            className="mt-6 inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Torna alle gallerie
          </a>
        </section>
      </main>
    );
  }

  const isAdmin = profile.role === "admin";
  const isOwner = gallery.owner_id === user.id;

  if (!isOwner && !isAdmin) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
        <section className="mx-auto max-w-4xl rounded-3xl border border-red-900 bg-red-950/30 p-6">
          <p className="text-lg font-medium">Accesso negato</p>
          <p className="mt-2 text-sm text-red-100">
            Non puoi creare il catalogo di una galleria che non gestisci.
          </p>

          <a
            href="/dashboard/gallerie"
            className="mt-6 inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Torna alle gallerie
          </a>
        </section>
      </main>
    );
  }

  const { data: galleryArtworks, error: galleryArtworksError } = await supabase
    .from("gallery_artworks")
    .select(
      `
      id,
      gallery_id,
      artwork_id,
      sort_order,
      artworks (
        id,
        title,
        artist_name,
        year,
        technique,
        dimensions,
        description,
        image_url,
        thumbnail_url,
        optimized_url,
        webgl_url,
        price,
        currency,
        is_for_sale,
        is_public,
        width_cm,
        height_cm,
        depth_cm
      )
    `
    )
    .eq("gallery_id", gallery.id)
    .order("sort_order", { ascending: true });

  if (galleryArtworksError) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
        <section className="mx-auto max-w-4xl rounded-3xl border border-red-900 bg-red-950/30 p-6">
          <p className="text-lg font-medium">Errore caricamento opere</p>
          <p className="mt-2 text-sm text-red-100">
            {galleryArtworksError.message}
          </p>

          <a
            href={`/dashboard/gallerie/${gallery.id}`}
            className="mt-6 inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Torna alla galleria
          </a>
        </section>
      </main>
    );
  }

  const safeGalleryArtworks =
  (galleryArtworks || []) as unknown as GalleryArtworkRow[];

  const artworks = safeGalleryArtworks.flatMap((item) => {
  const artwork = normalizeArtworkRelation(item.artworks);

  if (!artwork) {
    return [];
  }

  return [
    {
      galleryArtworkId: item.id,
      artworkId: artwork.id,
      title: artwork.title || "Opera senza titolo",
      artistName: artwork.artist_name || "",
      year: artwork.year || "",
      technique: artwork.technique || "",
      dimensions: artwork.dimensions || "",
      description: artwork.description || "",
      imageUrl: getArtworkImageUrl(artwork),
      price: artwork.price,
      currency: artwork.currency || "EUR",
      isForSale: artwork.is_for_sale === true,
      isPublic: artwork.is_public === true,
      widthCm: toNullableNumber(artwork.width_cm),
      heightCm: toNullableNumber(artwork.height_cm),
      depthCm: toNullableNumber(artwork.depth_cm),
      sortOrder: item.sort_order || 0,
    },
  ];
});

  const appUrl = getAppUrl();
  const publicUrl = `${appUrl}/gallerie/${gallery.slug}`;

  return (
    <GalleryCatalogBuilder
      gallery={{
        id: gallery.id,
        title: gallery.title,
        slug: gallery.slug,
        description: gallery.description,
        coverImageUrl: gallery.cover_image_url,
        status: gallery.status,
        publicUrl,
      }}
      artworks={artworks}
      defaultCuratorName={profile.full_name || profile.display_name || ""}
      defaultContactEmail={profile.email || user.email || ""}
    />
  );
}