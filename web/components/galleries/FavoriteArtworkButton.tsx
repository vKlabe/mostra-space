"use client";

import { useEffect, useState } from "react";
import FavoriteActionView, { type FavoriteFeedback } from "./FavoriteActionView";

type FavoriteArtworkButtonProps = {
  artworkId: string;
};

export default function FavoriteArtworkButton({
  artworkId,
}: FavoriteArtworkButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FavoriteFeedback | null>(null);

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
          setFeedback("signIn");
          setLoading(false);
          return;
        }

        if (!response.ok) {
          setFeedback("saveError");
          setLoading(false);
          return;
        }

        setIsFavorite(Boolean(data.isFavorite));
        setFeedback(null);
      } catch {
        if (active) setFeedback("networkError");
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
    setFeedback(null);

    try {
      const response = await fetch("/api/favorites/artworks", {
        method: isFavorite ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setFeedback("signIn");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setFeedback("saveError");
        setLoading(false);
        return;
      }

      setIsFavorite(Boolean(data.isFavorite));
      setFeedback(data.isFavorite ? "saved" : "removed");
    } catch {
      setFeedback("networkError");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FavoriteActionView
      kind="artwork"
      isFavorite={isFavorite}
      loading={loading}
      feedback={feedback}
      onToggle={toggleFavorite}
    />
  );
}
