"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type TemplatePlan = "free" | "pro" | "business" | "institution";

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
  if (plan === "institution") {
    return "Visibile solo agli account Institution.";
  }

  if (plan === "business") {
    return "Visibile da Business in su.";
  }

  if (plan === "pro") {
    return "Visibile da Pro in su.";
  }

  return "Visibile anche agli account Free.";
}

export default function AdminCreateTemplateForm() {
  const router = useRouter();

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
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  function handleNameChange(value: string) {
    setName(value);

    if (!slug) {
      setSlug(slugify(value));
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
          previewImageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error || "Errore creazione template.");
        return;
      }

      setMessageType("success");
      setMessage("Template creato correttamente.");

      setName("");
      setSlug("");
      setDescription("");
      setUnitySceneKey("");
      setAvailableFromPlan("free");
      setIsActive(true);
      setIsFeatured(false);
      setMaxArtworks(20);
      setSortOrder(100);
      setPreviewImageUrl("");

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
            Piano minimo
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
            <option value="institution">Institution</option>
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
            Preview image URL
          </label>

          <input
            value={previewImageUrl}
            onChange={(event) => setPreviewImageUrl(event.target.value)}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="https://..."
          />

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Per ora puoi incollare un URL immagine. L’upload diretto lo
            collegheremo in una fase successiva.
          </p>

          {previewImageUrl && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
              <img
                src={previewImageUrl}
                alt="Preview template"
                className="h-48 w-full object-cover"
              />
            </div>
          )}
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
          {isLoading ? "Creazione..." : "Crea template"}
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