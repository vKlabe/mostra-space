"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import T from "@/components/i18n/T";

type SoundtrackOption = {
  id: string;
  title: string;
  mood: string | null;
  loopDurationSeconds: number | null;
  isActive?: boolean;
};

type EditGalleryDetailsFormProps = {
  galleryId: string;
  currentTitle?: string | null;
  currentSlug?: string | null;
  currentDescription?: string | null;
  currentSoundtrackId?: string | null;
  currentSoundtrackInitialVolume?: number | null;
  soundtracks?: SoundtrackOption[];
};

function slugify(value: string | null | undefined) {
  const safeValue = typeof value === "string" ? value : "";

  return safeValue
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatLoopDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function getSoundtrackOptionLabel(soundtrack: SoundtrackOption) {
  const parts = [soundtrack.title];

  if (soundtrack.mood) {
    parts.push(soundtrack.mood);
  }

  const duration = formatLoopDuration(soundtrack.loopDurationSeconds);

  if (duration) {
    parts.push(duration);
  }

  if (soundtrack.isActive === false) {
    parts.push("disattivata");
  }

  return parts.join(" · ");
}

function normalizeVolumePercent(value: number | null | undefined, fallback = 35) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function EditGalleryDetailsForm({
  galleryId,
  currentTitle = "",
  currentSlug = "",
  currentDescription = "",
  currentSoundtrackId = null,
  currentSoundtrackInitialVolume = 35,
  soundtracks = [],
}: EditGalleryDetailsFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(currentTitle || "");
  const [slug, setSlug] = useState(slugify(currentSlug || currentTitle || ""));
  const [description, setDescription] = useState(currentDescription || "");
  const [selectedSoundtrackId, setSelectedSoundtrackId] = useState(
    currentSoundtrackId || ""
  );
  const [soundtrackInitialVolume, setSoundtrackInitialVolume] = useState(
    normalizeVolumePercent(currentSoundtrackInitialVolume, 35)
  );

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const publicPath = useMemo(() => {
    const safeSlug = slugify(slug);

    if (!safeSlug) {
      return "/gallerie/slug-galleria";
    }

    return `/gallerie/${safeSlug}`;
  }, [slug]);

  function handleTitleChange(value: string) {
    setTitle(value);

    if (!slug) {
      setSlug(slugify(value));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedTitle = title.trim();
    const cleanedSlug = slugify(slug || title);

    if (!cleanedTitle) {
      setMessage("Il titolo della galleria è obbligatorio.");
      return;
    }

    if (!cleanedSlug) {
      setMessage("Lo slug pubblico non è valido.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/dashboard/galleries/${galleryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: cleanedTitle,
          slug: cleanedSlug,
          description: description.trim() || null,
          soundtrackId: selectedSoundtrackId || null,
          soundtrackInitialVolume,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore aggiornamento galleria.");
        return;
      }

      setSlug(cleanedSlug);
      setMessage("Dati galleria aggiornati correttamente.");
      router.refresh();
    } catch {
      setMessage("Errore di rete durante aggiornamento galleria.");
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
        <T
          textKey="dashboard.galleryDetailsForm.header.label"
          fallback="Dati pubblici"
        />
      </p>

      <h2 className="text-2xl font-medium">
        <T
          textKey="dashboard.galleryDetailsForm.header.title"
          fallback="Modifica dati galleria"
        />
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
        <T
          textKey="dashboard.galleryDetailsForm.header.description"
          fallback="Queste informazioni vengono usate nella pagina pubblica della galleria. Da qui puoi anche scegliere la musica ambientale della visita e il suo volume iniziale."
        />
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-neutral-300">
            <T
              textKey="dashboard.galleryDetailsForm.fields.title"
              fallback="Titolo"
            />
          </label>

          <input
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Titolo galleria"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-neutral-300">
            <T
              textKey="dashboard.galleryDetailsForm.fields.publicSlug"
              fallback="Slug pubblico"
            />
          </label>

          <input
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="slug-galleria"
            required
          />

          <p className="mt-2 break-all text-xs text-neutral-500">
            <T
              textKey="dashboard.galleryDetailsForm.fields.publicLink"
              fallback="Link pubblico:"
            />{" "}
            {publicPath}
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm text-neutral-300">
            <T
              textKey="dashboard.galleryDetailsForm.fields.description"
              fallback="Descrizione"
            />
          </label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isLoading}
            className="min-h-28 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Descrizione pubblica della galleria"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm text-neutral-300">
            <T
              textKey="dashboard.galleryDetailsForm.fields.soundtrack"
              fallback="Soundtrack galleria"
            />
          </label>

          <select
            value={selectedSoundtrackId}
            onChange={(event) => setSelectedSoundtrackId(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Nessuna musica</option>

            {soundtracks.map((soundtrack) => (
              <option key={soundtrack.id} value={soundtrack.id}>
                {getSoundtrackOptionLabel(soundtrack)}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            <T
              textKey="dashboard.galleryDetailsForm.fields.soundtrackHelp"
              fallback="La musica scelta verrà riprodotta in loop nella pagina pubblica della galleria. Il visitatore potrà disattivarla o regolare il volume."
            />
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="grid gap-2 text-sm text-neutral-300">
            <span className="flex items-center justify-between gap-3">
              <span>
                <T
                  textKey="dashboard.galleryDetailsForm.fields.soundtrackInitialVolume"
                  fallback="Volume iniziale soundtrack"
                />
              </span>
              <span className="text-xs text-neutral-500">
                {soundtrackInitialVolume}%
              </span>
            </span>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={soundtrackInitialVolume}
              onChange={(event) =>
                setSoundtrackInitialVolume(Number(event.target.value))
              }
              disabled={isLoading}
              className="w-full accent-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            <T
              textKey="dashboard.galleryDetailsForm.fields.soundtrackInitialVolumeHelp"
              fallback="Questo è il volume con cui la soundtrack partirà quando il visitatore entra nella galleria. Il visitatore potrà comunque modificarlo dal player."
            />
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <T
              textKey="dashboard.galleryDetailsForm.actions.saving"
              fallback="Salvataggio..."
            />
          ) : (
            <T
              textKey="dashboard.galleryDetailsForm.actions.save"
              fallback="Salva dati pubblici"
            />
          )}
        </button>

        {message && <p className="text-sm text-neutral-300">{message}</p>}
      </div>
    </form>
  );
}
