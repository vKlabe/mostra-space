"use client";

import { useEffect, useState } from "react";
import T from "@/components/i18n/T";

type FavoriteArtworkButtonProps = {
  artworkId: string;
};

export default function FavoriteArtworkButton({
  artworkId,
}: FavoriteArtworkButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkFavorite() {
      try {
        const response = await fetch(
          `/api/favorites/artworks?artworkId=${encodeURIComponent(artworkId)}`
        );

        const data = await response.json();

        if (!active) return;

        if (response.status === 401) {
          setMessage("Accedi per salvare quest’opera.");
          setLoading(false);
          return;
        }

        if (!response.ok) {
          setMessage("");
          setLoading(false);
          return;
        }

        setIsFavorite(Boolean(data.isFavorite));
        setMessage("");
      } catch {
        if (active) setMessage("");
      } finally {
        if (active) setLoading(false);
      }
    }

    checkFavorite();

    return () => {
      active = false;
    };
  }, [artworkId]);

  async function toggleFavorite() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/favorites/artworks", {
        method: isFavorite ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setMessage("Accedi per salvare quest’opera.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setMessage(data.details || data.error || "Errore durante il salvataggio.");
        setLoading(false);
        return;
      }

      setIsFavorite(Boolean(data.isFavorite));
      setMessage(
        data.isFavorite
          ? "Opera salvata nei preferiti."
          : "Opera rimossa dai preferiti."
      );
    } catch {
      setMessage("Errore di rete. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={loading}
        className={
          isFavorite
            ? "inline-flex rounded-full bg-white px-4 py-2 text-xs font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            : "inline-flex rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {loading ? (
          <T
            textKey="artwork.favorites.actions.checking"
            fallback="Controllo..."
          />
        ) : isFavorite ? (
          <T
            textKey="artwork.favorites.actions.saved"
            fallback="Opera salvata"
          />
        ) : (
          <T
            textKey="artwork.favorites.actions.save"
            fallback="Salva opera"
          />
        )}
      </button>

      {message && (
        <p className="text-xs leading-5 text-neutral-500">{message}</p>
      )}
    </div>
  );
}