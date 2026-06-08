import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import CreateGalleryForm from "@/components/dashboard/CreateGalleryForm";
import DataErrorCard from "@/components/system/DataErrorCard";
import EmptyStateCard from "@/components/system/EmptyStateCard";
import { getErrorMessage } from "@/lib/system/getErrorMessage";
import {
  canCreateGallery,
  canUseTemplateByPlan,
  getPlanLimits,
  normalizePlanName,
} from "@/lib/plans";

type DashboardGalleriesPageProps = {
  searchParams?: Promise<{
    status?: string;
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

type GalleryStatus = "draft" | "published" | "archived";

type GalleryTemplate = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unity_scene_key: string;
  is_free: boolean;
  max_artworks: number;
  available_from_plan: string | null;
  preview_image_url: string | null;
  is_featured: boolean;
  sort_order: number;
};

type Gallery = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: GalleryStatus;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  template_id: string | null;
};

type StatusFilter = "all" | GalleryStatus;

function normalizeStatusFilter(value: string | undefined): StatusFilter {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }

  return "all";
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

function getFilterHref(status: StatusFilter) {
  if (status === "all") {
    return "/dashboard/gallerie";
  }

  return `/dashboard/gallerie?status=${status}`;
}

function getFilterLabel(status: StatusFilter) {
  if (status === "published") {
    return "Pubblicate";
  }

  if (status === "archived") {
    return "Archiviate";
  }

  if (status === "draft") {
    return "Bozze";
  }

  return "Tutte";
}

function getTemplatePlanLabel(value: string | null | undefined) {
  if (value === "institution") {
    return "Institution";
  }

  if (value === "business") {
    return "Business";
  }

  if (value === "pro") {
    return "Pro";
  }

  return "Free";
}

