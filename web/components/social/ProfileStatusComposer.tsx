"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import T from "@/components/i18n/T";
import { SocialText } from "@/components/social/SocialCopy";

type CurrentStatus = {
  id: string;
  content: string;
  createdAt: string;
} | null;

type ProfileStatusComposerProps = {
  currentStatus: CurrentStatus;
  publicProfileEnabled: boolean;
};

const MAX_STATUS_LENGTH = 180;

export default function ProfileStatusComposer({
  currentStatus,
  publicProfileEnabled,
}: ProfileStatusComposerProps) {
  const router = useRouter();
  const fieldId = useId();
  const [content, setContent] = useState(currentStatus?.content || "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remaining = useMemo(
    () => MAX_STATUS_LENGTH - content.length,
    [content.length]
  );

  async function publishStatus() {
    const cleaned = content.trim();

    if (!cleaned) {
      setError("empty");
      setSuccess(false);
      return;
    }

    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/account/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: cleaned }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "status_publish_failed");
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("generic");
      setSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeStatus() {
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/account/status", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("status_remove_failed");
      }

      setContent("");
      setSuccess(false);
      router.refresh();
    } catch {
      setError("generic");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSameAsCurrent = Boolean(
    currentStatus && content.trim() === currentStatus.content.trim()
  );

  return (
    <section aria-labelledby={`${fieldId}-title`} className="rounded-3xl border border-[var(--museum-border)] bg-[var(--museum-surface)] p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 id={`${fieldId}-title`} className="text-2xl font-semibold text-[var(--museum-ivory)]">
            <T
              textKey="dashboard.social.status.title"
              fallback="Condividi qualcosa con chi ti segue"
            />
          </h2>

          {publicProfileEnabled && (
            <p id={`${fieldId}-audience`} className="mt-2 max-w-2xl text-sm leading-6 text-[var(--museum-stone)]">
              <SocialText text="statusAudience" />
            </p>
          )}
        </div>

        {currentStatus && (
          <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-400">
            <T
              textKey="dashboard.social.status.currentBadge"
              fallback="Stato attivo"
            />
          </span>
        )}
      </div>

      <div className="mt-5">
        <label htmlFor={fieldId} className="mb-2 block text-sm font-medium text-[var(--museum-ivory)]">
          <T textKey="dashboard.social.status.label" fallback="Stato" />
        </label>
        <textarea
          id={fieldId}
          aria-describedby={`${fieldId}-audience ${fieldId}-remaining`}
          value={content}
          onChange={(event) => {
            setContent(event.target.value.slice(0, MAX_STATUS_LENGTH));
            setError(null);
            setSuccess(false);
          }}
          rows={2}
          maxLength={MAX_STATUS_LENGTH}
          className="min-h-24 w-full resize-y rounded-2xl border border-[var(--museum-border)] bg-neutral-950 px-4 py-3 text-base leading-6 text-neutral-100 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--museum-bronze-light)]"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p id={`${fieldId}-remaining`} className={remaining < 20 ? "text-xs text-amber-400" : "text-xs text-[var(--museum-stone)]"}>
            {remaining}{" "}
            <T
              textKey="dashboard.social.status.charactersRemaining"
              fallback="caratteri disponibili"
            />
          </p>
        </div>
      </div>

      {!publicProfileEnabled && (
        <p id={`${fieldId}-audience`} className="mt-4 rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100">
          <T
            textKey="dashboard.social.status.profileDisabled"
            fallback="Puoi preparare il tuo stato, ma sarà visibile pubblicamente quando attiverai il profilo pubblico."
          />
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isSubmitting || !content.trim() || isSameAsCurrent}
          onClick={publishStatus}
          className="museum-button-primary min-h-11 px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isSubmitting ? (
            <T textKey="dashboard.social.status.saving" fallback="Pubblico..." />
          ) : currentStatus ? (
            <T textKey="dashboard.social.status.update" fallback="Aggiorna stato" />
          ) : (
            <T textKey="dashboard.social.status.publish" fallback="Pubblica stato" />
          )}
        </button>

        {currentStatus && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={removeStatus}
            aria-describedby={`${fieldId}-remove-note`}
            className="museum-button-secondary min-h-11 px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <T textKey="dashboard.social.status.remove" fallback="Rimuovi stato" />
          </button>
        )}
      </div>

      {currentStatus && (
        <p id={`${fieldId}-remove-note`} className="mt-2 text-xs leading-5 text-[var(--museum-stone)]">
          <SocialText text="statusRemoval" />
        </p>
      )}

      {error === "empty" && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          <T
            textKey="dashboard.social.status.errors.empty"
            fallback="Scrivi qualcosa prima di pubblicare."
          />
        </p>
      )}

      {error === "generic" && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          <T
            textKey="dashboard.social.status.errors.generic"
            fallback="Non riesco ad aggiornare lo stato. Riprova."
          />
        </p>
      )}

      {success && (
        <p className="mt-4 text-sm text-emerald-300">
          <T
            textKey="dashboard.social.status.success"
            fallback="Stato pubblicato."
          />
        </p>
      )}
    </section>
  );
}
