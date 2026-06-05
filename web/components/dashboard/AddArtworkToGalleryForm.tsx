"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatLimitValue, type PlanName } from "@/lib/plans";

type Artwork = {
  id: string;
  title: string;
  artist_name: string | null;
  year: string | null;
  image_url: string;
};

type AddArtworkToGalleryFormProps = {
  galleryId: string;
  artworks: Artwork[];
  linkedArtworkIds: string[];
  plan: PlanName | string;
  currentGalleryArtworkCount: number;
  maxArtworksPerGallery: number | null;
  templateMaxArtworks: number | null;
  effectiveLimit: number | null;
  canAddArtwork: boolean;
  limitMessage?: string;
};

export default function AddArtworkToGalleryForm({
  galleryId,
  artworks,
  linkedArtworkIds,
  plan,
  currentGalleryArtworkCount,
  maxArtworksPerGallery,
  templateMaxArtworks,
  effectiveLimit,
  canAddArtwork,
  limitMessage,
}: AddArtworkToGalleryFormProps) {
  const router = useRouter();

  const availableArtworks = useMemo(() => {
    return artworks.filter((artwork) => !linkedArtworkIds.includes(artwork.id));
  }, [artworks, linkedArtworkIds]);

  const [artworkId, setArtworkId] = useState(availableArtworks[0]?.id || "");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canAddArtwork) {
      setMessage(
        limitMessage ||
          "Questa galleria ha raggiunto il limite di opere consentito."
      );
      return;
    }

    if (!artworkId) {
      setMessage("Seleziona un opera da aggiungere.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/dashboard/gallery-artworks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          galleryId,
          artworkId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Errore collegamento opera.");
        return;
      }

      setMessage("Opera aggiunta alla galleria.");
      router.refresh();
    } catch {
      setMessage("Errore di rete durante il collegamento opera.");
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
        Aggiungi opera
      </p>

      <h2 className="text-2xl font-medium">Collega opera alla galleria</h2>

      <p className="mt-3 text-sm leading-6 text-neutral-400">
        Scegli un opera dal tuo archivio. Dopo averla aggiunta potrai
        posizionarla nello spazio tramite editor Unity.
      </p>

      <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <p className="text-sm text-neutral-300">
          Piano attuale:{" "}
          <span className="capitalize text-neutral-100">{plan}</span>
        </p>

        <p className="mt-1 text-sm text-neutral-300">
          Opere in galleria: {currentGalleryArtworkCount} /{" "}
          {formatLimitValue(effectiveLimit)}
        </p>

        <p className="mt-1 text-xs text-neutral-500">
          Limite piano: {formatLimitValue(maxArtworksPerGallery)} · Limite
          template: {formatLimitValue(templateMaxArtworks)}
        </p>

        {!canAddArtwork && (
          <div className="mt-3 rounded-2xl border border-yellow-900 bg-yellow-950/30 p-4">
            <p className="text-sm leading-6 text-yellow-100">
              {limitMessage ||
                "Questa galleria ha raggiunto il limite di opere consentito."}
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

      <div className="mt-6">
        <label className="mb-2 block text-sm text-neutral-300">
          Opera
        </label>

        <select
          value={artworkId}
          onChange={(event) => setArtworkId(event.target.value)}
          disabled={
            !canAddArtwork ||
            isLoading ||
            availableArtworks.length === 0
          }
          className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 outline-none transition focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
          required
        >
          {availableArtworks.length === 0 && (
            <option value="">Nessuna opera disponibile</option>
          )}

          {availableArtworks.map((artwork) => (
            <option key={artwork.id} value={artwork.id}>
              {artwork.title}
              {artwork.artist_name ? ` — ${artwork.artist_name}` : ""}
              {artwork.year ? `, ${artwork.year}` : ""}
            </option>
          ))}
        </select>

        {availableArtworks.length === 0 && (
          <p className="mt-2 text-xs text-neutral-500">
            Tutte le opere disponibili sono già collegate a questa galleria,
            oppure non hai ancora caricato opere.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={
            !canAddArtwork ||
            isLoading ||
            availableArtworks.length === 0
          }
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Aggiunta..." : "Aggiungi opera"}
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