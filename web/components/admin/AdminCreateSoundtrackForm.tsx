"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
];

function validateAudioFile(file: File | null) {
  if (!file) {
    return "Seleziona un file audio.";
  }

  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return "Formato audio non supportato. Usa MP3, OGG oppure WAV leggero.";
  }

  if (file.size <= 0) {
    return "Il file audio selezionato è vuoto.";
  }

  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return "Il file audio non può superare 10 MB.";
  }

  return "";
}

export default function AdminCreateSoundtrackForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [mood, setMood] = useState("");
  const [loopDurationSeconds, setLoopDurationSeconds] = useState("");
  const [sortOrder, setSortOrder] = useState("100");
  const [isActive, setIsActive] = useState(true);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedTitle = title.trim();

    if (!cleanedTitle) {
      setMessage("Il titolo della soundtrack è obbligatorio.");
      return;
    }

    const validationError = validateAudioFile(audioFile);

    if (validationError) {
      setMessage(validationError);
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const formData = new FormData();

      formData.append("title", cleanedTitle);
      formData.append("mood", mood.trim());
      formData.append("loopDurationSeconds", loopDurationSeconds.trim());
      formData.append("sortOrder", sortOrder.trim());
      formData.append("isActive", String(isActive));

      if (audioFile) {
        formData.append("audio_file", audioFile);
      }

      const response = await fetch("/api/admin/soundtracks", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore creazione soundtrack.");
        return;
      }

      setTitle("");
      setMood("");
      setLoopDurationSeconds("");
      setSortOrder("100");
      setIsActive(true);
      setAudioFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setMessage("Soundtrack creata correttamente.");
      router.refresh();
    } catch {
      setMessage("Errore di rete durante creazione soundtrack.");
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
        Nuova soundtrack
      </p>

      <h2 className="text-2xl font-medium">Carica musica galleria</h2>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
        Carica loop audio leggeri per le gallerie pubbliche. Consigliato MP3,
        durata 30–120 secondi, peso massimo 10 MB.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Titolo
          </label>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isLoading}
            placeholder="Ambient Museum Loop"
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Mood
          </label>

          <input
            value={mood}
            onChange={(event) => setMood(event.target.value)}
            disabled={isLoading}
            placeholder="Ambient / Dark museum / Soft piano"
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Durata loop in secondi
          </label>

          <input
            type="number"
            min={1}
            value={loopDurationSeconds}
            onChange={(event) => setLoopDurationSeconds(event.target.value)}
            disabled={isLoading}
            placeholder="60"
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Ordine
          </label>

          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            File audio
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav"
            onChange={(event) => setAudioFile(event.target.files?.[0] || null)}
            disabled={isLoading}
            className="block w-full text-sm text-neutral-400 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-950 hover:file:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          />

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            MP3 consigliato · massimo 10 MB · il file verrà riprodotto in loop.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300 md:col-span-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            disabled={isLoading}
            className="mt-1"
          />

          <span>Attiva subito questa soundtrack nel dropdown gallerie</span>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Caricamento..." : "Crea soundtrack"}
        </button>

        {message && <p className="text-sm text-neutral-300">{message}</p>}
      </div>
    </form>
  );
}