export default async function DashboardGalleriesPage({
  searchParams,
}: DashboardGalleriesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedStatus = normalizeStatusFilter(resolvedSearchParams.status);

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

  const canManageGalleries =
    profile.role === "gallerist" || profile.role === "admin";

  if (!canManageGalleries) {
    return (
      <DashboardShell
        title="Area riservata ai galleristi"
        subtitle={`Il tuo ruolo attuale e ${profile.role}. Per creare e gestire gallerie devi avere il ruolo gallerista.`}
        activeSection="gallerie"
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

  const { data: templates, error: templatesError } = await supabase
    .from("gallery_templates")
    .select(
  "id, name, slug, description, unity_scene_key, is_free, max_artworks, available_from_plan, preview_image_url, is_featured, sort_order"
)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
.order("created_at", { ascending: true });

  const { data: galleries, error: galleriesError } = await supabase
    .from("galleries")
    .select(
      "id, title, slug, description, status, cover_image_url, created_at, updated_at, published_at, template_id"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const safeTemplates = (templates || []) as GalleryTemplate[];
  const safeGalleries = (galleries || []) as Gallery[];

  const availableTemplates = safeTemplates.filter((template) => {
    const byPlan = canUseTemplateByPlan(
      plan,
      template.available_from_plan || "free"
    );

    return byPlan.allowed;
  });

  const lockedTemplates = safeTemplates.filter((template) => {
    const byPlan = canUseTemplateByPlan(
      plan,
      template.available_from_plan || "free"
    );

    return !byPlan.allowed;
  });

  const galleryCreateCheck = canCreateGallery(plan, safeGalleries.length);

  const visibleGalleries =
    selectedStatus === "all"
      ? safeGalleries
      : safeGalleries.filter((gallery) => gallery.status === selectedStatus);

  const draftCount = safeGalleries.filter(
    (gallery) => gallery.status === "draft"
  ).length;

  const publishedCount = safeGalleries.filter(
    (gallery) => gallery.status === "published"
  ).length;

  const archivedCount = safeGalleries.filter(
    (gallery) => gallery.status === "archived"
  ).length;

  const filters: Array<{
    status: StatusFilter;
    count: number;
  }> = [
    {
      status: "all",
      count: safeGalleries.length,
    },
    {
      status: "draft",
      count: draftCount,
    },
    {
      status: "published",
      count: publishedCount,
    },
    {
      status: "archived",
      count: archivedCount,
    },
  ];

  return (
    <DashboardShell
      title="Le tue gallerie"
      subtitle="Crea, gestisci, pubblica e archivia le tue gallerie virtuali. Ogni galleria puo essere modificata nell editor Unity WebGL."
      activeSection="gallerie"
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
      {(templatesError || galleriesError) && (
        <div className="mb-6">
          <DataErrorCard
            title="Non riesco a caricare le gallerie"
            message="Una o piu query verso Supabase non hanno risposto correttamente. Puoi ricaricare la pagina oppure tornare alla dashboard."
            details={[
              getErrorMessage(templatesError, ""),
              getErrorMessage(galleriesError, ""),
            ]
              .filter(Boolean)
              .join(" | ")}
            actionHref="/dashboard/gallerie"
            actionLabel="Ricarica gallerie"
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
              Gallerie create: {safeGalleries.length} /{" "}
              {limits.maxGalleries === null ? "Illimitato" : limits.maxGalleries}
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              Template disponibili per il tuo piano:{" "}
              <span className="text-neutral-200">
                {availableTemplates.length}
              </span>
              {lockedTemplates.length > 0 && (
                <>
                  {" "}
                  · Template bloccati da upgrade:{" "}
                  <span className="text-neutral-400">
                    {lockedTemplates.length}
                  </span>
                </>
              )}
            </p>

            <p className="mt-1 text-xs leading-5 text-neutral-600">
              I template sono filtrati tramite il campo{" "}
              <span className="text-neutral-400">available_from_plan</span>.
            </p>
          </div>

          {!galleryCreateCheck.allowed && (
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
        <CreateGalleryForm
          templates={availableTemplates}
          plan={plan}
          currentGalleryCount={safeGalleries.length}
          maxGalleries={limits.maxGalleries}
          canCreate={galleryCreateCheck.allowed}
          limitMessage={
            galleryCreateCheck.reason ||
            `Hai raggiunto il limite di gallerie del piano ${limits.label}.`
          }
        />

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Archivio
              </p>

              <h2 className="text-2xl font-medium">Gallerie create</h2>
            </div>

            <p className="text-sm text-neutral-500">
              Totale: {safeGalleries.length}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isActive = selectedStatus === filter.status;

              return (
                <a
                  key={filter.status}
                  href={getFilterHref(filter.status)}
                  className={
                    isActive
                      ? "rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950"
                      : "rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-100"
                  }
                >
                  {getFilterLabel(filter.status)}{" "}
                  <span
                    className={isActive ? "text-neutral-700" : "text-neutral-600"}
                  >
                    {filter.count}
                  </span>
                </a>
              );
            })}
          </div>

          {!galleriesError && safeGalleries.length === 0 && (
            <div className="mt-8">
              <EmptyStateCard
                eyebrow="Archivio vuoto"
                title="Non hai ancora creato gallerie"
                message="Usa il form di creazione per generare la prima bozza. Potrai poi aggiungere opere, cover, template e pubblicarla."
              />
            </div>
          )}

          {!galleriesError &&
            safeGalleries.length > 0 &&
            visibleGalleries.length === 0 && (
              <div className="mt-8">
                <EmptyStateCard
                  eyebrow="Filtro vuoto"
                  title="Nessuna galleria in questa categoria"
                  message="Cambia filtro oppure crea una nuova galleria. Le gallerie non sono state eliminate: non rientrano nel filtro selezionato."
                  actionHref="/dashboard/gallerie"
                  actionLabel="Mostra tutte"
                />
              </div>
            )}

          {visibleGalleries.length > 0 && (
            <div className="mt-6 space-y-4">
              {visibleGalleries.map((gallery) => {
                const template = safeTemplates.find(
                  (item) => item.id === gallery.template_id
                );

                return (
                  <article
                    key={gallery.id}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-medium">
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

                        <p className="mt-2 text-sm text-neutral-500">
                          Template: {template?.name || "Template non trovato"}
                        </p>

                        {template && (
                          <p className="mt-1 text-xs text-neutral-600">
                            Piano minimo template:{" "}
                            {getTemplatePlanLabel(
                              template.available_from_plan || "free"
                            )}{" "}
                            · Unity key: {template.unity_scene_key}
                          </p>
                        )}

                        {gallery.description && (
                          <p className="mt-3 text-sm leading-6 text-neutral-400">
                            {gallery.description}
                          </p>
                        )}

                        <dl className="mt-4 space-y-1 text-xs text-neutral-500">
                          <div>
                            <dt className="inline">Slug: </dt>
                            <dd className="inline">{gallery.slug}</dd>
                          </div>

                          <div>
                            <dt className="inline">Creata: </dt>
                            <dd className="inline">
                              {new Date(gallery.created_at).toLocaleString(
                                "it-IT"
                              )}
                            </dd>
                          </div>

                          {gallery.published_at && (
                            <div>
                              <dt className="inline">Pubblicata: </dt>
                              <dd className="inline">
                                {new Date(gallery.published_at).toLocaleString(
                                  "it-IT"
                                )}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <a
                          href={`/dashboard/gallerie/${gallery.id}`}
                          className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                        >
                          Gestisci
                        </a>

                        {gallery.status === "published" ? (
                          <a
                            href={`/gallerie/${gallery.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                          >
                            Viewer pubblico
                          </a>
                        ) : (
                          <a
                            href={`/unity-frame?galleryId=${gallery.id}&mode=visitor`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                          >
                            Anteprima visitor
                          </a>
                        )}

                        <a
                          href={`/dashboard/gallerie-editor/${gallery.id}`}
                          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                        >
                          Editor Unity
                        </a>

                        <a
                          href={`/api/unity/galleries/${gallery.id}?mode=editor`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-neutral-800 px-4 py-2 text-sm text-neutral-500 transition hover:border-neutral-600 hover:text-neutral-300"
                        >
                          JSON Unity
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {lockedTemplates.length > 0 && (
        <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Template bloccati
          </p>

          <h2 className="text-2xl font-medium">
            Template disponibili con upgrade
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
            Questi template esistono nel registry e sono attivi, ma richiedono
            un piano superiore rispetto al tuo piano attuale.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {lockedTemplates.map((template) => (
              <article
                key={template.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                  Richiede {getTemplatePlanLabel(template.available_from_plan)}
                </p>

                <h3 className="mt-3 text-lg font-medium text-neutral-100">
                  {template.name}
                </h3>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  {template.description || "Nessuna descrizione disponibile."}
                </p>

                <dl className="mt-4 space-y-1 text-xs text-neutral-500">
                  <div>
                    <dt className="inline">Unity key: </dt>
                    <dd className="inline break-all">
                      {template.unity_scene_key}
                    </dd>
                  </div>

                  <div>
                    <dt className="inline">Max opere: </dt>
                    <dd className="inline">{template.max_artworks}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <a
            href="/pricing"
            className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            Vedi piani e upgrade
          </a>
        </section>
      )}
    </DashboardShell>
  );
}