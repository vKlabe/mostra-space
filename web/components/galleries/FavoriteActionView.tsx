"use client";

import { useId } from "react";
import T from "@/components/i18n/T";
import ContextualSignInLink from "@/components/social/ContextualSignInLink";
import { SocialText } from "@/components/social/SocialCopy";

export type FavoriteFeedback = "signIn" | "saved" | "removed" | "saveError" | "networkError";

export default function FavoriteActionView({
  kind,
  isFavorite,
  loading,
  feedback,
  onToggle,
}: {
  kind: "artwork" | "gallery";
  isFavorite: boolean;
  loading: boolean;
  feedback: FavoriteFeedback | null;
  onToggle: () => void;
}) {
  const visibilityId = useId();
  const isArtwork = kind === "artwork";
  const signInRequired = feedback === "signIn";
  const size = isArtwork ? "px-4 text-xs" : "px-5 text-sm";
  const base = `inline-flex min-h-11 max-w-full items-center justify-center rounded-full border py-2 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--museum-bronze-light)] disabled:cursor-wait disabled:opacity-60 ${size}`;
  const appearance = isFavorite
    ? "border-[var(--museum-ivory)] bg-[var(--museum-ivory)] font-medium text-neutral-950 hover:bg-white"
    : "border-[var(--museum-border)] text-[var(--museum-ivory)] hover:border-[var(--museum-bronze)]";

  return (
    <div className="flex min-w-0 max-w-xs flex-col items-start gap-1.5">
      {signInRequired ? (
        <ContextualSignInLink
          className={`${base} ${appearance}`}
          anchor={isArtwork ? "#catalogo" : ""}
          describedBy={visibilityId}
        >
          <SocialText text={isArtwork ? "saveArtworkSignIn" : "saveGallerySignIn"} />
        </ContextualSignInLink>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          disabled={loading}
          aria-busy={loading}
          aria-pressed={isFavorite}
          aria-describedby={visibilityId}
          className={`${base} ${appearance}`}
        >
          {loading ? (
            <T textKey={`${kind}.favorites.actions.checking`} fallback="Controllo..." />
          ) : isFavorite ? (
            <T textKey={`${kind}.favorites.actions.saved`} fallback={isArtwork ? "Opera salvata" : "Galleria salvata"} />
          ) : (
            <T textKey={`${kind}.favorites.actions.save`} fallback={isArtwork ? "Salva opera" : "Salva galleria"} />
          )}
        </button>
      )}
      <p id={visibilityId} className="text-xs leading-5 text-[var(--museum-stone)]">
        <SocialText text="saveVisibility" />
      </p>
      {!signInRequired && feedback && (
        <p
          role="status"
          className={`text-xs leading-5 ${feedback === "saveError" || feedback === "networkError" ? "text-red-300" : "text-[var(--museum-ivory-soft)]"}`}
        >
          <SocialText text={feedback} />
        </p>
      )}
    </div>
  );
}
