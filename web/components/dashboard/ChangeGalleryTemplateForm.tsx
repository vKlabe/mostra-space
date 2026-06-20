"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GalleryTemplateForChange = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unity_scene_key: string;
  max_artworks: number;
  available_from_plan: string | null;
  preview_image_url?: string | null;
  is_featured?: boolean | null;
  sort_order?: number | null;
};

type ChangeGalleryTemplateFormProps = {
  galleryId: string;
  currentTemplateId: string | null;
  templates: GalleryTemplateForChange[];
  currentGalleryArtworkCount: number;
  positionedArtworkCount: number;
  unpositionedArtworkCount: number;
};

type TemplatePlan = "free" | "pro" | "business" | "institution";

const PLAN_GROUPS: Array<{
  key: TemplatePlan;
  label: string;
  description: string;
}> = [
  {
    key: "free",
    label: "Free",
    description: "Template inclusi nel piano gratuito.",
  },
  {
    key: "pro",
    label: "Pro",
    description: "Spazi disponibili dal piano Pro.",
  },
  {
    key: "business",
    label: "Business",
    description: "Template professionali per progetti più articolati.",
  },
  {
    key: "institution",
    label: "Institution",
    description: "Spazi riservati a istituzioni e progetti avanzati.",
  },
];

function normalizePlan(plan: string | null | undefined): TemplatePlan {
  if (plan === "institution") return "institution";
  if (plan === "business") return "business";
  if (plan === "pro") return "pro";
  return "free";
}

function getPlanLabel(plan: string | null | undefined) {
  if (plan === "institution") return "Institution";
  if (plan === "business") return "Business";
  if (plan === "pro") return "Pro";
  return "Free";
}

