import AdminShell from "@/components/admin/AdminShell";
import DataErrorCard from "@/components/system/DataErrorCard";
import EmptyStateCard from "@/components/system/EmptyStateCard";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getErrorMessage } from "@/lib/system/getErrorMessage";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "institution";
  created_at: string;
};

type Gallery = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  owner_id: string;
  created_at: string;
  published_at: string | null;
};

type Artwork = {
  id: string;
  title: string;
  owner_id: string;
  file_size_bytes: number | null;
  created_at: string;
};

type Inquiry = {
  id: string;
  name: string;
  email: string;
  status: "new" | "read" | "closed";
  created_at: string;
  gallery_id: string;
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

  return new Date(value).toLocaleString("it-IT");
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

function getRoleBadgeClass(role: string) {
  if (role === "admin") {
    return "border-red-900 bg-red-950/40 text-red-300";
  }

  if (role === "gallerist") {
    return "border-blue-900 bg-blue-950/40 text-blue-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-400";
}

function getGalleryStatusClass(status: string) {
  if (status === "published") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "archived") {
    return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-400";
}

export default async function AdminOverviewPage() {
  const { admin, profile } = await requireAdmin();

  const [
    profilesResult,
    galleriesResult,
    artworksResult,
    inquiriesResult,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, display_name, full_name, role, plan, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("galleries")
      .select("id, title, slug, status, owner_id, created_at, published_at")
      .order("created_at", { ascending: false }),
    admin
      .from("artworks")
      .select("id, title, owner_id, file_size_bytes, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("gallery_inquiries")
      .select("id, name, email, status, created_at, gallery_id")
      .order("created_at", { ascending: false }),
  ]);

  const profiles = (profilesResult.data || []) as Profile[];
  const galleries = (galleriesResult.data || []) as Gallery[];
  const artworks = (artworksResult.data || []) as Artwork[];
  const inquiries = (inquiriesResult.data || []) as Inquiry[];

  const totalStorageBytes = artworks.reduce(
    (total, artwork) => total + (artwork.file_size_bytes || 0),
    0
  );

  const publishedGalleries = galleries.filter(
    (gallery) => gallery.status === "published"
  ).length;

  const draftGalleries = galleries.filter(
    (gallery) => gallery.status === "draft"
  ).length;

  const archivedGalleries = galleries.filter(
    (gallery) => gallery.status === "archived"
  ).length;

  const newInquiries = inquiries.filter(
    (inquiry) => inquiry.status === "new"
  ).length;

  const planCounts = {
    free: profiles.filter((item) => item.plan === "free").length,
    pro: profiles.filter((item) => item.plan === "pro").length,
    business: profiles.filter((item) => item.plan === "business").length,
    institution: profiles.filter((item) => item.plan === "institution").length,
  };

  const latestProfiles = profiles.slice(0, 6);
  const latestGalleries = galleries.slice(0, 6);
  const latestInquiries = inquiries.slice(0, 6);

  const adminName =
    profile.display_name || profile.full_name || profile.email || "Admin";

  const hasAdminDataError =
    profilesResult.error ||
    galleriesResult.error ||
    artworksResult.error ||
    inquiriesResult.error;

  const adminErrorDetails = [
    getErrorMessage(profilesResult.error, ""),
    getErrorMessage(galleriesResult.error, ""),
    getErrorMessage(artworksResult.error, ""),
    getErrorMessage(inquiriesResult.error, ""),
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <AdminShell
      title={`Ciao, ${adminName}`}
      subtitle="Panoramica generale della piattaforma: utenti, gallerie, opere, richieste, storage e piani account."
      activeSection="overview"
    >
      {hasAdminDataError && (
        <div className="mb-6">
          <DataErrorCard
            title="Alcuni dati admin non sono stati caricati"
            message="Una o più query della control room non hanno risposto correttamente. I dati visualizzati potrebbero essere parziali."
            details={adminErrorDetails}
            actionHref="/admin"
            actionLabel="Ricarica admin"
            secondaryHref="/dashboard"
            secondaryLabel="Dashboard"
          />
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Utenti
          </p>
          <p className="text-4xl font-semibold">{profiles.length}</p>
          <p className="mt-3 text-sm text-neutral-400">
            Account registrati
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Gallerie
          </p>
          <p className="text-4xl font-semibold">{galleries.length}</p>
          <p className="mt-3 text-sm text-neutral-400">
            {publishedGalleries} pubblicate · {draftGalleries} bozze ·{" "}
            {archivedGalleries} archiviate
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Opere
          </p>
          <p className="text-4xl font-semibold">{artworks.length}</p>
          <p className="mt-3 text-sm text-neutral-400">
            Caricate dagli utenti
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Richieste
          </p>
          <p className="text-4xl font-semibold">{inquiries.length}</p>
          <p className="mt-3 text-sm text-neutral-400">
            {newInquiries} nuove
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Storage
          </p>
          <p className="text-4xl font-semibold">
            {formatBytes(totalStorageBytes)}
          </p>
          <p className="mt-3 text-sm text-neutral-400">
            Peso immagini tracciato
          </p>
        </article>
      </div>

      <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Piani account
            </p>

            <h2 className="text-2xl font-medium">
              Distribuzione piani
            </h2>
          </div>

          <a
            href="/admin/utenti"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Gestisci utenti
          </a>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {Object.entries(planCounts).map(([plan, count]) => (
            <div
              key={plan}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
            >
              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                {getPlanLabel(plan)}
              </p>

              <p className="mt-3 text-3xl font-semibold">{count}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Ultimi utenti
              </p>
              <h2 className="text-xl font-medium">Registrazioni</h2>
            </div>

            <a
              href="/admin/utenti"
              className="text-sm text-neutral-400 underline-offset-4 hover:text-white hover:underline"
            >
              Tutti
            </a>
          </div>

          <div className="space-y-3">
            {latestProfiles.length === 0 && (
              <EmptyStateCard
                eyebrow="Nessun utente"
                title="Nessuna registrazione recente"
                message="Quando nuovi utenti si registreranno, appariranno qui."
              />
            )}

            {latestProfiles.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getRoleBadgeClass(
                      item.role
                    )}`}
                  >
                    {item.role}
                  </span>

                  <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-400">
                    {getPlanLabel(item.plan)}
                  </span>
                </div>

                <p className="mt-3 text-sm font-medium text-neutral-100">
                  {item.display_name || item.full_name || item.email || "Utente"}
                </p>

                <p className="mt-1 break-all text-xs text-neutral-500">
                  {item.email}
                </p>

                <p className="mt-2 text-xs text-neutral-600">
                  {formatDate(item.created_at)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Ultime gallerie
              </p>
              <h2 className="text-xl font-medium">Spazi creati</h2>
            </div>

            <a
              href="/admin/gallerie"
              className="text-sm text-neutral-400 underline-offset-4 hover:text-white hover:underline"
            >
              Tutte
            </a>
          </div>

          <div className="space-y-3">
            {latestGalleries.length === 0 && (
              <EmptyStateCard
                eyebrow="Nessuna galleria"
                title="Nessuna galleria recente"
                message="Quando gli utenti creeranno nuovi spazi, appariranno qui."
              />
            )}

            {latestGalleries.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
              >
                <span
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getGalleryStatusClass(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>

                <p className="mt-3 text-sm font-medium text-neutral-100">
                  {item.title}
                </p>

                <p className="mt-1 break-all text-xs text-neutral-500">
                  /gallerie/{item.slug}
                </p>

                <p className="mt-2 text-xs text-neutral-600">
                  {formatDate(item.created_at)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Ultime richieste
              </p>
              <h2 className="text-xl font-medium">Lead ricevuti</h2>
            </div>

            <a
              href="/admin/richieste"
              className="text-sm text-neutral-400 underline-offset-4 hover:text-white hover:underline"
            >
              Tutte
            </a>
          </div>

          <div className="space-y-3">
            {latestInquiries.length === 0 && (
              <EmptyStateCard
                eyebrow="Nessuna richiesta"
                title="Nessun lead recente"
                message="Quando arriveranno richieste pubbliche, appariranno qui."
              />
            )}

            {latestInquiries.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
              >
                <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-400">
                  {item.status}
                </span>

                <p className="mt-3 text-sm font-medium text-neutral-100">
                  {item.name}
                </p>

                <p className="mt-1 break-all text-xs text-neutral-500">
                  {item.email}
                </p>

                <p className="mt-2 text-xs text-neutral-600">
                  {formatDate(item.created_at)}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}