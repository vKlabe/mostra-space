import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import T from "@/components/i18n/T";
import AddArtworkToGalleryForm from "@/components/dashboard/AddArtworkToGalleryForm";
import RemoveGalleryArtworkButton from "@/components/dashboard/RemoveGalleryArtworkButton";
import GalleryPublishStatusButton from "@/components/dashboard/GalleryPublishStatusButton";
import EditGalleryDetailsForm from "@/components/dashboard/EditGalleryDetailsForm";
import GalleryCoverUploadForm from "@/components/dashboard/GalleryCoverUploadForm";
import DeleteGalleryButton from "@/components/dashboard/DeleteGalleryButton";
import ChangeGalleryTemplateForm from "@/components/dashboard/ChangeGalleryTemplateForm";
import {
  canAddArtworkToGallery,
  canUseTemplateByPlan,
  getPlanLimits,
  getTemplateAccessPlanLabel,
  isMarketplaceTemplate,
  normalizePlanName,
  type PlanName,
} from "@/lib/plans";
import { validateGalleryForPublish } from "@/lib/gallery/validateGalleryForPublish";

type GalleryDetailPageProps = {
  params: Promise<{
    galleryId: string;
  }>;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: PlanName;
};

type Gallery = {
  id: string;
  owner_id: string;
  template_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

type GalleryTemplate = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unity_scene_key: string;
  is_free: boolean;
  is_active: boolean;
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

type Artwork = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
  image_url: string;
};

type GalleryArtworkRelation = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
  technique: string | null;
  dimensions: string | null;
  image_url: string | null;
  thumbnail_url?: string | null;
  width_cm?: number | string | null;
  height_cm?: number | string | null;
  is_for_sale: boolean;
  is_public: boolean;
};

type GalleryArtworkRow = {
  id: string;
  gallery_id: string;
  artwork_id: string;

  position_x: number;
  position_y: number;
  position_z: number;

  rotation_x: number;
  rotation_y: number;
  rotation_z: number;

  scale_x: number;
  scale_y: number;
  scale_z: number;

  wall_key: string | null;
  sort_order: number;

  display_width_cm?: number | string | null;
  display_height_cm?: number | string | null;

  frame_width_cm?: number | string | null;
  frame_depth_cm?: number | string | null;

  artworks: GalleryArtworkRelation | GalleryArtworkRelation[] | null;
};

type OnboardingStepStatus = "done" | "warning" | "todo";

type OnboardingStep = {
  id: string;
  label: React.ReactNode;
  description: React.ReactNode;
  status: OnboardingStepStatus;
  href?: string;
  actionLabel?: React.ReactNode;
};

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "0";
  }

  return Number(value).toFixed(2);
}

function getStatusTranslation(status: Gallery["status"]) {
  if (status === "published") {
    return {
      textKey: "dashboard.galleryDetail.status.published",
      fallback: "Pubblicata",
    };
  }

  if (status === "archived") {
    return {
      textKey: "dashboard.galleryDetail.status.archived",
      fallback: "Archiviata",
    };
  }

  return {
    textKey: "dashboard.galleryDetail.status.draft",
    fallback: "Bozza",
  };
}

