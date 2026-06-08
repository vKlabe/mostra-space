"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  formatLimitValue,
  normalizePlanName,
  PLAN_LIMITS,
  type PlanName,
} from "@/lib/plans";

type GalleryTemplate = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unity_scene_key: string;
  is_free: boolean;
  max_artworks: number;
  available_from_plan?: string | null;
  preview_image_url?: string | null;
  is_featured?: boolean | null;
  sort_order?: number | null;
};

type CreateGalleryFormProps = {
  templates: GalleryTemplate[];
  plan: PlanName | string;
  currentGalleryCount: number;
  maxGalleries: number | null;
  canCreate: boolean;
  limitMessage?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPlanLabel(plan: unknown) {
  const normalized = normalizePlanName(plan);

  return PLAN_LIMITS[normalized].label;
}

function getPlanBadgeClass(plan: unknown) {
  const normalized = normalizePlanName(plan);

  if (normalized === "institution") {
    return "border-red-900 bg-red-950/40 text-red-300";
  }

  if (normalized === "business") {
    return "border-purple-900 bg-purple-950/40 text-purple-300";
  }

  if (normalized === "pro") {
    return "border-blue-900 bg-blue-950/40 text-blue-300";
  }

  return "border-green-900 bg-green-950/40 text-green-300";
}

function getTemplateVisualLabel(template: GalleryTemplate) {
  const key = `${template.unity_scene_key} ${template.slug}`.toLowerCase();

  if (key.includes("black")) {
    return "Black Room";
  }

  if (key.includes("industrial")) {
    return "Industrial";
  }

  if (key.includes("museum")) {
    return "Museum";
  }

  if (key.includes("booth")) {
    return "Booth";
  }

  if (key.includes("white")) {
    return "White Cube";
  }

  if (key.includes("basic")) {
    return "Basic Room";
  }

  return "Gallery Space";
}

function getTemplatePreviewClass(template: GalleryTemplate) {
  const key = `${template.unity_scene_key} ${template.slug}`.toLowerCase();

  if (key.includes("black")) {
    return "bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.20),_transparent_28%),linear-gradient(135deg,_#050505,_#171717_45%,_#000000)]";
  }

  if (key.includes("industrial")) {
    return "bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_25%),linear-gradient(135deg,_#27211c,_#111111_50%,_#3a3128)]";
  }

  if (key.includes("museum")) {
    return "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_32%),linear-gradient(135deg,_#e5e0d6,_#8b8174_48%,_#211f1d)]";
  }

  if (key.includes("booth")) {
    return "bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.30),_transparent_30%),linear-gradient(135deg,_#f3f3f3,_#9ca3af_55%,_#1f2937)]";
  }

  if (key.includes("white")) {
    return "bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_transparent_32%),linear-gradient(135deg,_#f5f5f5,_#bdbdbd_55%,_#3f3f46)]";
  }

  return "bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.45),_transparent_30%),linear-gradient(135deg,_#262626,_#111827_55%,_#020617)]";
}

export default function CreateGalleryForm({
  templates,
  plan,
  currentGalleryCount,
  maxGalleries,
  canCreate,
  limitMessage,
}: CreateGalleryFormProps) {
  const router = useRouter();

  const firstTemplateId = templates[0]?.id || "";

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState(firstTemplateId);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const usageLabel = useMemo(() => {
    return `Gallerie create: ${currentGalleryCount} / ${formatLimitValue(
      maxGalleries
    )}`;
  }, [currentGalleryCount, maxGalleries]);

  const selectedTemplate = templates.find(
    (template) => template.id === templateId
  );

  function handleTitleChange(value: string) {
    setTitle(value);

    if (!slug) {
      setSlug(slugify(value));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreate) {
      setMessage(
        limitMessage ||
          "Hai raggiunto il limite di gallerie del tuo piano."
      );
      return;
    }

    if (!templateId) {
      setMessage("Devi selezionare un template.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/dashboard/galleries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          slug,
          description,
          templateId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore creazione galleria.");
        return;
      }

      setMessage("Galleria creata correttamente.");
      setTitle("");
      setSlug("");
      setDescription("");
      setTemplateId(firstTemplateId);

      router.push(`/dashboard/gallerie/${data.gallery.id}`);
      router.refresh();
    } catch {
      setMessage("Errore di rete durante creazione galleria.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
    >
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
        Nuova galleria
      </p>

      <h2 className="text-2xl font-medium">Crea una galleria</h2>

      <p className="mt-3 text-sm leading-6 text-neutral-400">
        Piano attuale:{" "}
        <span className="capitalize text-neutral-100">
          {getPlanLabel(plan)}
        </span>
      </p>

      <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <p className="text-sm text-neutral-300">{usageLabel}</p>

        {!canCreate && (
          <div className="mt-3 rounded-2xl border border-yellow-900 bg-yellow-950/30 p-4">
            <p className="text-sm leading-6 text-yellow-100">
              {limitMessage ||
                "Hai raggiunto il limite di gallerie del tuo piano."}
            </p>

            <a
              href="/pricing"
              className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              Passa a un piano superiore
            </a>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm text-neutral-300">
            Titolo
          </label>

          <input
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            disabled={!canCreate || isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Prima galleria"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-neutral-300">
            Slug pubblico
          </label>

          <input
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
            disabled={!canCreate || isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="prima-galleria"
            required
          />

          <p className="mt-2 text-xs text-neutral-500">
            Link finale: /gallerie/{slug || "slug-galleria"}
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm text-neutral-300">
            Descrizione
          </label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={!canCreate || isLoading}
            className="min-h-28 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Descrivi la galleria"
          />
        </div>

        <div>
          <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <label className="block text-sm text-neutral-300">
                Template stanza
              </label>

              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Scegli l’ambiente 3D da usare come base della galleria.
              </p>
            </div>

            <p className="text-xs text-neutral-600">
              Disponibili: {templates.length}
            </p>
          </div>

          {templates.length === 0 && (
            <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-4">
              <p className="text-sm leading-6 text-yellow-100">
                Nessun template disponibile per il tuo piano. Controlla i
                template attivi o passa a un piano superiore.
              </p>
            </div>
          )}

          {templates.length > 0 && (
            <div className="grid gap-3">
              {templates.map((template) => {
                const isSelected = template.id === templateId;
                const requiredPlan = template.available_from_plan || "free";

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setTemplateId(template.id)}
                    disabled={!canCreate || isLoading}
                    className={
                      isSelected
                        ? "overflow-hidden rounded-3xl border border-white bg-neutral-950 text-left shadow-2xl transition disabled:cursor-not-allowed disabled:opacity-50"
                        : "overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 text-left transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                    }
                  >
                    <div className="grid gap-0 md:grid-cols-[170px_1fr]">
                      <div
                        className={`relative min-h-40 overflow-hidden ${getTemplatePreviewClass(
                          template
                        )}`}
                      >
                        {template.preview_image_url ? (
                          <img
                            src={template.preview_image_url}
                            alt={template.name}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-black/10" />
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

                        <div className="absolute inset-x-4 bottom-4">
                          <div className="rounded-2xl border border-white/20 bg-black/35 p-3 backdrop-blur">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                              Preview
                            </p>

                            <p className="mt-1 text-sm font-medium text-white">
                              {getTemplateVisualLabel(template)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getPlanBadgeClass(
                              requiredPlan
                            )}`}
                          >
                            Da {getPlanLabel(requiredPlan)}
                          </span>

                          {template.is_featured && (
                            <span className="rounded-full border border-white/20 bg-white px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-950">
                              In evidenza
                            </span>
                          )}

                          {isSelected && (
                            <span className="rounded-full border border-white/20 bg-white px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-950">
                              Selezionato
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 text-xl font-medium text-neutral-100">
                          {template.name}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-neutral-500">
                          {template.description ||
                            "Template 3D disponibile per questa galleria."}
                        </p>

                        <dl className="mt-4 grid gap-3 text-xs text-neutral-500 sm:grid-cols-3">
                          <div>
                            <dt className="text-neutral-600">Unity key</dt>
                            <dd className="mt-1 break-all text-neutral-300">
                              {template.unity_scene_key}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-neutral-600">Max opere</dt>
                            <dd className="mt-1 text-neutral-300">
                              {template.max_artworks}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-neutral-600">Slug</dt>
                            <dd className="mt-1 break-all text-neutral-300">
                              {template.slug}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedTemplate && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
              Template selezionato
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr]">
              <div
                className={`relative min-h-28 overflow-hidden rounded-2xl border border-neutral-800 ${getTemplatePreviewClass(
                  selectedTemplate
                )}`}
              >
                {selectedTemplate.preview_image_url && (
                  <img
                    src={selectedTemplate.preview_image_url}
                    alt={selectedTemplate.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              <div>
                <h3 className="text-lg font-medium text-neutral-100">
                  {selectedTemplate.name}
                </h3>

                {selectedTemplate.description && (
                  <p className="mt-2 text-sm leading-6 text-neutral-400">
                    {selectedTemplate.description}
                  </p>
                )}

                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div>
                    <dt className="text-neutral-600">Unity key</dt>
                    <dd className="mt-1 break-all text-neutral-200">
                      {selectedTemplate.unity_scene_key}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-600">Piano minimo</dt>
                    <dd className="mt-1 text-neutral-200">
                      {getPlanLabel(
                        selectedTemplate.available_from_plan || "free"
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-neutral-600">Max opere</dt>
                    <dd className="mt-1 text-neutral-200">
                      {selectedTemplate.max_artworks}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canCreate || isLoading || templates.length === 0}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Creazione..." : "Crea galleria"}
        </button>

        {message && <p className="text-sm text-neutral-300">{message}</p>}
      </div>
    </form>
  );
}