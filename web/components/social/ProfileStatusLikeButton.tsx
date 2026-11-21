"use client";

import { useState } from "react";
import T from "@/components/i18n/T";
import ContextualSignInLink from "@/components/social/ContextualSignInLink";

type ProfileStatusLikeButtonProps = {
  statusId: string;
  initialLiked: boolean;
  initialCount: number;
  canLike: boolean;
};

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 4.8a5.4 5.4 0 0 0-7.6 0L12 6l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z" />
    </svg>
  );
}

export default function ProfileStatusLikeButton({
  statusId,
  initialLiked,
  initialCount,
  canLike,
}: ProfileStatusLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(false);

  async function toggleLike() {
    if (!canLike || isPending) return;

    setIsPending(true);
    setError(false);

    try {
      const response = await fetch(`/api/statuses/${statusId}/like`, {
        method: "POST",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "like_failed");
      }

      setLiked(Boolean(result?.liked));
      setCount(Number(result?.count) || 0);
    } catch {
      setError(true);
    } finally {
      setIsPending(false);
    }
  }

  const buttonClass = "inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border px-4 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--museum-bronze-light)] disabled:opacity-60";

  if (!canLike) {
    return (
      <ContextualSignInLink
        anchor="#stato"
        className={`${buttonClass} border-[var(--museum-border-soft)] text-[var(--museum-ivory-soft)] hover:border-[var(--museum-bronze)]`}
      >
        <HeartIcon filled={liked} />
        <span>{count}</span>
        <T textKey="profiles.status.loginToLike" fallback="Accedi per lasciare un cuore" />
      </ContextualSignInLink>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={toggleLike}
        disabled={isPending}
        aria-pressed={liked}
        aria-busy={isPending}
        className={`${buttonClass} ${
          liked
            ? "border-[var(--museum-bronze)] bg-[var(--museum-bronze)]/10 text-[var(--museum-bronze-light)] hover:bg-[var(--museum-bronze)]/15"
            : "border-[var(--museum-border-soft)] text-[var(--museum-ivory-soft)] hover:border-[var(--museum-bronze)] hover:text-[var(--museum-bronze-light)]"
        }`}
      >
        <HeartIcon filled={liked} />
        <span>{count}</span>
        <span className="sr-only">
          {liked ? (
            <T textKey="profiles.status.unlike" fallback="Rimuovi apprezzamento" />
          ) : (
            <T textKey="profiles.status.like" fallback="Apprezza stato" />
          )}
        </span>
      </button>

      {error && (
        <span role="status" className="text-xs text-red-300">
          <T
            textKey="profiles.status.likeError"
            fallback="Non riesco ad aggiornare il cuore."
          />
        </span>
      )}
    </div>
  );
}
