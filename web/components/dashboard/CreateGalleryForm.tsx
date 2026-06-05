"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatLimitValue, type PlanName } from "@/lib/plans";

type GalleryTemplate = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unity_scene_key: string;
  is_free: boolean;
  max_artworks: number;
  available_from_plan?: string | null;
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
        <span className="capitalize text-neutral-100">{plan}</span>
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
          <label className="mb-2 block text-sm text-neutral-300">
            Template stanza
          </label>

          <select
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            disabled={!canCreate || isLoading || templates.length === 0}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            {templates.length === 0 && (
              <option value="">Nessun template disponibile</option>
            )}

            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} - max {template.max_artworks} opere
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs text-neutral-500">
            I template disponibili dipendono dal piano account.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canCreate || isLoading || templates.length === 0}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Creazione..." : "Crea galleria"}
        </button>

        {message && (
          <p className="text-sm text-neutral-300">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}