"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import T from "@/components/i18n/T";

type EditGalleryDetailsFormProps = {
  galleryId: string;
  currentTitle?: string | null;
  currentSlug?: string | null;
  currentDescription?: string | null;
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

export default function EditGalleryDetailsForm({
  galleryId,
  currentTitle = "",
  currentSlug = "",
  currentDescription = "",
}: EditGalleryDetailsFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(currentTitle || "");
  const [slug, setSlug] = useState(slugify(currentSlug || currentTitle || ""));
  const [description, setDescription] = useState(currentDescription || "");

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
          fallback="Queste informazioni vengono usate nella pagina pubblica della galleria."
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

        {message && (
          <p className="text-sm text-neutral-300">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}