"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

const MAX_PREVIEW_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_PREVIEW_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

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

function getReadableFileSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function validatePreviewFile(file: File) {
  if (!ALLOWED_PREVIEW_TYPES.includes(file.type)) {
    return "Formato non supportato. Usa JPG, PNG oppure WEBP.";
  }

  if (file.size > MAX_PREVIEW_SIZE_BYTES) {
    return "La preview non può superare 2 MB.";
  }

  if (file.size <= 0) {
    return "Il file selezionato è vuoto.";
  }

  return "";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewLocalUrl, setPreviewLocalUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewMessageType, setPreviewMessageType] = useState<
    "success" | "error" | ""
  >("");

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
    sortOrder !== currentSortOrder;

  useEffect(() => {
    setPreviewImageUrl(currentPreviewImageUrl || "");
  }, [currentPreviewImageUrl]);

  useEffect(() => {
    if (!previewFile) {
      setPreviewLocalUrl("");
      return;
    }

    const localUrl = URL.createObjectURL(previewFile);
    setPreviewLocalUrl(localUrl);

    return () => URL.revokeObjectURL(localUrl);
  }, [previewFile]);

  function handlePreviewFileChange(file: File | null) {
    setPreviewMessage("");
    setPreviewMessageType("");

    if (!file) {
      setPreviewFile(null);
      return;
    }

    const validationError = validatePreviewFile(file);

    if (validationError) {
      setPreviewMessageType("error");
      setPreviewMessage(validationError);
      setPreviewFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setPreviewFile(file);
  }

  async function handlePreviewUpload() {
    if (!previewFile) {
      setPreviewMessageType("error");
      setPreviewMessage("Seleziona prima un file immagine.");
      return;
    }

    const validationError = validatePreviewFile(previewFile);

    if (validationError) {
      setPreviewMessageType("error");
      setPreviewMessage(validationError);
      return;
    }

    setIsPreviewLoading(true);
    setPreviewMessage("");
    setPreviewMessageType("");

    try {
      const formData = new FormData();
      formData.append("preview_file", previewFile);

      const response = await fetch(
        `/api/admin/templates/${templateId}/preview`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setPreviewMessageType("error");
        setPreviewMessage(data.error || "Errore upload preview.");
        return;
      }

      const nextPreviewImageUrl =
        (data?.data?.previewImageUrl as string | undefined) || "";

      setPreviewImageUrl(nextPreviewImageUrl);
      setPreviewFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setPreviewMessageType("success");
      setPreviewMessage("Preview caricata correttamente.");
      router.refresh();
    } catch {
      setPreviewMessageType("error");
      setPreviewMessage("Errore di rete durante upload preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handlePreviewRemove() {
    if (!previewImageUrl) {
      setPreviewMessageType("");
      setPreviewMessage("Nessuna preview da rimuovere.");
      return;
    }

    setIsPreviewLoading(true);
    setPreviewMessage("");
    setPreviewMessageType("");

    try {
      const response = await fetch(
        `/api/admin/templates/${templateId}/preview`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setPreviewMessageType("error");
        setPreviewMessage(data.error || "Errore rimozione preview.");
        return;
      }

      setPreviewImageUrl("");
      setPreviewFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setPreviewMessageType("success");
      setPreviewMessage("Preview rimossa correttamente.");
      router.refresh();
    } catch {
      setPreviewMessageType("error");
      setPreviewMessage("Errore di rete durante rimozione preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

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

  const controlsDisabled = isLoading || isPreviewLoading;
  const previewToShow = previewLocalUrl || previewImageUrl;

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
            disabled={controlsDisabled}
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
            disabled={controlsDisabled}
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
            disabled={controlsDisabled}
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
            disabled={controlsDisabled}
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
            disabled={controlsDisabled}
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
            disabled={controlsDisabled}
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
            disabled={controlsDisabled}
            className="mt-1"
          />

          <span>Template attivo e selezionabile</span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(event) => setIsFeatured(event.target.checked)}
            disabled={controlsDisabled}
            className="mt-1"
          />

          <span>Template in evidenza nel dashboard</span>
        </label>

        <div className="md:col-span-2">
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Preview template
          </label>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                handlePreviewFileChange(event.target.files?.[0] || null)
              }
              disabled={controlsDisabled}
              className="block w-full text-sm text-neutral-400 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-950 hover:file:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            />

            <p className="mt-3 text-xs leading-5 text-neutral-500">
              JPG, PNG o WEBP · massimo 2 MB · formato consigliato 16:9,
              1200×675 px.
            </p>

            {previewFile && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-neutral-200">
                    {previewFile.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {getReadableFileSize(previewFile.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewFile(null);

                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  disabled={controlsDisabled}
                  className="rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Annulla file
                </button>
              </div>
            )}

            {previewToShow ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
                <img
                  src={previewToShow}
                  alt={`Preview ${name}`}
                  className="aspect-video w-full object-cover"
                />
              </div>
            ) : (
              <div className="mt-4 flex aspect-video items-center justify-center rounded-2xl border border-dashed border-neutral-700 bg-neutral-950 px-6 text-center">
                <p className="text-sm text-neutral-500">
                  Nessuna preview caricata.
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handlePreviewUpload}
                disabled={controlsDisabled || !previewFile}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPreviewLoading
                  ? "Caricamento..."
                  : previewImageUrl
                    ? "Sostituisci preview"
                    : "Carica preview"}
              </button>

              <button
                type="button"
                onClick={handlePreviewRemove}
                disabled={controlsDisabled || !previewImageUrl}
                className="rounded-full border border-red-900 px-4 py-2 text-sm text-red-300 transition hover:border-red-700 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Rimuovi preview
              </button>

              {previewMessage && (
                <p
                  className={
                    previewMessageType === "error"
                      ? "text-sm text-red-300"
                      : previewMessageType === "success"
                        ? "text-sm text-green-300"
                        : "text-sm text-neutral-400"
                  }
                >
                  {previewMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Descrizione
          </label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={controlsDisabled}
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
          La disponibilità reale viene gestita da available_from_plan. is_free
          resta come campo legacy.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={controlsDisabled || !hasChanges}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Salvataggio..." : "Salva template"}
        </button>

        {message && <p className="text-sm text-neutral-400">{message}</p>}
      </div>
    </div>
  );
}
