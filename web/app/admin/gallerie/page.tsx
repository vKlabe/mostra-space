import AdminGalleryControls from "@/components/admin/AdminGalleryControls";
import AdminGalleryDeleteButton from "@/components/admin/AdminGalleryDeleteButton";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import PublicGalleryShowcaseForm from "@/components/admin/PublicGalleryShowcaseForm";

type GalleryStatus = "draft" | "published" | "archived";

type Gallery = {
  id: string;
  owner_id: string;
  template_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: GalleryStatus;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string | null;
  published_at: string | null;
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "diamond" | "institution";
};

type GalleryArtwork = {
  id: string;
  gallery_id: string;
};

type Inquiry = {
  id: string;
  gallery_id: string;
  status: "new" | "read" | "closed";
};

type Template = {
  id: string;
  name: string;
  slug: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("it-IT");
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

function getStatusBadgeClass(status: GalleryStatus) {
  if (status === "published") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "archived") {
    return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-400";
}

function getPlanLabel(plan?: string | null) {
  if (plan === "institution") {
    return "Institution";
  }

  if (plan === "diamond") {
    return "Diamond";
  }

  if (plan === "business") {
    return "Business";
  }

  if (plan === "pro") {
    return "Pro";
  }

  return "Free";
}

function getOwnerDisplayName(profile: Profile | undefined) {
  if (!profile) {
    return "Proprietario non trovato";
  }

  return profile.display_name || profile.full_name || profile.email || "Utente";
}

export default async function AdminGalleriesPage() {
  const { admin } = await requireAdmin();

  const [
    galleriesResult,
    profilesResult,
    galleryArtworksResult,
    inquiriesResult,
    templatesResult,
  ] = await Promise.all([
    admin
      .from("galleries")
      .select(
        "id, owner_id, template_id, title, slug, description, status, cover_image_url, created_at, updated_at, published_at"
      )
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, email, display_name, full_name, role, plan"),
    admin.from("gallery_artworks").select("id, gallery_id"),
    admin.from("gallery_inquiries").select("id, gallery_id, status"),
    admin.from("gallery_templates").select("id, name, slug"),
  ]);

  const galleries = (galleriesResult.data || []) as Gallery[];
  const profiles = (profilesResult.data || []) as Profile[];
  const galleryArtworks = (galleryArtworksResult.data ||
    []) as GalleryArtwork[];
  const inquiries = (inquiriesResult.data || []) as Inquiry[];
  const templates = (templatesResult.data || []) as Template[];

  const publishedCount = galleries.filter(
    (gallery) => gallery.status === "published"
  ).length;

  const draftCount = galleries.filter(
    (gallery) => gallery.status === "draft"
  ).length;

  const archivedCount = galleries.filter(
    (gallery) => gallery.status === "archived"
  ).length;

  const totalLinkedArtworks = galleryArtworks.length;
  const totalInquiries = inquiries.length;

  return (
    <AdminShell
      title="Gallerie"
      subtitle="Controlla tutte le gallerie create sulla piattaforma, verifica proprietari, stato, opere collegate, richieste ricevute e modera la pubblicazione."
      activeSection="galleries"
    >
      {(galleriesResult.error ||
        profilesResult.error ||
        galleryArtworksResult.error ||
        inquiriesResult.error ||
        templatesResult.error) && (
        <div className="mb-6 rounded-3xl border border-red-800 bg-red-950/30 p-6">
          <p className="text-lg font-medium">Errore caricamento gallerie</p>

          {galleriesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Galleries: {galleriesResult.error.message}
            </p>
          )}

          {profilesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Profiles: {profilesResult.error.message}
            </p>
          )}

          {galleryArtworksResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Gallery artworks: {galleryArtworksResult.error.message}
            </p>
          )}

          {inquiriesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Inquiries: {inquiriesResult.error.message}
            </p>
          )}

          {templatesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Templates: {templatesResult.error.message}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Totale
          </p>

          <p className="text-4xl font-semibold">{galleries.length}</p>

          <p className="mt-3 text-sm text-neutral-400">
            Gallerie create
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Pubblicate
          </p>

          <p className="text-4xl font-semibold">{publishedCount}</p>

          <p className="mt-3 text-sm text-neutral-400">
            Visibili sul sito
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Bozze
          </p>

          <p className="text-4xl font-semibold">{draftCount}</p>

          <p className="mt-3 text-sm text-neutral-400">
            Non pubbliche
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Archiviate
          </p>

          <p className="text-4xl font-semibold">{archivedCount}</p>

          <p className="mt-3 text-sm text-neutral-400">
            Sospese
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Interazioni
          </p>

          <p className="text-4xl font-semibold">{totalInquiries}</p>

          <p className="mt-3 text-sm text-neutral-400">
            {totalLinkedArtworks} opere collegate
          </p>
        </article>
      </div>

      <PublicGalleryShowcaseForm />

      <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Moderazione
            </p>

            <h2 className="text-2xl font-medium">
              Tutte le gallerie
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
              Da qui puoi pubblicare, riportare in bozza, archiviare o cancellare
              definitivamente una galleria. Usa la cancellazione solo per duplicati,
              test o contenuti creati per errore.
            </p>
          </div>

          <a
            href="/gallerie"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Vedi sito pubblico
          </a>
        </div>

        {galleries.length === 0 && (
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <p className="text-neutral-300">
              Non ci sono ancora gallerie create.
            </p>
          </div>
        )}

        {galleries.length > 0 && (
          <div className="mt-6 space-y-4">
            {galleries.map((gallery) => {
              const owner = profiles.find(
                (profile) => profile.id === gallery.owner_id
              );

              const template = templates.find(
                (item) => item.id === gallery.template_id
              );

              const artworkCount = galleryArtworks.filter(
                (item) => item.gallery_id === gallery.id
              ).length;

              const galleryInquiries = inquiries.filter(
                (item) => item.gallery_id === gallery.id
              );

              const newInquiries = galleryInquiries.filter(
                (item) => item.status === "new"
              ).length;

              return (
                <article
                  key={gallery.id}
                  className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950"
                >
                  <div className="grid gap-0 xl:grid-cols-[260px_1fr_360px]">
                    <div className="min-h-[220px] bg-neutral-900">
                      {gallery.cover_image_url ? (
                        <img
                          src={gallery.cover_image_url}
                          alt={gallery.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-[220px] items-center justify-center px-6 text-center text-sm text-neutral-600">
                          Cover non disponibile
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getStatusBadgeClass(
                            gallery.status
                          )}`}
                        >
                          {getStatusLabel(gallery.status)}
                        </span>

                        {template && (
                          <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-400">
                            {template.name}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 text-2xl font-medium">
                        {gallery.title}
                      </h3>

                      <p className="mt-2 break-all text-sm text-neutral-500">
                        /gallerie/{gallery.slug}
                      </p>

                      {gallery.description && (
                        <p className="mt-4 line-clamp-3 text-sm leading-7 text-neutral-400">
                          {gallery.description}
                        </p>
                      )}

                      <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                          Proprietario
                        </p>

                        <p className="mt-2 text-sm font-medium text-neutral-100">
                          {getOwnerDisplayName(owner)}
                        </p>

                        <p className="mt-1 break-all text-xs text-neutral-500">
                          {owner?.email || "Email non trovata"}
                        </p>

                        {owner && (
                          <p className="mt-2 text-xs text-neutral-600">
                            Ruolo: {owner.role} · Piano: {getPlanLabel(owner.plan)}
                          </p>
                        )}
                      </div>

                      <dl className="mt-5 grid gap-3 text-sm md:grid-cols-4">
                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Opere
                          </dt>
                          <dd className="mt-2 text-xl font-semibold text-neutral-100">
                            {artworkCount}
                          </dd>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Richieste
                          </dt>
                          <dd className="mt-2 text-xl font-semibold text-neutral-100">
                            {galleryInquiries.length}
                          </dd>
                          <p className="mt-1 text-xs text-neutral-500">
                            {newInquiries} nuove
                          </p>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Creata
                          </dt>
                          <dd className="mt-2 text-xs leading-5 text-neutral-300">
                            {formatDate(gallery.created_at)}
                          </dd>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Pubblicata
                          </dt>
                          <dd className="mt-2 text-xs leading-5 text-neutral-300">
                            {formatDate(gallery.published_at)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <a
                          href={`/dashboard/gallerie/${gallery.id}`}
                          className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                        >
                          Gestisci
                        </a>

                        <a
                          href={`/dashboard/gallerie-editor/${gallery.id}`}
                          className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                        >
                          Editor
                        </a>

                        <a
                          href={`/api/unity/galleries/${gallery.id}?mode=editor`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-500 transition hover:border-neutral-600 hover:text-neutral-300"
                        >
                          JSON
                        </a>

                        {gallery.status === "published" && (
                          <a
                            href={`/gallerie/${gallery.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                          >
                            Pubblica
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-neutral-800 p-5 xl:border-l xl:border-t-0">
                      <AdminGalleryControls
                        galleryId={gallery.id}
                        currentStatus={gallery.status}
                      />

                      <div className="mt-4 rounded-2xl border border-yellow-900 bg-yellow-950/20 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-yellow-300">
                          Nota moderazione
                        </p>

                        <p className="mt-2 text-sm leading-6 text-yellow-100/80">
                          Archiviare una galleria la rimuove dal pubblico senza
                          cancellare dati, opere o richieste. E la scelta piu
                          sicura per sospendere contenuti.
                        </p>
                      </div>

                      <AdminGalleryDeleteButton
                        galleryId={gallery.id}
                        galleryTitle={gallery.title}
                      />
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