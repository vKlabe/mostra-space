import AdminShell from "@/components/admin/AdminShell";
import AdminTemplateControls from "@/components/admin/AdminTemplateControls";
import { requireAdmin } from "@/lib/admin/requireAdmin";

type Template = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unity_scene_key: string;
  is_free: boolean;
  is_active: boolean;
  max_artworks: number;
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

export default async function AdminTemplatesPage() {
  const { admin } = await requireAdmin();

  const [templatesResult, galleriesResult] = await Promise.all([
    admin
      .from("gallery_templates")
      .select(
        "id, name, slug, description, unity_scene_key, is_free, is_active, max_artworks, created_at"
      )
      .order("created_at", { ascending: true }),
    admin.from("galleries").select("id, template_id"),
  ]);

  const templates = (templatesResult.data || []) as Template[];
  const galleries = (galleriesResult.data || []) as Gallery[];

  const activeCount = templates.filter((item) => item.is_active).length;
  const freeCount = templates.filter((item) => item.is_free).length;

  return (
    <AdminShell
      title="Template"
      subtitle="Gestisci i template delle gallerie: disponibilita, limite opere, scena Unity e accesso free/pro."
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

      <div className="grid gap-5 md:grid-cols-3">
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
            Free
          </p>

          <p className="text-4xl font-semibold">{freeCount}</p>
        </article>
      </div>

      <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Gestione template
          </p>

          <h2 className="text-2xl font-medium">Template gallerie</h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
            Per ora puoi modificare template esistenti. La creazione di nuovi
            template la collegheremo quando avrai nuove scene Unity pronte.
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

              return (
                <article
                  key={template.id}
                  className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
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
                          className={
                            template.is_free
                              ? "rounded-full border border-blue-900 bg-blue-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-blue-300"
                              : "rounded-full border border-purple-900 bg-purple-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-purple-300"
                          }
                        >
                          {template.is_free ? "Free" : "Premium"}
                        </span>
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

                      <dl className="mt-5 grid gap-3 md:grid-cols-3">
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
                            Max opere
                          </dt>
                          <dd className="mt-2 text-xl font-semibold text-neutral-100">
                            {template.max_artworks}
                          </dd>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
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