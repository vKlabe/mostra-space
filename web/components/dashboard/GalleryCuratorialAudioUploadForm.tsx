"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient as createSupabaseBrowserClient } from "@supabase/supabase-js";
import T from "@/components/i18n/T";

type PlanName = "free" | "pro" | "business" | "diamond" | "institution";

type CurrentCuratorialAudio = {
  title: string | null;
  audioUrl: string | null;
  storagePath: string | null;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
};

type GalleryCuratorialAudioUploadFormProps = {
  galleryId: string;
  plan: PlanName;
  isAdmin?: boolean;
  currentAudio?: CurrentCuratorialAudio | null;
};

type SignedUploadResponse = {
  success?: boolean;
  bucket?: string;
  path?: string;
  token?: string;
  publicUrl?: string;
  error?: string;
};

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_DURATION_SECONDS = 10 * 60;

const ALLOWED_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
]);

function canUseCuratorialAudio(plan: PlanName, isAdmin?: boolean) {
  return (
    isAdmin === true ||
    plan === "business" ||
    plan === "diamond" ||
    plan === "institution"
  );
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) {
    return "N/D";
  }

  const mb = bytes / 1024 / 1024;

  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }

  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) {
    return "N/D";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getBaseFileName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "").trim();
}

function getBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Variabili NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY mancanti."
    );
  }

  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);
}

async function readAudioDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.removeAttribute("src");
      audio.load();
    };

    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      const duration = Number(audio.duration);

      cleanup();

      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Durata audio non leggibile."));
        return;
      }

      resolve(duration);
    };

    audio.onerror = () => {
      cleanup();
      reject(new Error("Non riesco a leggere questo file audio."));
    };

    audio.src = objectUrl;
  });
}

