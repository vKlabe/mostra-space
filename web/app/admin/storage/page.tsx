import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import LocalDateTime from "@/components/time/LocalDateTime";
import { getArtworkThumbnailUrl } from "@/lib/artworks/imageUrls";

type Artwork = {
  id: string;
  owner_id: string;
  title: string;
  image_url: string;
  thumbnail_url: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "diamond" | "institution";
};

function formatBytes(bytes: number) {
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

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return <LocalDateTime value={value} format="datetime" fallback="-" />;
}

function getOwnerDisplayName(profile: Profile | undefined) {
  if (!profile) {
    return "Proprietario non trovato";
  }

  return profile.display_name || profile.full_name || profile.email || "Utente";
}

function getPlanLabel(plan: string) {
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

export default async function AdminStoragePage() {
  const { admin } = await requireAdmin();

  const [artworksResult, profilesResult] = await Promise.all([
    admin
      .from("artworks")
      .select(
        "id, owner_id, title, image_url, thumbnail_url, storage_path, file_size_bytes, created_at"
      )
      .order("file_size_bytes", { ascending: false }),
    admin
      .from("profiles")
      .select("id, email, display_name, full_name, role, plan"),
  ]);

  const artworks = (artworksResult.data || []) as Artwork[];
  const profiles = (profilesResult.data || []) as Profile[];

  const totalStorageBytes = artworks.reduce(
    (total, artwork) => total + (artwork.file_size_bytes || 0),
    0
  );

  const artworksWithSize = artworks.filter(
    (artwork) => (artwork.file_size_bytes || 0) > 0
  );

  const artworksWithoutSize = artworks.filter(
    (artwork) => !artwork.file_size_bytes || artwork.file_size_bytes <= 0
  );

  const userRows = profiles
    .map((profile) => {
      const userArtworks = artworks.filter(
        (artwork) => artwork.owner_id === profile.id
      );

      const storageBytes = userArtworks.reduce(
        (total, artwork) => total + (artwork.file_size_bytes || 0),
        0
      );

      return {
        profile,
        artworksCount: userArtworks.length,
        storageBytes,
      };
    })
    .sort((a, b) => b.storageBytes - a.storageBytes);

  const topArtworks = artworksWithSize.slice(0, 20);

  return (
    <AdminShell
      title="Storage"
      subtitle="Controlla il peso complessivo delle immagini caricate, gli utenti che consumano piu storage e le opere piu pesanti."
      activeSection="storage"
    >
      {(artworksResult.error || profilesResult.error) && (
        <div className="mb-6 rounded-3xl border border-red-800 bg-red-950/30 p-6">
          <p className="text-lg font-medium">Errore caricamento storage</p>

          {artworksResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Artworks: {artworksResult.error.message}
            </p>
          )}

          {profilesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Profiles: {profilesResult.error.message}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Storage tracciato
          </p>

          <p className="text-4xl font-semibold">
            {formatBytes(totalStorageBytes)}
          </p>

          <p className="mt-3 text-sm text-neutral-400">
            Somma file_size_bytes
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Opere
          </p>

          <p className="text-4xl font-semibold">{artworks.length}</p>

          <p className="mt-3 text-sm text-neutral-400">
            Totale caricate
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Con peso
          </p>

          <p className="text-4xl font-semibold">{artworksWithSize.length}</p>

          <p className="mt-3 text-sm text-neutral-400">
            Storage conteggiabile
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Senza peso
          </p>

          <p className="text-4xl font-semibold">{artworksWithoutSize.length}</p>

          <p className="mt-3 text-sm text-neutral-400">
            Vecchi upload/null
          </p>
        </article>
      </div>

      <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Storage per utente
          </p>

          <h2 className="text-2xl font-medium">Consumo account</h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
            Utile per capire chi sta consumando piu spazio e verificare se i
            limiti dei piani stanno funzionando correttamente.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {userRows.map((row) => (
            <article
              key={row.profile.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-lg font-medium text-neutral-100">
                    {getOwnerDisplayName(row.profile)}
                  </p>

                  <p className="mt-1 break-all text-sm text-neutral-500">
                    {row.profile.email}
                  </p>

                  <p className="mt-2 text-xs text-neutral-600">
                    Ruolo: {row.profile.role} · Piano:{" "}
                    {getPlanLabel(row.profile.plan)}
                  </p>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                      Opere
                    </p>

                    <p className="mt-2 text-2xl font-semibold">
                      {row.artworksCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                      Storage
                    </p>

                    <p className="mt-2 text-2xl font-semibold">
                      {formatBytes(row.storageBytes)}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Opere piu pesanti
          </p>

          <h2 className="text-2xl font-medium">Top file</h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
            Le 20 opere con peso maggiore tra quelle tracciate.
          </p>
        </div>

        {topArtworks.length === 0 && (
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <p className="text-neutral-300">Nessuna opera con peso tracciato.</p>
          </div>
        )}

        {topArtworks.length > 0 && (
          <div className="mt-6 space-y-3">
            {topArtworks.map((artwork) => {
              const owner = profiles.find(
                (profile) => profile.id === artwork.owner_id
              );

              return (
                <article
                  key={artwork.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                >
                  <div className="grid gap-4 md:grid-cols-[90px_1fr_220px] md:items-center">
                    <div className="h-20 w-20 overflow-hidden rounded-2xl bg-neutral-900">
                      <img
                        src={getArtworkThumbnailUrl(artwork)}
                        alt={artwork.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div>
                      <p className="text-lg font-medium text-neutral-100">
                        {artwork.title}
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        {getOwnerDisplayName(owner)}
                      </p>

                      <p className="mt-1 break-all text-xs text-neutral-600">
                        {artwork.storage_path || "storage_path non tracciato"}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-2xl font-semibold">
                        {formatBytes(artwork.file_size_bytes || 0)}
                      </p>

                      <p className="mt-1 text-xs text-neutral-600">
                        {formatDate(artwork.created_at)}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
