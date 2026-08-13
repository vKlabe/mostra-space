import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import T from "@/components/i18n/T";

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type GalleryStatus = "draft" | "published" | "archived";

type FavoriteArtworkRow = {
  artwork_id: string;
  created_at: string;
};

type ArtworkRecord = {
  id: string;
  title: string;
  artist_name: string | null;
  is_public: boolean;
  image_url: string | null;
  thumbnail_url: string | null;
};

type GalleryRelation = {
  id: string;
  title: string;
  slug: string;
  status: GalleryStatus;
};

type ArtworkPlacement = {
  id: string;
  artwork_id: string;
  galleries: GalleryRelation | GalleryRelation[] | null;
};

type FavoriteArtwork = ArtworkRecord & {
  saved_at: string;
  gallery_title: string | null;
  gallery_slug: string | null;
};

function normalizeGalleryRelation(
  value: GalleryRelation | GalleryRelation[] | null
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function AccountFavoriteArtworksPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single<Profile>();

  const { data: favoriteArtworkRowsData } = await admin
    .from("favorite_artworks")
    .select("artwork_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(300);

  const favoriteArtworkRows =
    (favoriteArtworkRowsData || []) as FavoriteArtworkRow[];

  const favoriteArtworkIds = favoriteArtworkRows.map(
    (favorite) => favorite.artwork_id
  );

  let favoriteArtworks: FavoriteArtwork[] = [];

  if (favoriteArtworkIds.length > 0) {
    const { data: favoriteArtworksData } = await admin
      .from("artworks")
      .select("id, title, artist_name, is_public, image_url, thumbnail_url")
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

    const artworkById = new Map(
      ((favoriteArtworksData || []) as ArtworkRecord[]).map((artwork) => [
        artwork.id,
        artwork,
      ])
    );

    const placementByArtworkId = new Map<string, ArtworkPlacement>();

    ((favoriteArtworkPlacementsData || []) as unknown as ArtworkPlacement[])
      .forEach((placement) => {
        const galleries = Array.isArray(placement.galleries)
          ? placement.galleries
          : placement.galleries
            ? [placement.galleries]
            : [];

        const publishedGallery = galleries.find(
          (gallery) => gallery.status === "published"
        );

        if (publishedGallery && !placementByArtworkId.has(placement.artwork_id)) {
          placementByArtworkId.set(placement.artwork_id, {
            ...placement,
            galleries: publishedGallery,
          });
        }
      });

    favoriteArtworks = favoriteArtworkRows
      .map((favorite) => {
        const artwork = artworkById.get(favorite.artwork_id);

        if (!artwork) {
          return null;
        }

        const placement = placementByArtworkId.get(artwork.id);
        const gallery = normalizeGalleryRelation(placement?.galleries || null);

        return {
          ...artwork,
          saved_at: favorite.created_at,
          gallery_title: gallery?.title || null,
          gallery_slug: gallery?.slug || null,
        };
      })
      .filter(Boolean) as FavoriteArtwork[];
  }

  const isCreator = profile?.role === "gallerist" || profile?.role === "admin";

  return (
    <DashboardShell
      title={
        <T
          textKey="account.favoriteArtworks.shell.title"
          fallback="Opere preferite"
        />
      }
      subtitle={
        <T
          textKey="account.favoriteArtworks.shell.subtitle"
          fallback="Tutte le opere che hai salvato visitando le gallerie pubbliche su mostra.space."
        />
      }
      activeSection="account"
      navMode={isCreator ? "creator" : "community"}
      actions={
        <div className="flex flex-wrap gap-3">
          <a
            href="/dashboard"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="account.favoriteArtworks.actions.dashboard"
              fallback="Dashboard"
            />
          </a>

          <a
            href="/gallerie"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="account.favoriteArtworks.actions.exploreGalleries"
              fallback="Esplora gallerie"
            />
          </a>
        </div>
      }
    >
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-amber-500">
              <T
                textKey="account.favoriteArtworks.header.label"
                fallback="Preferiti"
              />
            </p>

            <h2 className="mt-3 font-serif text-3xl text-neutral-50">
              <T
                textKey="account.favoriteArtworks.header.title"
                fallback="La tua collezione salvata"
              />
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
              <T
                textKey="account.favoriteArtworks.header.description"
                fallback="Ritrova qui le opere che hai aggiunto ai preferiti. Puoi riaprire la galleria collegata e tornare al catalogo dell’allestimento."
              />
            </p>
          </div>

          <span className="rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-neutral-300">
            {favoriteArtworks.length} {" "}
            <T
              textKey="account.favoriteArtworks.header.countLabel"
              fallback="opere salvate"
            />
          </span>
        </div>

        {favoriteArtworks.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-xl font-medium text-neutral-100">
              <T
                textKey="account.favoriteArtworks.empty.title"
                fallback="Non hai ancora opere preferite"
              />
            </h3>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-400">
              <T
                textKey="account.favoriteArtworks.empty.description"
                fallback="Apri una galleria pubblica, entra nel catalogo o nella scheda opera e usa il pulsante Salva opera. Le opere che scegli compariranno qui."
              />
            </p>

            <a
              href="/gallerie"
              className="mt-5 inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              <T
                textKey="account.favoriteArtworks.empty.exploreGalleries"
                fallback="Esplora gallerie"
              />
            </a>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {favoriteArtworks.map((artwork) => {
              const imageUrl = artwork.thumbnail_url || artwork.image_url;
              const artworkHref = artwork.gallery_slug
                ? `/gallerie/${artwork.gallery_slug}#catalogo`
                : "/gallerie";

              return (
                <article
                  key={artwork.id}
                  className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 transition hover:border-neutral-600"
                >
                  <a href={artworkHref} className="block">
                    <div className="aspect-[4/3] bg-black">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={artwork.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-xs uppercase tracking-[0.25em] text-neutral-600">
                          <T
                            textKey="account.favoriteArtworks.card.noImage"
                            fallback="No image"
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <h3 className="text-xl font-medium text-neutral-50">
                        {artwork.title}
                      </h3>

                      {artwork.artist_name && (
                        <p className="mt-2 text-sm text-neutral-300">
                          {artwork.artist_name}
                        </p>
                      )}

                      <div className="mt-4 space-y-1 text-xs leading-5 text-neutral-500">
                        {artwork.gallery_title ? (
                          <p>
                            <T
                              textKey="account.favoriteArtworks.card.fromGallery"
                              fallback="Da:"
                            />{" "}
                            <span className="text-neutral-300">
                              {artwork.gallery_title}
                            </span>
                          </p>
                        ) : (
                          <p>
                            <T
                              textKey="account.favoriteArtworks.card.galleryUnavailable"
                              fallback="Galleria non disponibile"
                            />
                          </p>
                        )}

                        <p>
                          <T
                            textKey="account.favoriteArtworks.card.savedAt"
                            fallback="Salvata il"
                          />{" "}
                          {formatDate(artwork.saved_at)}
                        </p>
                      </div>

                      <span className="mt-5 inline-flex rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200 transition group-hover:border-neutral-400">
                        {artwork.gallery_slug ? (
                          <T
                            textKey="account.favoriteArtworks.card.openGallery"
                            fallback="Apri galleria"
                          />
                        ) : (
                          <T
                            textKey="account.favoriteArtworks.card.exploreGalleries"
                            fallback="Esplora gallerie"
                          />
                        )}
                      </span>
                    </div>
                  </a>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
