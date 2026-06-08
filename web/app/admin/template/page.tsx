import AdminShell from "@/components/admin/AdminShell";
import AdminTemplateControls from "@/components/admin/AdminTemplateControls";
import AdminCreateTemplateForm from "@/components/admin/AdminCreateTemplateForm";
import { requireAdmin } from "@/lib/admin/requireAdmin";

type TemplatePlan = "free" | "pro" | "business" | "institution";

type Template = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unity_scene_key: string;
  is_free: boolean;
  is_active: boolean;
  max_artworks: number;
  available_from_plan: TemplatePlan | null;
  preview_image_url: string | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
};

type Gallery = {
  id: string;
  template_id: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("it-IT");
}

function normalizeTemplatePlan(value: unknown): TemplatePlan {
  if (
    value === "free" ||
    value === "pro" ||
    value === "business" ||
    value === "institution"
  ) {
    return value;
  }

  return "free";
}

function getPlanLabel(plan: TemplatePlan) {
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

function getPlanBadgeClass(plan: TemplatePlan) {
  if (plan === "institution") {
    return "border-red-900 bg-red-950/40 text-red-300";
  }

  if (plan === "business") {
    return "border-purple-900 bg-purple-950/40 text-purple-300";
  }

  if (plan === "pro") {
    return "border-blue-900 bg-blue-950/40 text-blue-300";
  }

  return "border-green-900 bg-green-950/40 text-green-300";
}

export default async function AdminTemplatesPage() {
  const { admin } = await requireAdmin();

  const [templatesResult, galleriesResult] = await Promise.all([
    admin
      .from("gallery_templates")
      .select(
        "id, name, slug, description, unity_scene_key, is_free, is_active, max_artworks, available_from_plan, preview_image_url, is_featured, sort_order, created_at"
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    admin.from("galleries").select("id, template_id"),
  ]);

  const templates = (templatesResult.data || []) as Template[];
  const galleries = (galleriesResult.data || []) as Gallery[];

  const activeCount = templates.filter((item) => item.is_active).length;
  const featuredCount = templates.filter((item) => item.is_featured).length;

  const freeCount = templates.filter((item) => {
    const plan = normalizeTemplatePlan(
      item.available_from_plan || (item.is_free ? "free" : "pro")
    );

    return plan === "free";
  }).length;

  const proOrHigherCount = templates.filter((item) => {
    const plan = normalizeTemplatePlan(
      item.available_from_plan || (item.is_free ? "free" : "pro")
    );

    return plan !== "free";
  }).length;

  return (
    <AdminShell
      title="Template"
      subtitle="Gestisci il registry dei template: preview, piano minimo, limite opere, scena Unity e disponibilità nel portale."
      activeSection="templates"
    >
      {(templatesResult.error || galleriesResult.error) && (
        <div className="mb-6 rounded-3xl border border-red-800 bg-red-950/30 p-6">
          <p className="text-lg font-medium">Errore caricamento template</p>

          {templatesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Templates: {templatesResult.error.message}
            </p>
          )}

          {galleriesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Galleries: {galleriesResult.error.message}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-5">
        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Totale template
          </p>

          <p className="text-4xl font-semibold">{templates.length}</p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Attivi
          </p>

          <p className="text-4xl font-semibold">{activeCount}</p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            In evidenza
          </p>

          <p className="text-4xl font-semibold">{featuredCount}</p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Da Free
          </p>

          <p className="text-4xl font-semibold">{freeCount}</p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Premium
          </p>

          <p className="text-4xl font-semibold">{proOrHigherCount}</p>
        </article>
      </div>

      <div className="mt-6">
        <AdminCreateTemplateForm />
      </div>

      <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Template registry
          </p>

          <h2 className="text-2xl font-medium">Template gallerie</h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
            Da qui decidi quali ambienti 3D sono attivi, quale preview mostrano,
            quale chiave Unity usano, quante opere possono contenere e da quale
            piano diventano disponibili.
          </p>
        </div>

        {templates.length === 0 && (
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <p className="text-neutral-300">Nessun template presente.</p>
          </div>
        )}

        {templates.length > 0 && (
          <div className="mt-6 space-y-4">
            {templates.map((template) => {
              const usageCount = galleries.filter(
                (gallery) => gallery.template_id === template.id
              ).length;

              const accessPlan = normalizeTemplatePlan(
                template.available_from_plan ||
                  (template.is_free ? "free" : "pro")
              );

              return (
                <article
                  key={template.id}
                  className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[320px_1fr_1.1fr]">
                    <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
                      {template.preview_image_url ? (
                        <img
                          src={template.preview_image_url}
                          alt={template.name}
                          className="h-full min-h-72 w-full object-cover"
                        />
                      ) : (
                        <div className="flex min-h-72 items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.20),_transparent_30%),linear-gradient(135deg,_#262626,_#111827_55%,_#020617)] p-6 text-center">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                              Preview assente
                            </p>

                            <p className="mt-3 text-lg font-medium text-neutral-200">
                              {template.name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            template.is_active
                              ? "rounded-full border border-green-900 bg-green-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-green-300"
                              : "rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-400"
                          }
                        >
                          {template.is_active ? "Attivo" : "Disattivo"}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getPlanBadgeClass(
                            accessPlan
                          )}`}
                        >
                          Da {getPlanLabel(accessPlan)}
                        </span>

                        {template.is_featured && (
                          <span className="rounded-full border border-white/20 bg-white px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-950">
                            Featured
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 text-2xl font-medium">
                        {template.name}
                      </h3>

                      <p className="mt-2 break-all text-sm text-neutral-500">
                        {template.slug}
                      </p>

                      {template.description && (
                        <p className="mt-4 text-sm leading-7 text-neutral-400">
                          {template.description}
                        </p>
                      )}

                      <dl className="mt-5 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Unity key
                          </dt>
                          <dd className="mt-2 break-all text-sm text-neutral-100">
                            {template.unity_scene_key}
                          </dd>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Piano minimo
                          </dt>
                          <dd className="mt-2 text-xl font-semibold text-neutral-100">
                            {getPlanLabel(accessPlan)}
                          </dd>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Max opere
                          </dt>
                          <dd className="mt-2 text-xl font-semibold text-neutral-100">
                            {template.max_artworks}
                          </dd>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Ordine
                          </dt>
                          <dd className="mt-2 text-xl font-semibold text-neutral-100">
                            {template.sort_order}
                          </dd>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 md:col-span-2">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Usato da
                          </dt>
                          <dd className="mt-2 text-xl font-semibold text-neutral-100">
                            {usageCount}
                          </dd>
                          <p className="mt-1 text-xs text-neutral-500">
                            gallerie
                          </p>
                        </div>
                      </dl>

                      <p className="mt-4 text-xs text-neutral-600">
                        Creato: {formatDate(template.created_at)}
                      </p>
                    </div>

                    <AdminTemplateControls
                      templateId={template.id}
                      currentName={template.name}
                      currentSlug={template.slug}
                      currentDescription={template.description}
                      currentUnitySceneKey={template.unity_scene_key}
                      currentIsFree={template.is_free}
                      currentIsActive={template.is_active}
                      currentMaxArtworks={template.max_artworks}
                      currentAvailableFromPlan={accessPlan}
                      currentPreviewImageUrl={template.preview_image_url}
                      currentIsFeatured={template.is_featured}
                      currentSortOrder={template.sort_order}
                    />
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