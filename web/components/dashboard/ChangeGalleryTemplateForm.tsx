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

function getPlanLabel(plan: string | null | undefined) {
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

function getTemplatePreviewClass(template: GalleryTemplateForChange) {
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

export default function ChangeGalleryTemplateForm({
  galleryId,
  currentTemplateId,
  templates,
  currentGalleryArtworkCount,
  positionedArtworkCount,
  unpositionedArtworkCount,
}: ChangeGalleryTemplateFormProps) {
  const router = useRouter();

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    currentTemplateId || templates[0]?.id || ""
  );
  const [confirmTemplateChange, setConfirmTemplateChange] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId
  );

  const currentTemplate = templates.find(
    (template) => template.id === currentTemplateId
  );

  const hasSelectedDifferentTemplate =
    Boolean(selectedTemplateId) && selectedTemplateId !== currentTemplateId;

  const hasExistingLayout = currentGalleryArtworkCount > 0;

  const canSubmit =
    hasSelectedDifferentTemplate &&
    (!hasExistingLayout || confirmTemplateChange) &&
    !isLoading;

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
        "Conferma di voler cambiare template: la galleria ha già opere o posizioni salvate."
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
        "Template aggiornato. Apri l’editor 3D e controlla l’allestimento."
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
            Puoi cambiare l’ambiente 3D della galleria. Le opere associate non
            verranno eliminate, ma alcune posizioni potrebbero non combaciare
            con le pareti del nuovo template.
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
            {positionedArtworkCount} posizionate · {unpositionedArtworkCount} non
            posizionate
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
            Effetto cambio
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-300">
            Le opere restano collegate. Dopo il cambio controlla pareti e
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
        <div className="mt-6 grid gap-3">
          {templates.map((template) => {
            const isSelected = template.id === selectedTemplateId;
            const isCurrent = template.id === currentTemplateId;
            const requiredPlan = template.available_from_plan || "free";

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                disabled={isLoading}
                className={
                  isSelected
                    ? "overflow-hidden rounded-3xl border border-white bg-neutral-950 text-left shadow-2xl transition disabled:cursor-not-allowed disabled:opacity-50"
                    : "overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 text-left transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                }
              >
                <div className="grid gap-0 md:grid-cols-[180px_1fr]">
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

                      {isCurrent && (
                        <span className="rounded-full border border-green-900 bg-green-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-green-300">
                          Attuale
                        </span>
                      )}

                      {isSelected && !isCurrent && (
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

      {selectedTemplate && (
        <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
            Nuovo template selezionato
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

              <p className="mt-2 break-all text-sm text-neutral-500">
                {selectedTemplate.unity_scene_key}
              </p>

              <p className="mt-2 text-sm text-neutral-400">
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