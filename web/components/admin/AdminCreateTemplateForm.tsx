"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getTemplateAccessPlanLabel,
  type TemplateAccessPlan,
} from "@/lib/plans";

type TemplatePlan = TemplateAccessPlan;

const MAX_PREVIEW_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_PREVIEW_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

function getPlanDescription(plan: TemplatePlan) {
  if (plan === "marketplace") {
    return "Venduto nel marketplace. Non viene sbloccato dai piani.";
  }

  if (plan === "institution") {
    return "Visibile solo agli account Institution.";
  }

  if (plan === "diamond") {
    return "Visibile da Diamond in su.";
  }

  if (plan === "business") {
    return "Visibile da Business in su.";
  }

  if (plan === "pro") {
    return "Visibile da Pro in su.";
  }

  return "Visibile anche agli account Free.";
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

function euroInputToCents(value: string) {
  const cleaned = value.trim().replace(",", ".");

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

function normalizeCurrency(value: string) {
  const cleaned = value.trim().toLowerCase();

  return cleaned || "eur";
}

export default function AdminCreateTemplateForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [unitySceneKey, setUnitySceneKey] = useState("");
  const [availableFromPlan, setAvailableFromPlan] =
    useState<TemplatePlan>("free");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [maxArtworks, setMaxArtworks] = useState(20);
  const [sortOrder, setSortOrder] = useState(100);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewLocalUrl, setPreviewLocalUrl] = useState("");

  const [marketplacePrice, setMarketplacePrice] = useState("");
  const [marketplaceCurrency, setMarketplaceCurrency] = useState("eur");
  const [marketplaceIsActive, setMarketplaceIsActive] = useState(false);
  const [marketplaceDescription, setMarketplaceDescription] = useState("");
  const [marketplacePreviewImageUrl, setMarketplacePreviewImageUrl] =
    useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const isMarketplace = availableFromPlan === "marketplace";

  useEffect(() => {
    if (!previewFile) {
      setPreviewLocalUrl("");
      return;
    }

    const localUrl = URL.createObjectURL(previewFile);
    setPreviewLocalUrl(localUrl);

    return () => URL.revokeObjectURL(localUrl);
  }, [previewFile]);

  function handleNameChange(value: string) {
    setName(value);

    if (!slug) {
      setSlug(slugify(value));
    }
  }

  function handlePreviewFileChange(file: File | null) {
    setMessage("");
    setMessageType("");

    if (!file) {
      setPreviewFile(null);
      return;
    }

    const validationError = validatePreviewFile(file);

    if (validationError) {
      setMessageType("error");
      setMessage(validationError);
      setPreviewFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setPreviewFile(file);
  }

  function resetForm() {
    setName("");
    setSlug("");
    setDescription("");
    setUnitySceneKey("");
    setAvailableFromPlan("free");
    setIsActive(true);
    setIsFeatured(false);
    setMaxArtworks(20);
    setSortOrder(100);
    setPreviewFile(null);
    setMarketplacePrice("");
    setMarketplaceCurrency("eur");
    setMarketplaceIsActive(false);
    setMarketplaceDescription("");
    setMarketplacePreviewImageUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setMessageType("error");
      setMessage("Il nome template è obbligatorio.");
      return;
    }

    if (!slug.trim()) {
      setMessageType("error");
      setMessage("Lo slug template è obbligatorio.");
      return;
    }

    if (!unitySceneKey.trim()) {
      setMessageType("error");
      setMessage("La Unity scene key è obbligatoria.");
      return;
    }

    if (maxArtworks < 1) {
      setMessageType("error");
      setMessage("Il numero massimo opere deve essere almeno 1.");
      return;
    }

    if (sortOrder < 0) {
      setMessageType("error");
      setMessage("L’ordine deve essere 0 o superiore.");
      return;
    }

    const marketplacePriceCents = isMarketplace
      ? euroInputToCents(marketplacePrice)
      : null;

    if (isMarketplace && !marketplacePriceCents) {
      setMessageType("error");
      setMessage("Per i template marketplace devi inserire un prezzo valido.");
      return;
    }

    if (previewFile) {
      const validationError = validatePreviewFile(previewFile);

      if (validationError) {
        setMessageType("error");
        setMessage(validationError);
        return;
      }
    }

    setIsLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch("/api/admin/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          description,
          unitySceneKey,
          availableFromPlan,
          isActive,
          isFeatured,
          maxArtworks,
          sortOrder,
          marketplacePriceCents,
          marketplaceCurrency: normalizeCurrency(marketplaceCurrency),
          marketplaceIsActive: isMarketplace && marketplaceIsActive,
          marketplaceDescription: isMarketplace ? marketplaceDescription : "",
          marketplacePreviewImageUrl: isMarketplace
            ? marketplacePreviewImageUrl
            : "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error || "Errore creazione template.");
        return;
      }

      const templateId = data?.data?.template?.id as string | undefined;

      if (!templateId) {
        setMessageType("error");
        setMessage(
          "Template creato, ma la risposta non contiene il suo identificativo."
        );
        router.refresh();
        return;
      }

      if (previewFile) {
        const previewFormData = new FormData();
        previewFormData.append("preview_file", previewFile);

        const uploadResponse = await fetch(
          `/api/admin/templates/${templateId}/preview`,
          {
            method: "POST",
            body: previewFormData,
          }
        );

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          setMessageType("error");
          setMessage(
            `Template creato, ma la preview non è stata caricata: ${
              uploadData.error || "errore upload"
            }. Puoi riprovare dalla scheda del template.`
          );
          resetForm();
          router.refresh();
          return;
        }
      }

      setMessageType("success");
      setMessage(
        previewFile
          ? "Template e preview creati correttamente."
          : "Template creato correttamente."
      );

      resetForm();
      router.refresh();
    } catch {
      setMessageType("error");
      setMessage("Errore di rete durante creazione template.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Nuovo template
          </p>

          <h2 className="text-2xl font-medium">Crea template</h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
            Crea un record nel registry dei template. La Unity scene key deve
            corrispondere a un ambiente realmente disponibile nella build Unity.
          </p>
        </div>

        <span className="inline-flex w-fit rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs uppercase tracking-[0.16em] text-neutral-500">
          Admin only
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Nome
          </label>

          <input
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="White Cube"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Slug
          </label>

          <input
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="white-cube"
            required
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
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="white_cube"
            required
          />

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Deve combaciare con la chiave usata da Unity per caricare
            l’ambiente.
          </p>
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
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Piano minimo / Accesso
          </label>

          <select
            value={availableFromPlan}
            onChange={(event) =>
              setAvailableFromPlan(event.target.value as TemplatePlan)
            }
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
            <option value="diamond">Diamond</option>
            <option value="institution">Institution</option>
            <option value="marketplace">Marketplace</option>
          </select>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            {getPlanDescription(availableFromPlan)}
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
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          />

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Numeri più bassi appaiono prima.
          </p>
        </div>

        {isMarketplace && (
          <div className="md:col-span-2 rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4">
            <p className="mb-4 text-xs uppercase tracking-[0.22em] text-amber-300">
              Marketplace
            </p>

            <div className="grid gap-4 md:grid-cols-[1fr_140px]">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
                  Prezzo
                </label>

                <input
                  value={marketplacePrice}
                  onChange={(event) => setMarketplacePrice(event.target.value)}
                  disabled={isLoading}
                  placeholder="39,00"
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  Inserisci il prezzo in euro. Esempio: 19,00 oppure 39,00.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
                  Valuta
                </label>

                <input
                  value={marketplaceCurrency}
                  onChange={(event) =>
                    setMarketplaceCurrency(event.target.value.toLowerCase())
                  }
                  disabled={isLoading}
                  placeholder="eur"
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={marketplaceIsActive}
                onChange={(event) =>
                  setMarketplaceIsActive(event.target.checked)
                }
                disabled={isLoading}
                className="mt-1"
              />

              <span>Pubblica questo template nel marketplace</span>
            </label>

            <div className="mt-4">
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
                Descrizione marketplace
              </label>

              <textarea
                value={marketplaceDescription}
                onChange={(event) =>
                  setMarketplaceDescription(event.target.value)
                }
                disabled={isLoading}
                className="min-h-24 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Descrizione commerciale del template per la pagina marketplace."
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
                Immagine preview marketplace
              </label>

              <input
                value={marketplacePreviewImageUrl}
                onChange={(event) =>
                  setMarketplacePreviewImageUrl(event.target.value)
                }
                disabled={isLoading}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Lascia vuoto per usare la preview normale"
              />

              <p className="mt-2 text-xs leading-5 text-neutral-500">
                Puoi lasciare vuoto questo campo: useremo la preview standard.
              </p>
            </div>
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            disabled={isLoading}
            className="mt-1"
          />

          <span>Template attivo e selezionabile</span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(event) => setIsFeatured(event.target.checked)}
            disabled={isLoading}
            className="mt-1"
          />

          <span>Template in evidenza nel dashboard</span>
        </label>

        <div className="md:col-span-2">
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Preview template
          </label>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                handlePreviewFileChange(event.target.files?.[0] || null)
              }
              disabled={isLoading}
              className="block w-full text-sm text-neutral-400 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-950 hover:file:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            />

            <p className="mt-3 text-xs leading-5 text-neutral-500">
              JPG, PNG o WEBP · massimo 2 MB · formato consigliato 16:9,
              1200×675 px.
            </p>

            {previewFile && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
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
                  disabled={isLoading}
                  className="rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Rimuovi selezione
                </button>
              </div>
            )}

            {previewLocalUrl && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
                <img
                  src={previewLocalUrl}
                  alt="Anteprima file template"
                  className="aspect-video w-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-neutral-600">
            Descrizione
          </label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isLoading}
            className="min-h-24 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Spazio minimale a pareti bianche, pensato per esposizioni pulite e leggibili."
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading
            ? previewFile
              ? "Creazione e upload..."
              : "Creazione..."
            : "Crea template"}
        </button>

        {message && (
          <p
            className={
              messageType === "error"
                ? "text-sm text-red-300"
                : "text-sm text-green-300"
            }
          >
            {message}
          </p>
        )}
      </div>
    </form>
  );
}