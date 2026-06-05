import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import PlanUsageCard from "@/components/dashboard/PlanUsageCard";
import { normalizePlanName } from "@/lib/plans";

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

type Artwork = {
  id: string;
  title: string;
  is_public: boolean;
  is_for_sale: boolean;
  file_size_bytes: number | null;
  created_at: string;
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

function getCurrentMonthStart() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
  );
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

  if (!canManage) {
    return (
      <DashboardShell
        title="Benvenuto nel portale"
        subtitle={`Il tuo ruolo attuale e ${profile.role}. Per creare gallerie virtuali, caricare opere e gestire richieste devi avere il ruolo gallerista.`}
        activeSection="dashboard"
        actions={
          <a
            href="/gallerie"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Esplora gallerie pubbliche
          </a>
        }
      >
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-neutral-300">
            Il tuo account non ha ancora accesso agli strumenti da gallerista.
          </p>
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

  const draftGalleries = safeGalleries.filter(
    (gallery) => gallery.status === "draft"
  ).length;

  const publishedGalleries = safeGalleries.filter(
    (gallery) => gallery.status === "published"
  ).length;

  const archivedGalleries = safeGalleries.filter(
    (gallery) => gallery.status === "archived"
  ).length;

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

  return (
    <DashboardShell
      title={`Ciao, ${displayName}`}
      subtitle="Da qui controlli gallerie virtuali, opere, pubblicazioni, limiti piano e richieste ricevute dai visitatori."
      activeSection="dashboard"
      actions={
        <a
          href="/gallerie"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          Elenco pubblico
        </a>
      }
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
            Ruolo account: {profile.role}
          </p>

          <a
            href="/account"
            className="mt-6 inline-flex rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-500 transition hover:border-neutral-600 hover:text-neutral-300"
          >
            Account
          </a>
        </article>
      </div>

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