function getStatusBadgeClass(status: Gallery["status"]) {
  if (status === "published") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "archived") {
    return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-400";
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

function getEffectiveLimit(
  planLimit: number | null,
  templateLimit: number | null
) {
  if (planLimit === null && templateLimit === null) {
    return null;
  }

  if (planLimit === null) {
    return templateLimit;
  }

  if (templateLimit === null) {
    return planLimit;
  }

  return Math.min(planLimit, templateLimit);
}

function normalizeArtworkRelation(
  value: GalleryArtworkRelation | GalleryArtworkRelation[] | null
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function getOnboardingStepIcon(status: OnboardingStepStatus) {
  if (status === "done") {
    return "✓";
  }

  if (status === "warning") {
    return "!";
  }

  return "•";
}

function getOnboardingStepClass(status: OnboardingStepStatus) {
  if (status === "done") {
    return "border-green-900 bg-green-950/30";
  }

  if (status === "warning") {
    return "border-yellow-900 bg-yellow-950/30";
  }

  return "border-neutral-800 bg-neutral-950";
}

function getOnboardingIconClass(status: OnboardingStepStatus) {
  if (status === "done") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "warning") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  return "border-neutral-700 bg-neutral-900 text-neutral-500";
}

function buildOnboardingSteps({
  gallery,
  totalArtworks,
  positionedArtworks,
  unpositionedArtworks,
  artworksWithoutDimensions,
  canPublish,
}: {
  gallery: Gallery;
  totalArtworks: number;
  positionedArtworks: number;
  unpositionedArtworks: number;
  artworksWithoutDimensions: number;
  canPublish: boolean;
}): OnboardingStep[] {
  const hasTitle = gallery.title.trim().length > 0;
  const hasCover =
    Boolean(gallery.cover_image_url) &&
    gallery.cover_image_url !== null &&
    gallery.cover_image_url.trim().length > 0;

  return [
    {
      id: "gallery-created",
      label: (
        <T
          textKey="dashboard.galleryDetail.steps.galleryCreated.label"
          fallback="Galleria creata"
        />
      ),
      description: (
        <T
          textKey="dashboard.galleryDetail.steps.galleryCreated.description"
          fallback="Lo spazio espositivo esiste nel portale ed è pronto per essere configurato."
        />
      ),
      status: "done",
    },
    {
      id: "gallery-data",
      label: (
        <T
          textKey="dashboard.galleryDetail.steps.galleryData.label"
          fallback="Titolo e descrizione"
        />
      ),
      description: hasTitle ? (
        <T
          textKey="dashboard.galleryDetail.steps.galleryData.done"
          fallback="I dati principali della galleria sono presenti."
        />
      ) : (
        <T
          textKey="dashboard.galleryDetail.steps.galleryData.todo"
          fallback="Inserisci almeno il titolo della galleria."
        />
      ),
      status: hasTitle ? "done" : "todo",
      href: "#dati-galleria",
      actionLabel: (
        <T
          textKey="dashboard.galleryDetail.steps.galleryData.action"
          fallback="Modifica dati"
        />
      ),
    },
    {
      id: "gallery-cover",
      label: (
        <T
          textKey="dashboard.galleryDetail.steps.galleryCover.label"
          fallback="Cover galleria"
        />
      ),
      description: hasCover ? (
        <T
          textKey="dashboard.galleryDetail.steps.galleryCover.done"
          fallback="La galleria ha una cover visibile nelle pagine pubbliche."
        />
      ) : (
        <T
          textKey="dashboard.galleryDetail.steps.galleryCover.todo"
          fallback="Aggiungi una cover: serve per pubblicare e rendere la pagina più credibile."
        />
      ),
      status: hasCover ? "done" : "todo",
      href: "#cover-galleria",
      actionLabel: hasCover ? (
        <T
          textKey="dashboard.galleryDetail.steps.galleryCover.updateAction"
          fallback="Aggiorna cover"
        />
      ) : (
        <T
          textKey="dashboard.galleryDetail.steps.galleryCover.uploadAction"
          fallback="Carica cover"
        />
      ),
    },
    {
      id: "artworks-linked",
      label: (
        <T
          textKey="dashboard.galleryDetail.steps.artworksLinked.label"
          fallback="Opere associate"
        />
      ),
      description:
        totalArtworks > 0 ? (
          <>
            <T
              textKey="dashboard.galleryDetail.steps.artworksLinked.donePrefix"
              fallback="Hai associato"
            />{" "}
            {totalArtworks}{" "}
            <T
              textKey="dashboard.galleryDetail.steps.artworksLinked.doneSuffix"
              fallback="opere a questa galleria."
            />
          </>
        ) : (
          <T
            textKey="dashboard.galleryDetail.steps.artworksLinked.todo"
            fallback="Associa almeno un’opera alla galleria prima di pubblicarla."
          />
        ),
      status: totalArtworks > 0 ? "done" : "todo",
      href: "#opere-galleria",
      actionLabel: (
        <T
          textKey="dashboard.galleryDetail.steps.artworksLinked.action"
          fallback="Gestisci opere"
        />
      ),
    },
    {
      id: "artworks-positioned",
      label: (
        <T
          textKey="dashboard.galleryDetail.steps.artworksPositioned.label"
          fallback="Allestimento 3D"
        />
      ),
      description:
        positionedArtworks > 0 ? (
          <>
            {positionedArtworks}{" "}
            <T
              textKey="dashboard.galleryDetail.steps.artworksPositioned.doneSuffix"
              fallback="opere sono già posizionate sulle pareti."
            />
          </>
        ) : (
          <T
            textKey="dashboard.galleryDetail.steps.artworksPositioned.todo"
            fallback="Apri l’editor 3D e posiziona almeno un’opera su una parete."
          />
        ),
      status: positionedArtworks > 0 ? "done" : "todo",
      href: `/dashboard/gallerie-editor/${gallery.id}`,
      actionLabel: (
        <T
          textKey="dashboard.galleryDetail.steps.artworksPositioned.action"
          fallback="Apri editor 3D"
        />
      ),
    },
    {
      id: "unpositioned-warning",
      label: (
        <T
          textKey="dashboard.galleryDetail.steps.unpositionedWarning.label"
          fallback="Opere non posizionate"
        />
      ),
      description:
        unpositionedArtworks > 0 ? (
          <>
            {unpositionedArtworks}{" "}
            <T
              textKey="dashboard.galleryDetail.steps.unpositionedWarning.warningSuffix"
              fallback="opere sono associate ma non posizionate: non saranno visibili nel viewer."
            />
          </>
        ) : (
          <T
            textKey="dashboard.galleryDetail.steps.unpositionedWarning.done"
            fallback="Tutte le opere associate risultano posizionate o non ci sono warning di allestimento."
          />
        ),
      status: unpositionedArtworks > 0 ? "warning" : "done",
      href: `/dashboard/gallerie-editor/${gallery.id}`,
      actionLabel: (
        <T
          textKey="dashboard.galleryDetail.steps.unpositionedWarning.action"
          fallback="Controlla editor"
        />
      ),
    },
    {
      id: "dimensions-warning",
      label: (
        <T
          textKey="dashboard.galleryDetail.steps.dimensionsWarning.label"
          fallback="Dimensioni opere"
        />
      ),
      description:
        artworksWithoutDimensions > 0 ? (
          <>
            {artworksWithoutDimensions}{" "}
            <T
              textKey="dashboard.galleryDetail.steps.dimensionsWarning.warningSuffix"
              fallback="opere non hanno dimensioni: nel viewer verrà usato il fallback 50 x 50 cm."
            />
          </>
        ) : (
          <T
            textKey="dashboard.galleryDetail.steps.dimensionsWarning.done"
            fallback="Le dimensioni opere sono sufficienti per il viewer."
          />
        ),
      status: artworksWithoutDimensions > 0 ? "warning" : "done",
      href: `/dashboard/gallerie-editor/${gallery.id}`,
      actionLabel: (
        <T
          textKey="dashboard.galleryDetail.steps.dimensionsWarning.action"
          fallback="Controlla dimensioni"
        />
      ),
    },
    {
      id: "visitor-preview",
      label: (
        <T
          textKey="dashboard.galleryDetail.steps.visitorPreview.label"
          fallback="Anteprima visitatore"
        />
      ),
      description:
        gallery.status === "published" ? (
          <T
            textKey="dashboard.galleryDetail.steps.visitorPreview.published"
            fallback="La galleria è pubblicata: puoi controllare la pagina pubblica completa."
          />
        ) : (
          <T
            textKey="dashboard.galleryDetail.steps.visitorPreview.todo"
            fallback="Apri l’anteprima visitatore prima di pubblicare, così controlli esperienza e allestimento."
          />
        ),
      status: gallery.status === "published" ? "done" : "todo",
      href:
        gallery.status === "published"
          ? `/gallerie/${gallery.slug}`
          : `/unity-frame?galleryId=${gallery.id}&mode=visitor`,
      actionLabel:
        gallery.status === "published" ? (
          <T
            textKey="dashboard.galleryDetail.steps.visitorPreview.publicAction"
            fallback="Apri pagina pubblica"
          />
        ) : (
          <T
            textKey="dashboard.galleryDetail.steps.visitorPreview.previewAction"
            fallback="Apri anteprima"
          />
        ),
    },
    {
      id: "publication",
      label: (
        <T
          textKey="dashboard.galleryDetail.steps.publication.label"
          fallback="Pubblicazione"
        />
      ),
      description:
        gallery.status === "published" ? (
          <T
            textKey="dashboard.galleryDetail.steps.publication.published"
            fallback="La galleria è online e visibile pubblicamente."
          />
        ) : canPublish ? (
          <T
            textKey="dashboard.galleryDetail.steps.publication.ready"
            fallback="La galleria è pronta per la pubblicazione."
          />
        ) : (
          <T
            textKey="dashboard.galleryDetail.steps.publication.todo"
            fallback="Completa gli step obbligatori prima di pubblicare."
          />
        ),
      status:
        gallery.status === "published"
          ? "done"
          : canPublish
            ? "warning"
            : "todo",
      href: "#pubblicazione",
      actionLabel: (
        <T
          textKey="dashboard.galleryDetail.steps.publication.action"
          fallback="Vai alla pubblicazione"
        />
      ),
    },
  ];
}

export default async function DashboardGalleryDetailPage({
  params,
}: GalleryDetailPageProps) {
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
    .select("id, role, plan")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    redirect("/auth/login");
  }

  const isAdmin = profile.role === "admin";
  const plan = normalizePlanName(profile.plan);
  const limits = getPlanLimits(plan);

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select(
      "id, owner_id, template_id, title, slug, description, status, cover_image_url, created_at, updated_at, published_at"
    )
    .eq("id", galleryId)
    .single<Gallery>();

  if (galleryError || !gallery) {
    return (
      <DashboardShell
  title={
    <T
      textKey="dashboard.galleryDetail.notFound.title"
      fallback="Galleria non trovata"
    />
  }
  subtitle={
    <T
      textKey="dashboard.galleryDetail.notFound.subtitle"
      fallback="La galleria non esiste oppure non hai i permessi per leggerla."
    />
  }
  activeSection="gallerie"
>
        <div className="rounded-3xl border border-red-800 bg-red-950/30 p-6">
          {galleryError?.message ? (
            galleryError.message
          ) : (
            <T
              textKey="dashboard.galleryDetail.errors.noData"
              fallback="Nessun dato disponibile."
            />
          )}
        </div>

        <a
          href="/dashboard/gallerie"
          className="mt-8 inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          <T
            textKey="dashboard.galleryDetail.actions.backToGalleries"
            fallback="Torna alle gallerie"
          />
        </a>
      </DashboardShell>
    );
  }

  const canManage = gallery.owner_id === user.id || isAdmin;

  if (!canManage) {
    return (
      <DashboardShell
  title={
    <T
      textKey="dashboard.galleryDetail.accessDenied.title"
      fallback="Accesso negato"
    />
  }
  subtitle={
    <T
      textKey="dashboard.galleryDetail.accessDenied.subtitle"
      fallback="Non puoi gestire questa galleria perché non sei il proprietario."
    />
  }
  activeSection="gallerie"
>
        <a
          href="/dashboard/gallerie"
          className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          <T
            textKey="dashboard.galleryDetail.actions.backToGalleries"
            fallback="Torna alle gallerie"
          />
        </a>
      </DashboardShell>
    );
  }

  const [templatesResult, purchasesResult] = await Promise.all([
    supabase
      .from("gallery_templates")
      .select(
        "id, name, slug, description, unity_scene_key, is_free, is_active, max_artworks, available_from_plan, preview_image_url, is_featured, sort_order"
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),

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

  const template =
    safeTemplates.find((item) => item.id === gallery.template_id) || null;

  const availableTemplates = safeTemplates.filter((item) => {
    if (!item.is_active) {
      return false;
    }

    if (isAdmin) {
      return true;
    }

    const check = canUseTemplateByPlan(
      plan,
      item.available_from_plan || "free"
    );

    return check.allowed || item.is_purchased_template === true;
  });

  const { data: artworks } = await supabase
    .from("artworks")
    .select("id, title, artist_name, year, image_url")
    .eq("owner_id", gallery.owner_id)
    .order("created_at", { ascending: false });

  const { data: galleryArtworks, error: galleryArtworksError } = await supabase
    .from("gallery_artworks")
    .select(
      `
      id,
      gallery_id,
      artwork_id,

      position_x,
      position_y,
      position_z,

      rotation_x,
      rotation_y,
      rotation_z,

      scale_x,
      scale_y,
      scale_z,

      wall_key,
      sort_order,

      display_width_cm,
      display_height_cm,
      frame_width_cm,
      frame_depth_cm,

      artworks (
        id,
        title,
        artist_name,
        year,
        technique,
        dimensions,
        image_url,
        thumbnail_url,
        width_cm,
        height_cm,
        is_for_sale,
        is_public
      )
    `
    )
    .eq("gallery_id", gallery.id)
    .order("sort_order", { ascending: true });

  const safeArtworks = (artworks || []) as Artwork[];
  const safeGalleryArtworks =
    (galleryArtworks || []) as unknown as GalleryArtworkRow[];
  const linkedArtworkIds = safeGalleryArtworks.map((item) => item.artwork_id);

  const publishValidation = validateGalleryForPublish({
    gallery,
    galleryArtworks: safeGalleryArtworks,
  });

  const onboardingSteps = buildOnboardingSteps({
    gallery,
    totalArtworks: publishValidation.summary.totalArtworks,
    positionedArtworks: publishValidation.summary.positionedArtworks,
    unpositionedArtworks: publishValidation.summary.unpositionedArtworks,
    artworksWithoutDimensions:
      publishValidation.summary.artworksWithoutDimensions,
    canPublish: publishValidation.canPublish,
  });

  const completedOnboardingSteps = onboardingSteps.filter(
    (step) => step.status === "done"
  ).length;

  const onboardingProgress = Math.round(
    (completedOnboardingSteps / onboardingSteps.length) * 100
  );

  const blockingErrors = publishValidation.errors.length;
  const onboardingWarnings =
    publishValidation.warnings.length +
    onboardingSteps.filter((step) => step.status === "warning").length;

  const templateMaxArtworks =
    template && template.max_artworks > 0 ? template.max_artworks : null;

  const planMaxArtworksPerGallery = limits.maxArtworksPerGallery;

  const effectiveLimit = getEffectiveLimit(
    planMaxArtworksPerGallery,
    templateMaxArtworks
  );

  const planAddCheck = canAddArtworkToGallery(
    plan,
    safeGalleryArtworks.length
  );

  const templateLimitReached =
    templateMaxArtworks !== null &&
    safeGalleryArtworks.length >= templateMaxArtworks;

  const effectiveLimitReached =
    effectiveLimit !== null && safeGalleryArtworks.length >= effectiveLimit;

  const canAddArtwork =
    planAddCheck.allowed && !templateLimitReached && !effectiveLimitReached;

  const limitMessage = !planAddCheck.allowed
    ? planAddCheck.reason
    : templateLimitReached
      ? `Questo template consente massimo ${templateMaxArtworks} opere.`
      : effectiveLimitReached
        ? `Questa galleria ha raggiunto il limite massimo di ${effectiveLimit} opere.`
        : undefined;

  return (
    <DashboardShell
  title={gallery.title}
  subtitle={
    <T
      textKey="dashboard.galleryDetail.header.subtitle"
      fallback="Gestisci dati pubblici, opere collegate, template, pubblicazione e apertura dell’editor Unity WebGL."
    />
  }
  activeSection="gallerie"
      actions={
        <>
          <a
            href="/dashboard/gallerie"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="dashboard.galleryDetail.actions.allGalleries"
              fallback="Tutte le gallerie"
            />
          </a>

          <a
            href={`/dashboard/gallerie/${gallery.id}/catalogo`}
            className="rounded-full border border-amber-800 px-5 py-2 text-sm text-amber-200 transition hover:border-amber-500"
          >
            <T
              textKey="dashboard.galleryDetail.actions.createCatalog"
              fallback="Crea catalogo"
            />
          </a>

          <a
            href="/marketplace"
            className="rounded-full border border-amber-800 px-5 py-2 text-sm text-amber-200 transition hover:border-amber-500"
          >
            <T
              textKey="dashboard.galleryDetail.actions.marketplace"
              fallback="Marketplace"
            />
          </a>

          <a
            href={`/dashboard/gallerie-editor/${gallery.id}`}
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            <T
              textKey="dashboard.galleryDetail.actions.openUnityEditor"
              fallback="Apri editor Unity"
            />
          </a>

          <a
            href={`/unity-frame?galleryId=${gallery.id}&mode=visitor`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-blue-800 px-5 py-2 text-sm text-blue-200 transition hover:border-blue-500"
          >
            <T
              textKey="dashboard.galleryDetail.actions.viewerPreview"
              fallback="Anteprima viewer 3D"
            />
          </a>

          {gallery.status === "published" && (
            <a
              href={`/gallerie/${gallery.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-green-800 px-5 py-2 text-sm text-green-200 transition hover:border-green-500"
            >
              <T
                textKey="dashboard.galleryDetail.actions.publicPage"
                fallback="Pagina pubblica"
              />
            </a>
          )}
        </>
      }
    >
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              <T
                textKey="dashboard.galleryDetail.onboarding.label"
                fallback="Onboarding galleria"
              />
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-medium">
                <T
                  textKey="dashboard.galleryDetail.onboarding.title"
                  fallback="Preparazione pubblicazione"
                />
              </h2>

              <span
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getStatusBadgeClass(
                  gallery.status
                )}`}
              >
                <T
  textKey={getStatusTranslation(gallery.status).textKey}
  fallback={getStatusTranslation(gallery.status).fallback}
/>
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
              <T
                textKey="dashboard.galleryDetail.onboarding.description"
                fallback="Segui questi passaggi per trasformare la galleria da bozza tecnica a spazio pubblico pronto per essere condiviso con visitatori e collezionisti."
              />
            </p>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
                <span>
                  <T
                    textKey="dashboard.galleryDetail.onboarding.completed"
                    fallback="Completati"
                  />{" "}
                  {completedOnboardingSteps}/{onboardingSteps.length}
                </span>

                <span>{onboardingProgress}%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${onboardingProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 text-sm">
              <div className="flex justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3">
                <span className="text-neutral-500">
                  <T
                    textKey="dashboard.galleryDetail.onboarding.blockingErrors"
                    fallback="Errori bloccanti"
                  />
                </span>

                <span
                  className={
                    blockingErrors > 0 ? "text-red-300" : "text-green-300"
                  }
                >
                  {blockingErrors}
                </span>
              </div>

              <div className="flex justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3">
                <span className="text-neutral-500">
                  <T
                    textKey="dashboard.galleryDetail.onboarding.warnings"
                    fallback="Attenzioni"
                  />
                </span>

                <span
                  className={
                    onboardingWarnings > 0
                      ? "text-yellow-300"
                      : "text-green-300"
                  }
                >
                  {onboardingWarnings}
                </span>
              </div>

              <div className="flex justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3">
                <span className="text-neutral-500">
                  <T
                    textKey="dashboard.galleryDetail.onboarding.positionedArtworks"
                    fallback="Opere posizionate"
                  />
                </span>

                <span className="text-neutral-100">
                  {publishValidation.summary.positionedArtworks} /{" "}
                  {publishValidation.summary.totalArtworks}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#opere-galleria"
                className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
              >
                <T
                  textKey="dashboard.galleryDetail.actions.manageArtworks"
                  fallback="Gestisci opere"
                />
              </a>

              <a
                href={`/dashboard/gallerie-editor/${gallery.id}`}
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                <T
                  textKey="dashboard.galleryDetail.actions.open3dEditor"
                  fallback="Apri editor 3D"
                />
              </a>

              <a
                href="#pubblicazione"
                className="rounded-full border border-green-800 px-5 py-2 text-sm text-green-200 transition hover:border-green-500"
              >
                <T
                  textKey="dashboard.galleryDetail.actions.publication"
                  fallback="Pubblicazione"
                />
              </a>
            </div>
          </div>

          <div className="grid gap-3">
            {onboardingSteps.map((step) => (
              <div
                key={step.id}
                className={`rounded-2xl border p-4 ${getOnboardingStepClass(
                  step.status
                )}`}
              >
                <div className="flex gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium ${getOnboardingIconClass(
                      step.status
                    )}`}
                  >
                    {getOnboardingStepIcon(step.status)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div>
                        <p className="font-medium text-neutral-100">
                          {step.label}
                        </p>

                        <p className="mt-1 text-sm leading-6 text-neutral-400">
                          {step.description}
                        </p>
                      </div>

                      {step.href && step.actionLabel && (
                        <a
                          href={step.href}
                          target={
                            step.href.startsWith("http") ? "_blank" : undefined
                          }
                          rel={
                            step.href.startsWith("http")
                              ? "noreferrer"
                              : undefined
                          }
                          className="inline-flex shrink-0 rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400"
                        >
                          {step.actionLabel}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <article
          id="dati-galleria"
          className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-medium">
              <T
                textKey="dashboard.galleryDetail.details.title"
                fallback="Dati galleria"
              />
            </h2>

            <span
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getStatusBadgeClass(
                gallery.status
              )}`}
            >
              <T
  textKey={getStatusTranslation(gallery.status).textKey}
  fallback={getStatusTranslation(gallery.status).fallback}
/>
            </span>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.details.id"
                  fallback="ID"
                />
              </dt>

              <dd className="mt-1 break-all text-neutral-200">
                {gallery.id}
              </dd>
            </div>

            <div>
              <dt className="text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.details.galleryTitle"
                  fallback="Titolo"
                />
              </dt>

              <dd className="mt-1 text-neutral-200">{gallery.title}</dd>
            </div>

            <div>
              <dt className="text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.details.slug"
                  fallback="Slug"
                />
              </dt>

              <dd className="mt-1 text-neutral-200">{gallery.slug}</dd>
            </div>

            <div>
              <dt className="text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.details.status"
                  fallback="Status"
                />
              </dt>

              <dd className="mt-1 text-neutral-200">
  <T
    textKey={getStatusTranslation(gallery.status).textKey}
    fallback={getStatusTranslation(gallery.status).fallback}
  />
</dd>
            </div>

            <div>
              <dt className="text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.details.description"
                  fallback="Descrizione"
                />
              </dt>

              <dd className="mt-1 text-neutral-200">
                {gallery.description ? (
                  gallery.description
                ) : (
                  <T
                    textKey="dashboard.galleryDetail.details.descriptionMissing"
                    fallback="Non inserita"
                  />
                )}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-2xl font-medium">
            <T
              textKey="dashboard.galleryDetail.limits.title"
              fallback="Template e limiti"
            />
          </h2>

          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.limits.template"
                  fallback="Template"
                />
              </dt>

              <dd className="mt-1 text-neutral-200">
                {template?.name ? (
                  template.name
                ) : (
                  <T
                    textKey="dashboard.galleryDetail.limits.templateNotFound"
                    fallback="Template non trovato"
                  />
                )}
              </dd>
            </div>

            <div>
              <dt className="text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.limits.unitySceneKey"
                  fallback="Unity scene key"
                />
              </dt>

              <dd className="mt-1 text-neutral-200">
                {template?.unity_scene_key || "N/D"}
              </dd>
            </div>

            <div>
              <dt className="text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.limits.templateAccess"
                  fallback="Accesso template"
                />
              </dt>

              <dd className="mt-1 text-neutral-200">
                {getTemplatePlanLabel(
                  template?.available_from_plan || "free",
                  template?.is_purchased_template
                )}
              </dd>
            </div>

            <div>
              <dt className="text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.limits.accountPlan"
                  fallback="Piano account"
                />
              </dt>

              <dd className="mt-1 text-neutral-200">{limits.label}</dd>
            </div>

            <div>
              <dt className="text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.limits.planLimit"
                  fallback="Limite piano"
                />
              </dt>

              <dd className="mt-1 text-neutral-200">
                {planMaxArtworksPerGallery === null ? (
                  <T
                    textKey="dashboard.galleryDetail.limits.unlimited"
                    fallback="Illimitato"
                  />
                ) : (
                  planMaxArtworksPerGallery
                )}
              </dd>
            </div>

            <div>
              <dt className="text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.limits.templateLimit"
                  fallback="Limite template"
                />
              </dt>

              <dd className="mt-1 text-neutral-200">
                {templateMaxArtworks === null ? (
                  <T
                    textKey="dashboard.galleryDetail.limits.notAvailable"
                    fallback="N/D"
                  />
                ) : (
                  templateMaxArtworks
                )}
              </dd>
            </div>

            <div>
              <dt className="text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.limits.effectiveLimit"
                  fallback="Limite effettivo"
                />
              </dt>

              <dd className="mt-1 text-neutral-200">
                {effectiveLimit === null ? (
                  <T
                    textKey="dashboard.galleryDetail.limits.unlimited"
                    fallback="Illimitato"
                  />
                ) : (
                  effectiveLimit
                )}
              </dd>
            </div>

            <div>
              <dt className="text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.limits.insertedArtworks"
                  fallback="Opere inserite"
                />
              </dt>

              <dd className="mt-1 text-neutral-200">
                {safeGalleryArtworks.length}
                {effectiveLimit !== null ? ` / ${effectiveLimit}` : ""}
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <div className="mt-6">
        <ChangeGalleryTemplateForm
          galleryId={gallery.id}
          currentTemplateId={gallery.template_id}
          templates={availableTemplates}
          currentGalleryArtworkCount={safeGalleryArtworks.length}
          positionedArtworkCount={publishValidation.summary.positionedArtworks}
          unpositionedArtworkCount={
            publishValidation.summary.unpositionedArtworks
          }
        />
      </div>

      <div id="pubblicazione" className="mt-6">
        <GalleryPublishStatusButton
          galleryId={gallery.id}
          gallerySlug={gallery.slug}
          currentStatus={gallery.status}
        />
      </div>

      <div className="mt-6">
        <EditGalleryDetailsForm
          galleryId={gallery.id}
          currentTitle={gallery.title}
          currentSlug={gallery.slug}
          currentDescription={gallery.description}
        />
      </div>

      <div id="cover-galleria" className="mt-6">
        <GalleryCoverUploadForm
          galleryId={gallery.id}
          ownerId={gallery.owner_id}
          currentTitle={gallery.title}
          currentDescription={gallery.description || ""}
          currentCoverImageUrl={gallery.cover_image_url}
        />
      </div>

      <div
        id="opere-galleria"
        className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]"
      >
        <AddArtworkToGalleryForm
          galleryId={gallery.id}
          artworks={safeArtworks}
          linkedArtworkIds={linkedArtworkIds}
          plan={plan}
          currentGalleryArtworkCount={safeGalleryArtworks.length}
          maxArtworksPerGallery={planMaxArtworksPerGallery}
          templateMaxArtworks={templateMaxArtworks}
          effectiveLimit={effectiveLimit}
          canAddArtwork={canAddArtwork}
          limitMessage={limitMessage}
        />

        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.artworks.label"
                  fallback="Allestimento"
                />
              </p>

              <h2 className="text-2xl font-medium">
                <T
                  textKey="dashboard.galleryDetail.artworks.title"
                  fallback="Opere nella galleria"
                />
              </h2>
            </div>

            <p className="text-sm text-neutral-500">
              <T
                textKey="dashboard.galleryDetail.artworks.total"
                fallback="Totale:"
              />{" "}
              {safeGalleryArtworks.length}
            </p>
          </div>

          {galleryArtworksError && (
            <div className="mt-8 rounded-2xl border border-red-800 bg-red-950/30 p-4 text-sm text-red-100">
              {galleryArtworksError.message}
            </div>
          )}

          {safeGalleryArtworks.length === 0 && (
            <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
              <p className="text-neutral-300">
                <T
                  textKey="dashboard.galleryDetail.artworks.emptyTitle"
                  fallback="Non hai ancora aggiunto opere a questa galleria."
                />
              </p>

              <p className="mt-2 text-sm text-neutral-500">
                <T
                  textKey="dashboard.galleryDetail.artworks.emptyDescription"
                  fallback="Usa il form a sinistra per iniziare l allestimento."
                />
              </p>
            </div>
          )}

          {safeGalleryArtworks.length > 0 && (
            <div className="mt-6 space-y-4">
              {safeGalleryArtworks.map((item) => {
                const artwork = normalizeArtworkRelation(item.artworks);

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
                  >
                    <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                      <div className="aspect-[4/3] bg-neutral-900 md:aspect-auto">
                        {artwork?.image_url ? (
                          <img
                            src={artwork.image_url}
                            alt={artwork.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                            <T
                              textKey="dashboard.galleryDetail.artworks.imageMissing"
                              fallback="Immagine assente"
                            />
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-medium">
                                {artwork?.title ? (
                                  artwork.title
                                ) : (
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.artworkNotFound"
                                    fallback="Opera non trovata"
                                  />
                                )}
                              </h3>

                              {artwork?.is_public ? (
                                <span className="rounded-full border border-green-900 bg-green-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-green-300">
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.public"
                                    fallback="Pubblica"
                                  />
                                </span>
                              ) : (
                                <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-400">
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.private"
                                    fallback="Privata"
                                  />
                                </span>
                              )}

                              {artwork?.is_for_sale && (
                                <span className="rounded-full border border-blue-900 bg-blue-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-blue-300">
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.forSale"
                                    fallback="In vendita"
                                  />
                                </span>
                              )}

                              {item.wall_key ? (
                                <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-300">
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.positioned"
                                    fallback="Posizionata"
                                  />
                                </span>
                              ) : (
                                <span className="rounded-full border border-yellow-900 bg-yellow-950/30 px-3 py-1 text-xs uppercase tracking-[0.15em] text-yellow-300">
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.notPositioned"
                                    fallback="Non posizionata"
                                  />
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-sm text-neutral-500">
                              {artwork?.artist_name ? (
                                artwork.artist_name
                              ) : (
                                <T
                                  textKey="dashboard.galleryDetail.artworks.artistMissing"
                                  fallback="Artista non indicato"
                                />
                              )}
                              {artwork?.year ? `, ${artwork.year}` : ""}
                            </p>

                            <dl className="mt-4 grid gap-2 text-xs text-neutral-500 md:grid-cols-2">
                              <div>
                                <dt className="text-neutral-600">
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.wall"
                                    fallback="Parete"
                                  />
                                </dt>

                                <dd className="text-neutral-300">
                                  {item.wall_key || "N/D"}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-neutral-600">
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.order"
                                    fallback="Ordine"
                                  />
                                </dt>

                                <dd className="text-neutral-300">
                                  {item.sort_order}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-neutral-600">
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.displayDimensions"
                                    fallback="Dimensioni display"
                                  />
                                </dt>

                                <dd className="text-neutral-300">
                                  {item.display_width_cm || "50"} x{" "}
                                  {item.display_height_cm || "50"} cm
                                </dd>
                              </div>

                              <div>
                                <dt className="text-neutral-600">
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.frame"
                                    fallback="Cornice"
                                  />
                                </dt>

                                <dd className="text-neutral-300">
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.frameWidth"
                                    fallback="larg."
                                  />{" "}
                                  {item.frame_width_cm ?? "0"} cm ·{" "}
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.frameDepth"
                                    fallback="prof."
                                  />{" "}
                                  {item.frame_depth_cm ?? "2"} cm
                                </dd>
                              </div>

                              <div>
                                <dt className="text-neutral-600">
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.position"
                                    fallback="Posizione"
                                  />
                                </dt>

                                <dd className="text-neutral-300">
                                  x {formatNumber(item.position_x)} · y{" "}
                                  {formatNumber(item.position_y)} · z{" "}
                                  {formatNumber(item.position_z)}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-neutral-600">
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.rotation"
                                    fallback="Rotazione"
                                  />
                                </dt>

                                <dd className="text-neutral-300">
                                  x {formatNumber(item.rotation_x)} · y{" "}
                                  {formatNumber(item.rotation_y)} · z{" "}
                                  {formatNumber(item.rotation_z)}
                                </dd>
                              </div>

                              <div>
                                <dt className="text-neutral-600">
                                  <T
                                    textKey="dashboard.galleryDetail.artworks.scale"
                                    fallback="Scala"
                                  />
                                </dt>

                                <dd className="text-neutral-300">
                                  x {formatNumber(item.scale_x)} · y{" "}
                                  {formatNumber(item.scale_y)} · z{" "}
                                  {formatNumber(item.scale_z)}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          <RemoveGalleryArtworkButton
                            galleryArtworkId={item.id}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
          <T
            textKey="dashboard.galleryDetail.unity.label"
            fallback="Unity readiness"
          />
        </p>

        <h2 className="text-2xl font-medium">
          <T
            textKey="dashboard.galleryDetail.unity.title"
            fallback="Dati pronti per il viewer 3D"
          />
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
          <T
            textKey="dashboard.galleryDetail.unity.descriptionPrefix"
            fallback="Ogni opera aggiunta qui crea una riga in"
          />{" "}
          <span className="text-neutral-100">gallery_artworks</span>.{" "}
          <T
            textKey="dashboard.galleryDetail.unity.descriptionMiddle"
            fallback="Unity leggerà queste righe, scaricherà le immagini da"
          />{" "}
          <span className="text-neutral-100">image_url</span>{" "}
          <T
            textKey="dashboard.galleryDetail.unity.descriptionSuffix"
            fallback="e creerà i quadri nello spazio 3D usando posizione, rotazione, scala, dimensioni espositive e cornici."
          />
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`/unity-frame?galleryId=${gallery.id}&mode=visitor`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-blue-800 px-5 py-2 text-sm text-blue-200 transition hover:border-blue-500"
          >
            <T
              textKey="dashboard.galleryDetail.actions.viewerPreview"
              fallback="Anteprima viewer 3D"
            />
          </a>

          {gallery.status === "published" && (
            <a
              href={`/gallerie/${gallery.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full border border-green-800 px-5 py-2 text-sm text-green-200 transition hover:border-green-500"
            >
              <T
                textKey="dashboard.galleryDetail.actions.openPublicPage"
                fallback="Apri pagina pubblica"
              />
            </a>
          )}

          <a
            href={`/dashboard/gallerie-editor/${gallery.id}`}
            className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            <T
              textKey="dashboard.galleryDetail.actions.openUnityEditor"
              fallback="Apri editor Unity"
            />
          </a>

          <a
            href={`/api/unity/galleries/${gallery.id}?mode=editor`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="dashboard.galleryDetail.actions.openUnityJson"
              fallback="Apri JSON Unity"
            />
          </a>
        </div>

        {gallery.status !== "published" && (
          <p className="mt-4 text-xs leading-5 text-neutral-500">
            <T
              textKey="dashboard.galleryDetail.unity.unpublishedNotice"
              fallback="La pagina pubblica completa sarà disponibile dopo la pubblicazione. Puoi comunque usare l’anteprima viewer 3D per controllare l’allestimento in modalità visitatore."
            />
          </p>
        )}
      </div>

      <div className="mt-6">
        <DeleteGalleryButton
          galleryId={gallery.id}
          galleryTitle={gallery.title}
          currentStatus={gallery.status}
        />
      </div>
    </DashboardShell>
  );
}