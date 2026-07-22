"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type AdminSoundtrackControlsProps = {
  soundtrackId: string;
  currentTitle: string;
  currentMood: string | null;
  currentLoopDurationSeconds: number | null;
  currentAudioUrl: string;
  currentStoragePath: string | null;
  currentIsActive: boolean;
  currentSortOrder: number;
};

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

export default function AdminSoundtrackControls({
  soundtrackId,
  currentTitle,
  currentMood,
  currentLoopDurationSeconds,
  currentAudioUrl,
  currentStoragePath,
  currentIsActive,
  currentSortOrder,
}: AdminSoundtrackControlsProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(currentTitle);
  const [mood, setMood] = useState(currentMood || "");
  const [loopDurationSeconds, setLoopDurationSeconds] = useState(
    currentLoopDurationSeconds ? String(currentLoopDurationSeconds) : ""
  );
  const [isActive, setIsActive] = useState(currentIsActive);
  const [sortOrder, setSortOrder] = useState(String(currentSortOrder));
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [message, setMessage] = useState("");
  const [audioMessage, setAudioMessage] = useState("");

  const hasChanges =
    title !== currentTitle ||
    mood !== (currentMood || "") ||
    loopDurationSeconds !==
      (currentLoopDurationSeconds ? String(currentLoopDurationSeconds) : "") ||
    isActive !== currentIsActive ||
    sortOrder !== String(currentSortOrder);

  async function handleSave() {
    if (!hasChanges) {
      setMessage("Nessuna modifica da salvare.");
      return;
    }

    if (!title.trim()) {
      setMessage("Il titolo è obbligatorio.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/soundtracks/${soundtrackId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          mood: mood.trim(),
          loopDurationSeconds: loopDurationSeconds.trim(),
          isActive,
          sortOrder: sortOrder.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore aggiornamento soundtrack.");
        return;
      }

      setMessage("Soundtrack aggiornata correttamente.");
      router.refresh();
    } catch {
      setMessage("Errore di rete durante aggiornamento soundtrack.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAudioUpload() {
    const validationError = validateAudioFile(audioFile);

    if (validationError) {
      setAudioMessage(validationError);
      return;
    }

    setIsUploadingAudio(true);
    setAudioMessage("");

    try {
      const formData = new FormData();

      if (audioFile) {
        formData.append("audio_file", audioFile);
      }

      const response = await fetch(
        `/api/admin/soundtracks/${soundtrackId}/audio`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setAudioMessage(data.error || "Errore upload audio.");
        return;
      }

      setAudioFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setAudioMessage("Audio sostituito correttamente.");
      router.refresh();
    } catch {
      setAudioMessage("Errore di rete durante upload audio.");
    } finally {
      setIsUploadingAudio(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Vuoi eliminare questa soundtrack? Se è collegata a una galleria, la galleria resterà senza musica."
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/soundtracks/${soundtrackId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore eliminazione soundtrack.");
        return;
      }

      router.refresh();
    } catch {
      setMessage("Errore di rete durante eliminazione soundtrack.");
    } finally {
      setIsSaving(false);
    }
  }

  const controlsDisabled = isSaving || isUploadingAudio;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="mb-4 text-xs uppercase tracking-[0.22em] text-neutral-500">
        Controlli soundtrack
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Titolo
          </label>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={controlsDisabled}
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
            disabled={controlsDisabled}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Durata loop
          </label>

          <input
            type="number"
            min={1}
            value={loopDurationSeconds}
            onChange={(event) => setLoopDurationSeconds(event.target.value)}
            disabled={controlsDisabled}
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
            disabled={controlsDisabled}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            disabled={controlsDisabled}
            className="mt-1"
          />

          <span>Soundtrack attiva</span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={controlsDisabled || !hasChanges}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Salvataggio..." : "Salva dati"}
        </button>

        {message && <p className="text-sm text-neutral-400">{message}</p>}
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-neutral-600">
          Sostituisci audio
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav"
          onChange={(event) => setAudioFile(event.target.files?.[0] || null)}
          disabled={controlsDisabled}
          className="block w-full text-sm text-neutral-400 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-950 hover:file:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        />

        <p className="mt-3 text-xs leading-5 text-neutral-500">
          File attuale:{" "}
          <span className="break-all text-neutral-400">
            {currentStoragePath || currentAudioUrl}
          </span>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAudioUpload}
            disabled={controlsDisabled || !audioFile}
            className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploadingAudio ? "Caricamento..." : "Sostituisci audio"}
          </button>

          {audioMessage && (
            <p className="text-sm text-neutral-400">{audioMessage}</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/20 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-red-300">
          Zona pericolosa
        </p>

        <p className="mt-2 text-sm leading-6 text-red-100/80">
          Eliminare una soundtrack la rimuove dalla libreria e scollega le
          eventuali gallerie che la stanno usando.
        </p>

        <button
          type="button"
          onClick={handleDelete}
          disabled={controlsDisabled}
          className="mt-4 rounded-full border border-red-900 px-4 py-2 text-sm text-red-300 transition hover:border-red-700 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Elimina soundtrack
        </button>
      </div>
    </div>
  );
}
