"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bytesToMb,
  formatLimitValue,
  formatMb,
  type PlanName,
} from "@/lib/plans";

type CreateArtworkFormProps = {
  plan: PlanName | string;
  currentArtworkCount: number;
  maxArtworksTotal: number | null;
  storageUsedBytes: number;
  maxStorageMb: number | null;
  maxArtworkFileMb: number | null;
  canUpload: boolean;
  limitMessage?: string;
};

export default function CreateArtworkForm({
  plan,
  currentArtworkCount,
  maxArtworksTotal,
  storageUsedBytes,
  maxStorageMb,
  maxArtworkFileMb,
  canUpload,
  limitMessage,
}: CreateArtworkFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [year, setYear] = useState("");
  const [technique, setTechnique] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [depthCm, setDepthCm] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [description, setDescription] = useState("");
  const [isForSale, setIsForSale] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedFileSize, setSelectedFileSize] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const storageUsedMb = Number(bytesToMb(storageUsedBytes).toFixed(2));
  const selectedFileSizeMb =
    selectedFileSize === null
      ? 0
      : Number(bytesToMb(selectedFileSize).toFixed(2));

  const wouldUseStorage = storageUsedMb + selectedFileSizeMb;

  function resetForm() {
    setTitle("");
    setArtistName("");
    setYear("");
    setTechnique("");
    setDimensions("");
    setWidthCm("");
    setHeightCm("");
    setDepthCm("");
    setPrice("");
    setCurrency("EUR");
    setDescription("");
    setIsForSale(false);
    setIsPublic(true);
    setSelectedFileSize(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFileSize(null);
      return;
    }

    setSelectedFileSize(file.size);

    if (
      maxArtworkFileMb !== null &&
      bytesToMb(file.size) > maxArtworkFileMb
    ) {
      setMessage(
        `Il file pesa ${bytesToMb(file.size).toFixed(
          2
        )} MB. Il tuo piano consente massimo ${maxArtworkFileMb} MB per opera.`
      );
    } else {
      setMessage("");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canUpload) {
      setMessage(
        limitMessage || "Hai raggiunto il limite opere/storage del tuo piano."
      );
      return;
    }

    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setMessage("Devi caricare un file immagine.");
      return;
    }

    if (
      maxArtworkFileMb !== null &&
      bytesToMb(file.size) > maxArtworkFileMb
    ) {
      setMessage(
        `Il file supera il peso massimo consentito dal tuo piano: ${maxArtworkFileMb} MB.`
      );
      return;
    }

    if (
      maxStorageMb !== null &&
      storageUsedMb + bytesToMb(file.size) > maxStorageMb
    ) {
      setMessage(
        `Questo upload supererebbe lo storage del tuo piano: ${formatMb(
          maxStorageMb
        )}.`
      );
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const formData = new FormData();

      formData.append("title", title);
      formData.append("artist_name", artistName);
      formData.append("year", year);
      formData.append("technique", technique);
      formData.append("dimensions", dimensions);
      formData.append("width_cm", widthCm);
      formData.append("height_cm", heightCm);
      formData.append("depth_cm", depthCm);
      formData.append("price", price);
      formData.append("currency", currency);
      formData.append("description", description);
      formData.append("is_for_sale", String(isForSale));
      formData.append("is_public", String(isPublic));
      formData.append("image_file", file);

      const response = await fetch("/api/dashboard/artworks", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore creazione opera.");
        return;
      }

      setMessage("Opera caricata correttamente.");
      resetForm();
      router.refresh();
    } catch {
      setMessage("Errore di rete durante caricamento opera.");
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
        Nuova opera
      </p>

      <h2 className="text-2xl font-medium">Carica un opera</h2>

      <p className="mt-3 text-sm leading-6 text-neutral-400">
        Piano attuale:{" "}
        <span className="capitalize text-neutral-100">{plan}</span>
      </p>

      <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <p className="text-sm text-neutral-300">
          Opere: {currentArtworkCount} / {formatLimitValue(maxArtworksTotal)}
        </p>

        <p className="mt-1 text-sm text-neutral-300">
          Storage: {formatMb(storageUsedMb)} / {formatMb(maxStorageMb)}
        </p>

        <p className="mt-1 text-sm text-neutral-500">
          Peso massimo singola opera: {formatMb(maxArtworkFileMb)}
        </p>

        {selectedFileSize !== null && (
          <p className="mt-3 text-sm text-neutral-400">
            File selezionato: {selectedFileSizeMb.toFixed(2)} MB · Dopo upload:{" "}
            {wouldUseStorage.toFixed(2)} MB
          </p>
        )}

        {!canUpload && (
          <div className="mt-3 rounded-2xl border border-yellow-900 bg-yellow-950/30 p-4">
            <p className="text-sm leading-6 text-yellow-100">
              {limitMessage ||
                "Hai raggiunto il limite opere/storage del tuo piano."}
            </p>

            <a
              href="/pricing"
              className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              Passa a un piano superiore
            </a>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm text-neutral-300">
            Immagine opera
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={!canUpload || isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-neutral-300">
            Titolo
          </label>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={!canUpload || isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Titolo opera"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-neutral-300">
            Artista
          </label>

          <input
            value={artistName}
            onChange={(event) => setArtistName(event.target.value)}
            disabled={!canUpload || isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Nome artista"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-neutral-300">
              Anno
            </label>

            <input
              value={year}
              onChange={(event) => setYear(event.target.value)}
              disabled={!canUpload || isLoading}
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="2026"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-neutral-300">
              Dimensioni testuali
            </label>

            <input
              value={dimensions}
              onChange={(event) => setDimensions(event.target.value)}
              disabled={!canUpload || isLoading}
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="50 x 70 cm"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-neutral-500">
            Dimensioni reali per editor 3D
          </p>

          <p className="mb-4 text-sm leading-6 text-neutral-400">
            Inserisci larghezza e altezza reali dell opera in centimetri. Se non
            le inserisci, l editor userà un fallback di 50 x 50 cm.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-neutral-300">
                Larghezza cm
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={widthCm}
                onChange={(event) => setWidthCm(event.target.value)}
                disabled={!canUpload || isLoading}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="70"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-300">
                Altezza cm
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                disabled={!canUpload || isLoading}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-neutral-300">
                Profondità cm
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={depthCm}
                onChange={(event) => setDepthCm(event.target.value)}
                disabled={!canUpload || isLoading}
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="2"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-neutral-300">
            Tecnica
          </label>

          <input
            value={technique}
            onChange={(event) => setTechnique(event.target.value)}
            disabled={!canUpload || isLoading}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Olio su tela, stampa fine art..."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_120px]">
          <div>
            <label className="mb-2 block text-sm text-neutral-300">
              Prezzo
            </label>

            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={!canUpload || isLoading}
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="1200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-neutral-300">
              Valuta
            </label>

            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              disabled={!canUpload || isLoading}
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="EUR"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-neutral-300">
            Descrizione
          </label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={!canUpload || isLoading}
            className="min-h-28 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Descrizione dell opera"
          />
        </div>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
              disabled={!canUpload || isLoading}
              className="mt-1"
            />

            <span>
              Opera pubblica: visibile nel catalogo pubblico e nel viewer
              visitatore.
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={isForSale}
              onChange={(event) => setIsForSale(event.target.checked)}
              disabled={!canUpload || isLoading}
              className="mt-1"
            />

            <span>
              Opera in vendita: mostra badge commerciale e prezzo se inserito.
            </span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canUpload || isLoading}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Caricamento..." : "Carica opera"}
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