export default function GalleryCuratorialAudioUploadForm({
  galleryId,
  plan,
  isAdmin = false,
  currentAudio = null,
}: GalleryCuratorialAudioUploadFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(currentAudio?.title || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDurationSeconds, setSelectedDurationSeconds] = useState<number | null>(
    null
  );
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  const isAllowed = canUseCuratorialAudio(plan, isAdmin);
  const hasCurrentAudio = Boolean(currentAudio?.audioUrl);

  const effectiveTitle = useMemo(() => {
    if (title.trim()) {
      return title.trim();
    }

    if (selectedFile) {
      return getBaseFileName(selectedFile.name);
    }

    return "";
  }, [selectedFile, title]);

  async function handleFileChange(file: File | null) {
    setMessage("");
    setSelectedFile(null);
    setSelectedDurationSeconds(null);

    if (!file) {
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      setMessage("Formato audio non supportato. Usa MP3, WAV, OGG, M4A o AAC.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setMessage("Audio troppo pesante. Il limite massimo è 25 MB.");
      return;
    }

    setIsReadingFile(true);

    try {
      const duration = await readAudioDuration(file);

      if (duration > MAX_DURATION_SECONDS) {
        setMessage("Audio troppo lungo. Il limite massimo è 10 minuti.");
        return;
      }

      setSelectedFile(file);
      setSelectedDurationSeconds(Math.round(duration));

      if (!title.trim()) {
        setTitle(getBaseFileName(file.name));
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Non riesco a leggere il file audio selezionato."
      );
    } finally {
      setIsReadingFile(false);
    }
  }

  async function handleUpload() {
    if (!isAllowed || !selectedFile) {
      return;
    }

    const cleanedTitle = effectiveTitle;

    if (!cleanedTitle) {
      setMessage("Inserisci un titolo per l’audio guida.");
      return;
    }

    if (!selectedDurationSeconds || selectedDurationSeconds > MAX_DURATION_SECONDS) {
      setMessage("Durata audio non valida.");
      return;
    }

    setIsUploading(true);
    setMessage("");

    try {
      const uploadUrlResponse = await fetch(
        `/api/dashboard/galleries/${galleryId}/curatorial-audio/upload-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileSizeBytes: selectedFile.size,
            mimeType: selectedFile.type,
          }),
        }
      );

      const uploadUrlData =
        (await uploadUrlResponse.json().catch(() => null)) as SignedUploadResponse | null;

      if (
        !uploadUrlResponse.ok ||
        !uploadUrlData?.bucket ||
        !uploadUrlData.path ||
        !uploadUrlData.token ||
        !uploadUrlData.publicUrl
      ) {
        throw new Error(
          uploadUrlData?.error || "Non riesco a preparare il caricamento audio."
        );
      }

      const supabase = getBrowserSupabaseClient();

      const { error: uploadError } = await supabase.storage
        .from(uploadUrlData.bucket)
        .uploadToSignedUrl(uploadUrlData.path, uploadUrlData.token, selectedFile, {
          contentType: selectedFile.type,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const updateResponse = await fetch(`/api/dashboard/galleries/${galleryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          curatorialAudio: {
            title: cleanedTitle,
            audioUrl: uploadUrlData.publicUrl,
            storagePath: uploadUrlData.path,
            durationSeconds: selectedDurationSeconds,
            fileSizeBytes: selectedFile.size,
            mimeType: selectedFile.type,
          },
        }),
      });

      const updateData = await updateResponse.json().catch(() => null);

      if (!updateResponse.ok) {
        throw new Error(
          updateData?.error || "Audio caricato, ma non riesco ad associarlo alla galleria."
        );
      }

      setMessage("Audio guida caricato correttamente.");
      setSelectedFile(null);
      setSelectedDurationSeconds(null);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Errore durante il caricamento audio."
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove() {
    if (!hasCurrentAudio || !isAllowed) {
      return;
    }

    const confirmed = window.confirm(
      "Vuoi rimuovere l’audio guida da questa galleria?"
    );

    if (!confirmed) {
      return;
    }

    setIsUploading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/dashboard/galleries/${galleryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          removeCuratorialAudio: true,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Non riesco a rimuovere l’audio guida.");
      }

      setTitle("");
      setSelectedFile(null);
      setSelectedDurationSeconds(null);
      setMessage("Audio guida rimosso dalla galleria.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Errore durante la rimozione audio."
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-amber-500">
        <T
          textKey="dashboard.galleryCuratorialAudio.header.label"
          fallback="Audio guida"
        />
      </p>

      <h2 className="text-2xl font-medium">
        <T
          textKey="dashboard.galleryCuratorialAudio.header.title"
          fallback="Audio proprietario della galleria"
        />
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
        <T
          textKey="dashboard.galleryCuratorialAudio.header.description"
          fallback="Carica una traccia audio introduttiva o curatoriale. Verrà riprodotta automaticamente nella visita pubblica, insieme alla soundtrack ambientale se presente."
        />
      </p>

      {!isAllowed && (
        <div className="mt-5 rounded-2xl border border-amber-900 bg-amber-950/25 p-4 text-sm leading-6 text-amber-100">
          <T
            textKey="dashboard.galleryCuratorialAudio.locked"
            fallback="Questa funzione è disponibile solo dai piani Business, Diamond e Institution."
          />
        </div>
      )}

      {hasCurrentAudio && (
        <div className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="text-sm font-medium text-neutral-100">
            {currentAudio?.title || (
              <T
                textKey="dashboard.galleryCuratorialAudio.current.untitled"
                fallback="Audio guida senza titolo"
              />
            )}
          </p>

          <dl className="mt-3 grid gap-2 text-xs text-neutral-500 md:grid-cols-3">
            <div>
              <dt className="uppercase tracking-[0.14em]">
                <T
                  textKey="dashboard.galleryCuratorialAudio.current.duration"
                  fallback="Durata"
                />
              </dt>
              <dd className="mt-1 text-neutral-300">
                {formatDuration(currentAudio?.durationSeconds)}
              </dd>
            </div>

            <div>
              <dt className="uppercase tracking-[0.14em]">
                <T
                  textKey="dashboard.galleryCuratorialAudio.current.size"
                  fallback="Peso"
                />
              </dt>
              <dd className="mt-1 text-neutral-300">
                {formatBytes(currentAudio?.fileSizeBytes)}
              </dd>
            </div>

            <div>
              <dt className="uppercase tracking-[0.14em]">
                <T
                  textKey="dashboard.galleryCuratorialAudio.current.format"
                  fallback="Formato"
                />
              </dt>
              <dd className="mt-1 text-neutral-300">
                {currentAudio?.mimeType || "N/D"}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-3">
            {currentAudio?.audioUrl && (
              <audio
                src={currentAudio.audioUrl}
                controls
                className="max-w-full"
                preload="metadata"
              />
            )}

            {isAllowed && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="rounded-full border border-red-900 px-5 py-2 text-sm text-red-200 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <T
                  textKey="dashboard.galleryCuratorialAudio.actions.remove"
                  fallback="Rimuovi audio"
                />
              </button>
            )}
          </div>
        </div>
      )}

      {isAllowed && (
        <div className="mt-6 grid gap-4">
          <div>
            <label className="mb-2 block text-sm text-neutral-300">
              <T
                textKey="dashboard.galleryCuratorialAudio.fields.title"
                fallback="Titolo audio"
              />
            </label>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isUploading}
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Introduzione curatoriale"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-neutral-300">
              <T
                textKey="dashboard.galleryCuratorialAudio.fields.file"
                fallback="File audio"
              />
            </label>

            <input
              type="file"
              accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/x-m4a,.mp3,.ogg,.wav,.m4a,.aac"
              disabled={isUploading || isReadingFile}
              onChange={(event) =>
                void handleFileChange(event.target.files?.[0] || null)
              }
              className="block w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
            />

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              <T
                textKey="dashboard.galleryCuratorialAudio.fields.fileHelp"
                fallback="Formati supportati: MP3, WAV, OGG, M4A, AAC. Limite massimo: 25 MB e 10 minuti."
              />
            </p>
          </div>

          {selectedFile && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
              <p className="font-medium text-neutral-100">{selectedFile.name}</p>
              <p className="mt-2 text-xs text-neutral-500">
                {formatBytes(selectedFile.size)} ·{" "}
                {formatDuration(selectedDurationSeconds)} · {selectedFile.type}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || isReadingFile || !selectedFile}
            className="w-fit rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <T
                textKey="dashboard.galleryCuratorialAudio.actions.uploading"
                fallback="Caricamento..."
              />
            ) : isReadingFile ? (
              <T
                textKey="dashboard.galleryCuratorialAudio.actions.reading"
                fallback="Lettura audio..."
              />
            ) : (
              <T
                textKey="dashboard.galleryCuratorialAudio.actions.upload"
                fallback="Carica audio guida"
              />
            )}
          </button>
        </div>
      )}

      {message && (
        <p className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300">
          {message}
        </p>
      )}
    </section>
  );
}
