import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import CreateGalleryForm from "@/components/dashboard/CreateGalleryForm";
import DataErrorCard from "@/components/system/DataErrorCard";
import EmptyStateCard from "@/components/system/EmptyStateCard";
import T from "@/components/i18n/T";
import { getErrorMessage } from "@/lib/system/getErrorMessage";
import {
  canCreateGallery,
  canUseTemplateByPlan,
  getPlanLimits,
  getTemplateAccessPlanLabel,
  isMarketplaceTemplate,
  normalizePlanName,
  type PlanName,
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
  plan: PlanName;
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
  is_purchased_template?: boolean;
};

type TemplatePurchase = {
  template_id: string;
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

function getTemplatePlanLabel(
  value: string | null | undefined,
  isPurchased?: boolean
) {
  if (isMarketplaceTemplate(value)) {
    return isPurchased ? "Marketplace acquistato" : "Marketplace";
  }

  return getTemplateAccessPlanLabel(value || "free");
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
          <T
            textKey="dashboard.galleries.actions.backToDashboard"
            fallback="Torna alla dashboard"
          />
        </a>
      </DashboardShell>
    );
  }

  const isAdmin = profile.role === "admin";
  const plan = normalizePlanName(profile.plan);
  const limits = getPlanLimits(plan);

  const [templatesResult, galleriesResult, purchasesResult] =
    await Promise.all([
      supabase
        .from("gallery_templates")
        .select(
          "id, name, slug, description, unity_scene_key, is_free, max_artworks, available_from_plan, preview_image_url, is_featured, sort_order"
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),

      supabase
        .from("galleries")
        .select(
          "id, title, slug, description, status, cover_image_url, created_at, updated_at, published_at, template_id"
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("gallery_template_purchases")
        .select("template_id")
        .eq("user_id", user.id)
        .eq("status", "paid"),
    ]);

  const purchasedTemplateIds = new Set(
    ((purchasesResult.data || []) as unknown as TemplatePurchase[]).map(
      (purchase) => purchase.template_id
    )
  );

  const safeTemplates = (
    (templatesResult.data || []) as unknown as GalleryTemplate[]
  ).map((template) => ({
    ...template,
    is_purchased_template: purchasedTemplateIds.has(template.id),
  }));

  const safeGalleries = (galleriesResult.data || []) as unknown as Gallery[];

  const availableTemplates = safeTemplates.filter((template) => {
    const byPlan = canUseTemplateByPlan(
      plan,
      template.available_from_plan || "free"
    );

    return isAdmin || byPlan.allowed || template.is_purchased_template === true;
  });

  const lockedTemplates = safeTemplates.filter((template) => {
    if (isAdmin || template.is_purchased_template) {
      return false;
    }

    const byPlan = canUseTemplateByPlan(
      plan,
      template.available_from_plan || "free"
    );

    return !byPlan.allowed;
  });

  const purchasedMarketplaceTemplates = safeTemplates.filter(
    (template) =>
      template.is_purchased_template &&
      isMarketplaceTemplate(template.available_from_plan)
  );

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
      subtitle="Crea, gestisci, pubblica e archivia le tue gallerie virtuali. Ogni galleria puo essere modificata nell'editor."
      activeSection="gallerie"
      actions={
        <div className="flex flex-wrap gap-3">
          <a
            href="/marketplace"
            className="rounded-full border border-amber-800 px-5 py-2 text-sm text-amber-200 transition hover:border-amber-500"
          >
            <T
              textKey="dashboard.galleries.actions.marketplace"
              fallback="Marketplace"
            />
          </a>

          <a
            href="/dashboard/eventi"
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            <T
              textKey="dashboard.galleries.actions.events"
              fallback="Eventi"
            />
          </a>

          <a
            href="/gallerie"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="dashboard.galleries.actions.publicList"
              fallback="Elenco pubblico"
            />
          </a>
        </div>
      }
    >
      {(templatesResult.error ||
        galleriesResult.error ||
        purchasesResult.error) && (
        <div className="mb-6">
          <DataErrorCard
            title="Non riesco a caricare le gallerie"
            message="Una o piu query verso Supabase non hanno risposto correttamente. Puoi ricaricare la pagina oppure tornare alla dashboard."
            details={[
              getErrorMessage(templatesResult.error, ""),
              getErrorMessage(galleriesResult.error, ""),
              getErrorMessage(purchasesResult.error, ""),
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
              <T
                textKey="dashboard.galleries.planLimits.label"
                fallback="Limiti piano"
              />
            </p>

            <h2 className="text-2xl font-medium">{limits.label}</h2>

            <p className="mt-2 text-sm text-neutral-400">
              <T
                textKey="dashboard.galleries.planLimits.createdGalleries"
                fallback="Gallerie create:"
              />{" "}
              {safeGalleries.length} /{" "}
              {limits.maxGalleries === null ? (
                <T
                  textKey="dashboard.galleries.planLimits.unlimited"
                  fallback="Illimitato"
                />
              ) : (
                limits.maxGalleries
              )}
            </p>

            <p className="mt-1 text-sm text-neutral-500">
              <T
                textKey="dashboard.galleries.planLimits.availableTemplates"
                fallback="Template disponibili per te:"
              />{" "}
              <span className="text-neutral-200">
                {availableTemplates.length}
              </span>

              {purchasedMarketplaceTemplates.length > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <T
                    textKey="dashboard.galleries.planLimits.purchasedMarketplace"
                    fallback="Marketplace acquistati:"
                  />{" "}
                  <span className="text-amber-200">
                    {purchasedMarketplaceTemplates.length}
                  </span>
                </>
              )}

              {lockedTemplates.length > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <T
                    textKey="dashboard.galleries.planLimits.lockedTemplates"
                    fallback="Template bloccati:"
                  />{" "}
                  <span className="text-neutral-400">
                    {lockedTemplates.length}
                  </span>
                </>
              )}
            </p>

            <p className="mt-1 text-xs leading-5 text-neutral-600">
              <T
                textKey="dashboard.galleries.planLimits.marketplacePersistence"
                fallback="I template marketplace acquistati restano collegati al tuo account e sono disponibili anche se il piano attivo è Free."
              />
            </p>
          </div>

          {!galleryCreateCheck.allowed && (
            <a
              href="/pricing"
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              <T
                textKey="dashboard.galleries.actions.upgradePlan"
                fallback="Passa a un piano superiore"
              />
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
                <T
                  textKey="dashboard.galleries.archive.label"
                  fallback="Archivio"
                />
              </p>

              <h2 className="text-2xl font-medium">
                <T
                  textKey="dashboard.galleries.archive.title"
                  fallback="Gallerie create"
                />
              </h2>
            </div>

            <p className="text-sm text-neutral-500">
              <T
                textKey="dashboard.galleries.archive.total"
                fallback="Totale:"
              />{" "}
              {safeGalleries.length}
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
                    className={
                      isActive ? "text-neutral-700" : "text-neutral-600"
                    }
                  >
                    {filter.count}
                  </span>
                </a>
              );
            })}
          </div>

          {!galleriesResult.error && safeGalleries.length === 0 && (
            <div className="mt-8">
              <EmptyStateCard
                eyebrow="Archivio vuoto"
                title="Non hai ancora creato gallerie"
                message="Usa il form di creazione per generare la prima bozza. Potrai poi aggiungere opere, cover, template e pubblicarla."
              />
            </div>
          )}

          {!galleriesResult.error &&
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
                          <T
                            textKey="dashboard.galleries.gallery.template"
                            fallback="Template:"
                          />{" "}
                          {template?.name ? (
                            template.name
                          ) : (
                            <T
                              textKey="dashboard.galleries.gallery.templateNotFound"
                              fallback="Template non trovato"
                            />
                          )}
                        </p>

                        {template && (
                          <p className="mt-1 text-xs text-neutral-600">
                            <T
                              textKey="dashboard.galleries.gallery.templateAccess"
                              fallback="Accesso template:"
                            />{" "}
                            {getTemplatePlanLabel(
                              template.available_from_plan || "free",
                              template.is_purchased_template
                            )}
                          </p>
                        )}

                        {gallery.description && (
                          <p className="mt-3 text-sm leading-6 text-neutral-400">
                            {gallery.description}
                          </p>
                        )}

                        <dl className="mt-4 space-y-1 text-xs text-neutral-500">
                          <div>
                            <dt className="inline">
                              <T
                                textKey="dashboard.galleries.gallery.slug"
                                fallback="Slug:"
                              />{" "}
                            </dt>
                            <dd className="inline">{gallery.slug}</dd>
                          </div>

                          <div>
                            <dt className="inline">
                              <T
                                textKey="dashboard.galleries.gallery.createdAt"
                                fallback="Creata:"
                              />{" "}
                            </dt>
                            <dd className="inline">
                              {new Date(gallery.created_at).toLocaleString(
                                "it-IT"
                              )}
                            </dd>
                          </div>

                          {gallery.published_at && (
                            <div>
                              <dt className="inline">
                                <T
                                  textKey="dashboard.galleries.gallery.publishedAt"
                                  fallback="Pubblicata:"
                                />{" "}
                              </dt>
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
                          <T
                            textKey="dashboard.galleries.gallery.manage"
                            fallback="Gestisci"
                          />
                        </a>

                        {gallery.status === "published" ? (
                          <a
                            href={`/gallerie/${gallery.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                          >
                            <T
                              textKey="dashboard.galleries.gallery.publicViewer"
                              fallback="Viewer pubblico"
                            />
                          </a>
                        ) : (
                          <a
                            href={`/unity-frame?galleryId=${gallery.id}&mode=visitor`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                          >
                            <T
                              textKey="dashboard.galleries.gallery.visitorPreview"
                              fallback="Anteprima visitor"
                            />
                          </a>
                        )}

                        <a
                          href={`/dashboard/gallerie-editor/${gallery.id}`}
                          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                        >
                          <T
                            textKey="dashboard.galleries.gallery.editor"
                            fallback="Editor"
                          />
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
            <T
              textKey="dashboard.galleries.lockedTemplates.label"
              fallback="Template bloccati"
            />
          </p>

          <h2 className="text-2xl font-medium">
            <T
              textKey="dashboard.galleries.lockedTemplates.title"
              fallback="Template disponibili con upgrade o marketplace"
            />
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
            <T
              textKey="dashboard.galleries.lockedTemplates.description"
              fallback="Questi template esistono nel registry e sono attivi, ma richiedono un piano superiore oppure un acquisto marketplace."
            />
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {lockedTemplates.map((template) => {
              const isMarketplace = isMarketplaceTemplate(
                template.available_from_plan
              );

              return (
                <article
                  key={template.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                >
                  <p
                    className={
                      isMarketplace
                        ? "text-xs uppercase tracking-[0.18em] text-amber-300"
                        : "text-xs uppercase tracking-[0.18em] text-neutral-600"
                    }
                  >
                    {isMarketplace ? (
                      <T
                        textKey="dashboard.galleries.lockedTemplates.marketplace"
                        fallback="Marketplace"
                      />
                    ) : (
                      <>
                        <T
                          textKey="dashboard.galleries.lockedTemplates.requires"
                          fallback="Richiede"
                        />{" "}
                        {getTemplatePlanLabel(template.available_from_plan)}
                      </>
                    )}
                  </p>

                  <h3 className="mt-3 text-lg font-medium text-neutral-100">
                    {template.name}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    {template.description ? (
                      template.description
                    ) : (
                      <T
                        textKey="dashboard.galleries.lockedTemplates.noDescription"
                        fallback="Nessuna descrizione disponibile."
                      />
                    )}
                  </p>

                  <dl className="mt-4 space-y-1 text-xs text-neutral-500">
                    <div>
                      <dt className="inline">
                        <T
                          textKey="dashboard.galleries.lockedTemplates.maxArtworks"
                          fallback="Max opere:"
                        />{" "}
                      </dt>
                      <dd className="inline">{template.max_artworks}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/pricing"
              className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              <T
                textKey="dashboard.galleries.lockedTemplates.viewPlans"
                fallback="Vedi piani e upgrade"
              />
            </a>

            <a
              href="/marketplace"
              className="inline-flex rounded-full border border-amber-800 px-5 py-2 text-sm text-amber-200 transition hover:border-amber-500"
            >
              <T
                textKey="dashboard.galleries.lockedTemplates.goToMarketplace"
                fallback="Vai al marketplace"
              />
            </a>
          </div>
        </section>
      )}
    </DashboardShell>
  );
}