function getPlanBadgeClass(plan: string | null | undefined) {
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

function getTemplateVisualLabel(template: GalleryTemplateForChange) {
  const key = `${template.unity_scene_key} ${template.slug}`.toLowerCase();

  if (key.includes("black") || key.includes("dark")) return "Dark Space";
  if (key.includes("industrial")) return "Industrial";
  if (key.includes("museum")) return "Museum";
  if (key.includes("booth")) return "Booth";
  if (key.includes("alpine")) return "Alpine Space";
  if (key.includes("showcase")) return "Showcase";
  if (key.includes("double")) return "Double Room";
  if (key.includes("minimal")) return "Minimal";
  if (key.includes("white")) return "White Cube";
  if (key.includes("basic")) return "Basic Room";

  return "Gallery Space";
}

function getTemplatePreviewClass(template: GalleryTemplateForChange) {
  const key = `${template.unity_scene_key} ${template.slug}`.toLowerCase();

  if (key.includes("black") || key.includes("dark")) {
    return "bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.20),_transparent_28%),linear-gradient(135deg,_#050505,_#171717_45%,_#000000)]";
  }

  if (key.includes("industrial")) {
    return "bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_25%),linear-gradient(135deg,_#27211c,_#111111_50%,_#3a3128)]";
  }

  if (key.includes("museum") || key.includes("minimal")) {
    return "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_32%),linear-gradient(135deg,_#e5e0d6,_#8b8174_48%,_#211f1d)]";
  }

  if (key.includes("booth") || key.includes("showcase")) {
    return "bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.30),_transparent_30%),linear-gradient(135deg,_#f3f3f3,_#9ca3af_55%,_#1f2937)]";
  }

  if (key.includes("alpine")) {
    return "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.45),_transparent_30%),linear-gradient(135deg,_#d9dde3,_#8290a3_52%,_#15202d)]";
  }

  if (key.includes("white")) {
    return "bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_transparent_32%),linear-gradient(135deg,_#f5f5f5,_#bdbdbd_55%,_#3f3f46)]";
  }

  return "bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.45),_transparent_30%),linear-gradient(135deg,_#262626,_#111827_55%,_#020617)]";
}

export default function ChangeGalleryTemplateForm({
  galleryId,
  currentTemplateId,
  templates,
  currentGalleryArtworkCount,
  positionedArtworkCount,
  unpositionedArtworkCount,
}: ChangeGalleryTemplateFormProps) {
  const router = useRouter();

  const currentTemplate = templates.find(
    (template) => template.id === currentTemplateId,
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    currentTemplateId || templates[0]?.id || "",
  );
  const [openPlan, setOpenPlan] = useState<TemplatePlan | null>(
    normalizePlan(currentTemplate?.available_from_plan),
  );
  const [confirmTemplateChange, setConfirmTemplateChange] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  );

  const groupedTemplates = PLAN_GROUPS.map((group) => ({
    ...group,
    templates: templates.filter(
      (template) => normalizePlan(template.available_from_plan) === group.key,
    ),
  })).filter((group) => group.templates.length > 0);

  const hasSelectedDifferentTemplate =
    Boolean(selectedTemplateId) && selectedTemplateId !== currentTemplateId;

  const hasExistingLayout = currentGalleryArtworkCount > 0;

  const canSubmit =
    hasSelectedDifferentTemplate &&
    (!hasExistingLayout || confirmTemplateChange) &&
    !isLoading;

  function selectTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    setConfirmTemplateChange(false);
    setMessage("");
    setMessageType("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTemplateId) {
      setMessageType("error");
      setMessage("Seleziona un template.");
      return;
    }

    if (!hasSelectedDifferentTemplate) {
      setMessageType("");
      setMessage("Hai già selezionato il template attuale.");
      return;
    }

    if (hasExistingLayout && !confirmTemplateChange) {
      setMessageType("error");
      setMessage(
        "Conferma di voler cambiare template: la galleria ha già opere o posizioni salvate.",
      );
      return;
    }

    setIsLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(`/api/dashboard/galleries/${galleryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: selectedTemplateId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error || "Errore aggiornamento template.");
        return;
      }

      setMessageType("success");
      setMessage(
        "Template aggiornato. Apri l’editor 3D e controlla l’allestimento.",
      );
      setConfirmTemplateChange(false);
      router.refresh();
    } catch {
      setMessageType("error");
      setMessage("Errore di rete durante aggiornamento template.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Template galleria
          </p>

          <h2 className="text-2xl font-medium">Cambia template</h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
            Scegli l’ambiente 3D della galleria. Le opere resteranno collegate,
            ma dopo il cambio potrebbe essere necessario controllarne le
            posizioni nell’editor.
          </p>
        </div>

        <a
          href={`/dashboard/gallerie-editor/${galleryId}`}
          className="inline-flex w-fit rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          Apri editor 3D
        </a>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
            Template attuale
          </p>

          <p className="mt-2 text-lg font-medium text-neutral-100">
            {currentTemplate?.name || "Template non trovato"}
          </p>

          <p className="mt-1 break-all text-xs text-neutral-500">
            {currentTemplate?.unity_scene_key || "N/D"}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
            Opere nella galleria
          </p>

          <p className="mt-2 text-lg font-medium text-neutral-100">
            {currentGalleryArtworkCount}
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            {positionedArtworkCount} posizionate · {unpositionedArtworkCount}{" "}
            non posizionate
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
            Effetto cambio
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-300">
            Il catalogo resta invariato. Dopo il cambio controlla pareti e
            posizioni nell’editor.
          </p>
        </div>
      </div>

      {templates.length === 0 && (
        <div className="mt-6 rounded-2xl border border-yellow-900 bg-yellow-950/30 p-4">
          <p className="text-sm leading-6 text-yellow-100">
            Nessun template disponibile per il tuo piano.
          </p>
        </div>
      )}

      {templates.length > 0 && (
        <div className="mt-6 space-y-3">
          {groupedTemplates.map((group) => {
            const isOpen = openPlan === group.key;
            const groupContainsCurrent = group.templates.some(
              (template) => template.id === currentTemplateId,
            );
            const groupContainsSelected = group.templates.some(
              (template) => template.id === selectedTemplateId,
            );

            return (
              <section
                key={group.key}
                className={
                  groupContainsSelected
                    ? "overflow-hidden rounded-2xl border border-neutral-600 bg-neutral-950"
                    : "overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
                }
              >
                <button
                  type="button"
                  onClick={() => setOpenPlan(isOpen ? null : group.key)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-neutral-900"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getPlanBadgeClass(
                        group.key,
                      )}`}
                    >
                      {group.label}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-neutral-100">
                          Template {group.label}
                        </h3>

                        {groupContainsCurrent && (
                          <span className="rounded-full border border-green-900 bg-green-950/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-green-300">
                            Template attuale in questo gruppo
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-neutral-500">
                        {group.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-neutral-500">
                      {group.templates.length} template
                    </span>

                    <span
                      className={`text-lg text-neutral-400 transition ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    >
                      ↓
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-neutral-800 p-4">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {group.templates.map((template) => {
                        const isSelected = template.id === selectedTemplateId;
                        const isCurrent = template.id === currentTemplateId;
                        const requiredPlan =
                          template.available_from_plan || "free";

                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => selectTemplate(template.id)}
                            disabled={isLoading}
                            className={
                              isSelected
                                ? "group overflow-hidden rounded-2xl border border-white bg-neutral-900 text-left shadow-xl transition disabled:cursor-not-allowed disabled:opacity-50"
                                : "group overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 text-left transition hover:-translate-y-0.5 hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                            }
                          >
                            <div
                              className={`relative aspect-[16/9] overflow-hidden ${getTemplatePreviewClass(
                                template,
                              )}`}
                            >
                              {template.preview_image_url ? (
                                <img
                                  src={template.preview_image_url}
                                  alt={template.name}
                                  className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                                />
                              ) : (
                                <div className="absolute inset-0 bg-black/10" />
                              )}

                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                              <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                                {template.is_featured && (
                                  <span className="rounded-full border border-white/20 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-neutral-950">
                                    In evidenza
                                  </span>
                                )}

                                {isCurrent && (
                                  <span className="rounded-full border border-green-700/70 bg-green-950/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-green-200 backdrop-blur">
                                    Attuale
                                  </span>
                                )}

                                {isSelected && !isCurrent && (
                                  <span className="rounded-full border border-white/30 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-neutral-950">
                                    Selezionato
                                  </span>
                                )}
                              </div>

                              <div className="absolute inset-x-3 bottom-3">
                                <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">
                                  {getTemplateVisualLabel(template)}
                                </p>

                                <h4 className="mt-1 text-base font-medium text-white">
                                  {template.name}
                                </h4>
                              </div>
                            </div>

                            <div className="p-4">
                              <p className="line-clamp-2 min-h-10 text-sm leading-5 text-neutral-400">
                                {template.description ||
                                  "Template 3D disponibile per questa galleria."}
                              </p>

                              <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-800 pt-3 text-xs">
                                <span className="text-neutral-500">
                                  Max{" "}
                                  <span className="text-neutral-200">
                                    {template.max_artworks}
                                  </span>{" "}
                                  opere
                                </span>

                                <span
                                  className={`rounded-full border px-2.5 py-1 uppercase tracking-[0.12em] ${getPlanBadgeClass(
                                    requiredPlan,
                                  )}`}
                                >
                                  {getPlanLabel(requiredPlan)}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {selectedTemplate && hasSelectedDifferentTemplate && (
        <div className="mt-5 rounded-2xl border border-white/20 bg-neutral-950 p-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                Nuovo template selezionato
              </p>

              <h3 className="mt-2 text-lg font-medium text-neutral-100">
                {selectedTemplate.name}
              </h3>

              <p className="mt-1 text-sm text-neutral-400">
                Piano minimo:{" "}
                <span className="text-neutral-100">
                  {getPlanLabel(selectedTemplate.available_from_plan)}
                </span>{" "}
                · Max opere:{" "}
                <span className="text-neutral-100">
                  {selectedTemplate.max_artworks}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => selectTemplate(currentTemplateId || "")}
              disabled={!currentTemplateId || isLoading}
              className="shrink-0 rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annulla selezione
            </button>
          </div>
        </div>
      )}

      {hasExistingLayout && hasSelectedDifferentTemplate && (
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-yellow-900 bg-yellow-950/30 p-4 text-sm leading-6 text-yellow-100">
          <input
            type="checkbox"
            checked={confirmTemplateChange}
            onChange={(event) => setConfirmTemplateChange(event.target.checked)}
            disabled={isLoading}
            className="mt-1"
          />

          <span>
            Confermo di voler cambiare template. So che le opere resteranno
            collegate, ma dovrò controllare l’allestimento nell’editor 3D perché
            pareti e posizioni potrebbero non combaciare con il nuovo ambiente.
          </span>
        </label>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Aggiornamento..." : "Aggiorna template"}
        </button>

        {message && (
          <p
            className={
              messageType === "error"
                ? "text-sm text-red-300"
                : messageType === "success"
                  ? "text-sm text-green-300"
                  : "text-sm text-neutral-400"
            }
          >
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
