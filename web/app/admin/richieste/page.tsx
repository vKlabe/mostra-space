import AdminInquiryControls from "@/components/admin/AdminInquiryControls";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import LocalDateTime from "@/components/time/LocalDateTime";

type InquiryStatus = "new" | "read" | "closed";

type Inquiry = {
  id: string;
  gallery_id: string;
  artwork_id: string | null;
  name: string;
  email: string;
  message: string | null;
  status: InquiryStatus;
  created_at: string;
  privacy_policy_version: string | null;
  marketing_consent: boolean | null;
};

type Gallery = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
};

type Artwork = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "diamond" | "institution";
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return <LocalDateTime value={value} format="datetime" fallback="-" />;
}

function getStatusLabel(status: InquiryStatus) {
  if (status === "new") {
    return "Nuova";
  }

  if (status === "closed") {
    return "Chiusa";
  }

  return "Letta";
}

function getStatusBadgeClass(status: InquiryStatus) {
  if (status === "new") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "closed") {
    return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-400";
}

function getOwnerDisplayName(profile: Profile | undefined) {
  if (!profile) {
    return "Proprietario non trovato";
  }

  return profile.display_name || profile.full_name || profile.email || "Utente";
}

export default async function AdminInquiriesPage() {
  const { admin } = await requireAdmin();

  const [inquiriesResult, galleriesResult, artworksResult, profilesResult] =
    await Promise.all([
      admin
        .from("gallery_inquiries")
        .select(
          "id, gallery_id, artwork_id, name, email, message, status, created_at, privacy_policy_version, marketing_consent"
        )
        .order("created_at", { ascending: false }),
      admin.from("galleries").select("id, owner_id, title, slug, status"),
      admin.from("artworks").select("id, title, artist_name, year"),
      admin
        .from("profiles")
        .select("id, email, display_name, full_name, role, plan"),
    ]);

  const inquiries = (inquiriesResult.data || []) as Inquiry[];
  const galleries = (galleriesResult.data || []) as Gallery[];
  const artworks = (artworksResult.data || []) as Artwork[];
  const profiles = (profilesResult.data || []) as Profile[];

  const newCount = inquiries.filter((item) => item.status === "new").length;
  const readCount = inquiries.filter((item) => item.status === "read").length;
  const closedCount = inquiries.filter(
    (item) => item.status === "closed"
  ).length;

  const marketingConsentCount = inquiries.filter(
    (item) => item.marketing_consent === true
  ).length;

  return (
    <AdminShell
      title="Richieste"
      subtitle="Vista aggregata di tutte le richieste ricevute dalle gallerie pubbliche della piattaforma."
      activeSection="inquiries"
    >
      {(inquiriesResult.error ||
        galleriesResult.error ||
        artworksResult.error ||
        profilesResult.error) && (
        <div className="mb-6 rounded-3xl border border-red-800 bg-red-950/30 p-6">
          <p className="text-lg font-medium">Errore caricamento richieste</p>

          {inquiriesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Inquiries: {inquiriesResult.error.message}
            </p>
          )}

          {galleriesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Galleries: {galleriesResult.error.message}
            </p>
          )}

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

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Totale
          </p>
          <p className="text-4xl font-semibold">{inquiries.length}</p>
          <p className="mt-3 text-sm text-neutral-400">Richieste ricevute</p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Nuove
          </p>
          <p className="text-4xl font-semibold">{newCount}</p>
          <p className="mt-3 text-sm text-neutral-400">Da gestire</p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Lette
          </p>
          <p className="text-4xl font-semibold">{readCount}</p>
          <p className="mt-3 text-sm text-neutral-400">In lavorazione</p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Chiuse
          </p>
          <p className="text-4xl font-semibold">{closedCount}</p>
          <p className="mt-3 text-sm text-neutral-400">Archiviate</p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Marketing
          </p>
          <p className="text-4xl font-semibold">{marketingConsentCount}</p>
          <p className="mt-3 text-sm text-neutral-400">Consensi facoltativi</p>
        </article>
      </div>

      <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Lead aggregati
            </p>

            <h2 className="text-2xl font-medium">Tutte le richieste</h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
              Da qui puoi controllare tutte le richieste della piattaforma,
              capire da quale galleria arrivano e aggiornare lo stato.
            </p>
          </div>

          <a
            href="/dashboard/richieste"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Vista gallerista
          </a>
        </div>

        {inquiries.length === 0 && (
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <p className="text-neutral-300">Nessuna richiesta ricevuta.</p>
          </div>
        )}

        {inquiries.length > 0 && (
          <div className="mt-6 space-y-4">
            {inquiries.map((inquiry) => {
              const gallery = galleries.find(
                (item) => item.id === inquiry.gallery_id
              );

              const artwork = inquiry.artwork_id
                ? artworks.find((item) => item.id === inquiry.artwork_id)
                : undefined;

              const owner = gallery
                ? profiles.find((item) => item.id === gallery.owner_id)
                : undefined;

              return (
                <article
                  key={inquiry.id}
                  className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getStatusBadgeClass(
                            inquiry.status
                          )}`}
                        >
                          {getStatusLabel(inquiry.status)}
                        </span>

                        {inquiry.marketing_consent && (
                          <span className="rounded-full border border-purple-900 bg-purple-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-purple-300">
                            Marketing ok
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 text-2xl font-medium">
                        {inquiry.name}
                      </h3>

                      <p className="mt-2 break-all text-sm text-neutral-400">
                        {inquiry.email}
                      </p>

                      {inquiry.message && (
                        <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Messaggio
                          </p>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-300">
                            {inquiry.message}
                          </p>
                        </div>
                      )}

                      <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Galleria
                          </p>

                          <p className="mt-2 text-sm font-medium text-neutral-100">
                            {gallery?.title || "Galleria non trovata"}
                          </p>

                          {gallery && (
                            <p className="mt-1 break-all text-xs text-neutral-500">
                              /gallerie/{gallery.slug}
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Opera
                          </p>

                          <p className="mt-2 text-sm font-medium text-neutral-100">
                            {artwork?.title || "Richiesta generale"}
                          </p>

                          {artwork && (
                            <p className="mt-1 text-xs text-neutral-500">
                              {artwork.artist_name || "Artista non indicato"}
                              {artwork.year ? `, ${artwork.year}` : ""}
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Proprietario
                          </p>

                          <p className="mt-2 text-sm font-medium text-neutral-100">
                            {getOwnerDisplayName(owner)}
                          </p>

                          <p className="mt-1 break-all text-xs text-neutral-500">
                            {owner?.email || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {gallery && (
                          <a
                            href={`/gallerie/${gallery.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                          >
                            Apri galleria
                          </a>
                        )}

                        <a
                          href={`mailto:${inquiry.email}`}
                          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                        >
                          Scrivi email
                        </a>
                      </div>
                    </div>

                    <div>
                      <AdminInquiryControls
                        inquiryId={inquiry.id}
                        currentStatus={inquiry.status}
                      />

                      <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                          Dettagli consenso
                        </p>

                        <p className="mt-2 text-sm text-neutral-400">
                          Privacy version:{" "}
                          <span className="text-neutral-200">
                            {inquiry.privacy_policy_version || "-"}
                          </span>
                        </p>

                        <p className="mt-2 text-sm text-neutral-400">
                          Ricevuta:{" "}
                          <span className="text-neutral-200">
                            {formatDate(inquiry.created_at)}
                          </span>
                        </p>
                      </div>
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