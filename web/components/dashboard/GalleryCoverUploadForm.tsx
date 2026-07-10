"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GalleryCoverUploadFormProps = {
  galleryId: string;
  ownerId: string;
  currentTitle: string;
  currentDescription: string | null;
  currentCoverImageUrl: string | null;
};

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9.\-_]/g, "");
}

const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_COVER_LONG_SIDE_PX = 2048;

function readImageSize(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const result = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };

      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Impossibile leggere l’immagine."));
    };

    image.src = objectUrl;
  });
}

export default function GalleryCoverUploadForm({
  galleryId,
  ownerId,
  currentTitle,
  currentDescription,
  currentCoverImageUrl,
}: GalleryCoverUploadFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(currentCoverImageUrl || "");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];

  setMessage("");

  if (!file) {
    setSelectedFile(null);
    return;
  }

  if (!ALLOWED_COVER_TYPES.includes(file.type)) {
    setSelectedFile(null);
    setMessage("Formato non supportato. Usa solo JPG, PNG o WEBP.");
    event.target.value = "";
    return;
  }

  const maxSizeMb = 8;
  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    setSelectedFile(null);
    setMessage(`Il file è troppo pesante. Massimo ${maxSizeMb} MB.`);
    event.target.value = "";
    return;
  }

  try {
    const { width, height } = await readImageSize(file);
    const longestSide = Math.max(width, height);

    if (longestSide > MAX_COVER_LONG_SIDE_PX) {
      setSelectedFile(null);
      setMessage(
        `Immagine troppo grande: ${width}×${height}px. Il lato lungo massimo consentito è ${MAX_COVER_LONG_SIDE_PX}px.`
      );
      event.target.value = "";
      return;
    }
  } catch {
    setSelectedFile(null);
    setMessage("Impossibile leggere l’immagine. Usa JPG, PNG o WEBP.");
    event.target.value = "";
    return;
  }

  setSelectedFile(file);

  const localPreviewUrl = URL.createObjectURL(file);
  setPreviewUrl(localPreviewUrl);
}

  async function handleUpload() {
    if (!selectedFile) {
      setMessage("Seleziona prima un'immagine.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const safeName = sanitizeFileName(selectedFile.name);
      const filePath = `${ownerId}/${galleryId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery-covers")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        setMessage(uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("gallery-covers")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const response = await fetch(`/api/dashboard/galleries/${galleryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: currentTitle,
          description: currentDescription || "",
          coverImageUrl: publicUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Upload completato, ma salvataggio cover fallito.");
        return;
      }

      setPreviewUrl(publicUrl);
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setMessage("Cover caricata e salvata correttamente.");
      router.refresh();
    } catch {
      setMessage("Errore durante upload cover.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
        Cover galleria
      </p>

      <h2 className="text-2xl font-medium">Carica immagine di copertina</h2>

      <p className="mt-3 text-sm leading-6 text-neutral-400">
        Questa immagine verrà usata nella lista pubblica delle gallerie e come
        anteprima della galleria.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="block w-full cursor-pointer rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-300 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-950"
          />

          <p className="mt-2 text-xs text-neutral-500">
            Consigliato: immagine orizzontale 16:10 o 16:9. Formati JPG, PNG o WEBP. Lato lungo massimo 2048px. Massimo 8 MB.
          </p>
        </div>

        {previewUrl && (
          <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
            <img
              src={previewUrl}
              alt="Anteprima cover galleria"
              className="h-64 w-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={isLoading || !selectedFile}
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Caricamento..." : "Carica e salva cover"}
          </button>

          {message && (
            <p className="text-sm text-neutral-300">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}