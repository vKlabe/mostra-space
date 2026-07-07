"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type GalleryOption = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  cover_image_url: string | null;
  hasActiveEvent: boolean;
};

type CreateGalleryEventFormProps = {
  galleries: GalleryOption[];
};

function toLocalDateTimeValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);

  return localDate.toISOString().slice(0, 16);
}

export default function CreateGalleryEventForm({
  galleries,
}: CreateGalleryEventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const firstAvailableGallery = useMemo(
    () => galleries.find((gallery) => !gallery.hasActiveEvent),
    [galleries]
  );

  const defaultStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setMinutes(0, 0, 0);

    return toLocalDateTimeValue(date);
  }, []);

  const [galleryId, setGalleryId] = useState(firstAvailableGallery?.id || "");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!galleryId) {
      setMessage({
        type: "error",
        text: "Seleziona una galleria.",
      });
      return;
    }

    if (!title.trim()) {
      setMessage({
        type: "error",
        text: "Inserisci un titolo evento.",
      });
      return;
    }

    try {
      const response = await fetch("/api/dashboard/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          galleryId,
          title,
          description,
          startsAt,
          durationMinutes,
          timezone: "Europe/Rome",
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Non riesco a creare l'evento.");
      }

      setTitle("");
      setDescription("");
      setDurationMinutes("60");
      setGalleryId("");
      setMessage({
        type: "success",
        text: "Evento creato. È visibile nel calendario pubblico e nei calendari dei follower.",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Non riesco a creare l'evento.",
      });
    }
  }

  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-amber-500">
        Nuovo evento
      </p>

      <h2 className="font-serif text-3xl text-neutral-50">
        Crea evento collegato a una galleria
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
        Puoi collegare anche una galleria in bozza. L'immagine evento sarà la
        cover della galleria. Ogni galleria può avere massimo un evento attivo.
      </p>

      {message && (
        <div
          className={
            message.type === "success"
              ? "mt-5 rounded-2xl border border-emerald-900 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-200"
              : "mt-5 rounded-2xl border border-red-900 bg-red-950/35 px-4 py-3 text-sm text-red-200"
          }
        >
          {message.text}
        </div>
      )}

      <form onSubmit={createEvent} className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Galleria
          </span>
          <select
            value={galleryId}
            onChange={(event) => setGalleryId(event.target.value)}
            className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-amber-600"
          >
            <option value="">Seleziona galleria</option>
            {galleries.map((gallery) => (
              <option
                key={gallery.id}
                value={gallery.id}
                disabled={gallery.hasActiveEvent}
              >
                {gallery.title} · {gallery.status}
                {gallery.hasActiveEvent ? " · evento attivo già presente" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Titolo evento
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="Es. Vernissage digitale, visita guidata, opening online..."
            className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-amber-600"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Data e orario
            </span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-amber-600"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Durata
            </span>
            <select
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-amber-600"
            >
              <option value="30">30 min</option>
              <option value="60">1 ora</option>
              <option value="90">1 ora e 30</option>
              <option value="120">2 ore</option>
            </select>
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Descrizione breve
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={600}
            rows={4}
            placeholder="Due righe per raccontare cosa succede durante l'evento."
            className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm leading-7 text-neutral-100 outline-none transition focus:border-amber-600"
          />
          <span className="text-xs text-neutral-600">
            {description.length}/600 caratteri
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-full bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creo evento..." : "Crea evento"}
        </button>
      </form>
    </section>
  );
}
