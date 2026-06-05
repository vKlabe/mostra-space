"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminTemplateControlsProps = {
  templateId: string;
  currentName: string;
  currentSlug: string;
  currentDescription: string | null;
  currentUnitySceneKey: string;
  currentIsFree: boolean;
  currentIsActive: boolean;
  currentMaxArtworks: number;
};

export default function AdminTemplateControls({
  templateId,
  currentName,
  currentSlug,
  currentDescription,
  currentUnitySceneKey,
  currentIsFree,
  currentIsActive,
  currentMaxArtworks,
}: AdminTemplateControlsProps) {
  const router = useRouter();

  const [name, setName] = useState(currentName);
  const [slug, setSlug] = useState(currentSlug);
  const [description, setDescription] = useState(currentDescription || "");
  const [unitySceneKey, setUnitySceneKey] = useState(currentUnitySceneKey);
  const [isFree, setIsFree] = useState(currentIsFree);
  const [isActive, setIsActive] = useState(currentIsActive);
  const [maxArtworks, setMaxArtworks] = useState(currentMaxArtworks);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const hasChanges =
    name !== currentName ||
    slug !== currentSlug ||
    description !== (currentDescription || "") ||
    unitySceneKey !== currentUnitySceneKey ||
    isFree !== currentIsFree ||
    isActive !== currentIsActive ||
    maxArtworks !== currentMaxArtworks;

  async function handleSave() {
    if (!hasChanges) {
      setMessage("Nessuna modifica da salvare.");
      return;
    }

    if (!name.trim()) {
      setMessage("Il nome template e obbligatorio.");
      return;
    }

    if (!slug.trim()) {
      setMessage("Lo slug template e obbligatorio.");
      return;
    }

    if (!unitySceneKey.trim()) {
      setMessage("La Unity scene key e obbligatoria.");
      return;
    }

    if (maxArtworks < 1) {
      setMessage("Il numero massimo opere deve essere almeno 1.");
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
          isFree,
          isActive,
          maxArtworks,
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

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={isFree}
            onChange={(event) => setIsFree(event.target.checked)}
            disabled={isLoading}
            className="mt-1"
          />

          <span>Template disponibile per piano free</span>
        </label>

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