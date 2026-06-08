"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type TemplatePlan = "free" | "pro" | "business" | "institution";

type AdminTemplateControlsProps = {
  templateId: string;
  currentName: string;
  currentSlug: string;
  currentDescription: string | null;
  currentUnitySceneKey: string;
  currentIsFree: boolean;
  currentIsActive: boolean;
  currentMaxArtworks: number;
  currentAvailableFromPlan: TemplatePlan;
  currentPreviewImageUrl: string | null;
  currentIsFeatured: boolean;
  currentSortOrder: number;
};

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

export default function AdminTemplateControls({
  templateId,
  currentName,
  currentSlug,
  currentDescription,
  currentUnitySceneKey,
  currentIsFree,
  currentIsActive,
  currentMaxArtworks,
  currentAvailableFromPlan,
  currentPreviewImageUrl,
  currentIsFeatured,
  currentSortOrder,
}: AdminTemplateControlsProps) {
  const router = useRouter();

  const [name, setName] = useState(currentName);
  const [slug, setSlug] = useState(currentSlug);
  const [description, setDescription] = useState(currentDescription || "");
  const [unitySceneKey, setUnitySceneKey] = useState(currentUnitySceneKey);
  const [availableFromPlan, setAvailableFromPlan] =
    useState<TemplatePlan>(currentAvailableFromPlan);
  const [isActive, setIsActive] = useState(currentIsActive);
  const [isFeatured, setIsFeatured] = useState(currentIsFeatured);
  const [maxArtworks, setMaxArtworks] = useState(currentMaxArtworks);
  const [sortOrder, setSortOrder] = useState(currentSortOrder);
  const [previewImageUrl, setPreviewImageUrl] = useState(
    currentPreviewImageUrl || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const nextIsFree = availableFromPlan === "free";

  const hasChanges =
    name !== currentName ||
    slug !== currentSlug ||
    description !== (currentDescription || "") ||
    unitySceneKey !== currentUnitySceneKey ||
    nextIsFree !== currentIsFree ||
    availableFromPlan !== currentAvailableFromPlan ||
    isActive !== currentIsActive ||
    isFeatured !== currentIsFeatured ||
    maxArtworks !== currentMaxArtworks ||
    sortOrder !== currentSortOrder ||
    previewImageUrl !== (currentPreviewImageUrl || "");

  async function handleSave() {
    if (!hasChanges) {
      setMessage("Nessuna modifica da salvare.");
      return;
    }

    if (!name.trim()) {
      setMessage("Il nome template è obbligatorio.");
      return;
    }

    if (!slug.trim()) {
      setMessage("Lo slug template è obbligatorio.");
      return;
    }

    if (!unitySceneKey.trim()) {
      setMessage("La Unity scene key è obbligatoria.");
      return;
    }

    if (maxArtworks < 1) {
      setMessage("Il numero massimo opere deve essere almeno 1.");
      return;
    }

    if (sortOrder < 0) {
      setMessage("L’ordine deve essere 0 o superiore.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          description,
          unitySceneKey,
          availableFromPlan,
          isFree: nextIsFree,
          isActive,
          isFeatured,
          maxArtworks,
          sortOrder,
          previewImageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore aggiornamento template.");
        return;
      }

      setMessage("Template aggiornato correttamente.");
      router.refresh();
    } catch {
      setMessage("Errore di rete durante aggiornamento template.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Nome
          </label>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Slug
          </label>

          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Unity scene key
          </label>

          <input
            value={unitySceneKey}
            onChange={(event) => setUnitySceneKey(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Max opere
          </label>

          <input
            type="number"
            min={1}
            value={maxArtworks}
            onChange={(event) => setMaxArtworks(Number(event.target.value))}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Piano minimo
          </label>

          <select
            value={availableFromPlan}
            onChange={(event) =>
              setAvailableFromPlan(event.target.value as TemplatePlan)
            }
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
            <option value="institution">Institution</option>
          </select>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Il template sarà disponibile da {getPlanLabel(availableFromPlan)} in
            su.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Ordine visualizzazione
          </label>

          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(event) => setSortOrder(Number(event.target.value))}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          />

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Numeri più bassi appaiono prima.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            disabled={isLoading}
            className="mt-1"
          />

          <span>Template attivo e selezionabile</span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(event) => setIsFeatured(event.target.checked)}
            disabled={isLoading}
            className="mt-1"
          />

          <span>Template in evidenza nel dashboard</span>
        </label>

        <div className="md:col-span-2">
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Preview image URL
          </label>

          <input
            value={previewImageUrl}
            onChange={(event) => setPreviewImageUrl(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="https://..."
          />

          {previewImageUrl && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
              <img
                src={previewImageUrl}
                alt="Preview template"
                className="h-48 w-full object-cover"
              />
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Descrizione
          </label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isLoading}
            className="min-h-24 w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <p className="text-sm text-neutral-300">
          Compatibilità vecchio campo:{" "}
          <span className="text-neutral-100">
            is_free = {nextIsFree ? "true" : "false"}
          </span>
        </p>

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Da ora la disponibilità reale viene gestita da available_from_plan.
          is_free resta solo come campo legacy.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Salvataggio..." : "Salva template"}
        </button>

        {message && <p className="text-sm text-neutral-400">{message}</p>}
      </div>
    </div>
  );
}