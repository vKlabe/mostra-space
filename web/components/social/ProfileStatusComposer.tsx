"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import T from "@/components/i18n/T";

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
    <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            <T textKey="dashboard.social.status.label" fallback="Stato" />
          </p>

          <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
            <T
              textKey="dashboard.social.status.title"
              fallback="Condividi qualcosa con chi ti segue"
            />
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            <T
              textKey="dashboard.social.status.description"
              fallback="Uno spazio breve per un pensiero, un aggiornamento o una nota. Quando pubblichi un nuovo stato, chi ti segue riceve una notifica."
            />
          </p>
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
        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value.slice(0, MAX_STATUS_LENGTH));
            setError(null);
            setSuccess(false);
          }}
          rows={2}
          maxLength={MAX_STATUS_LENGTH}
          className="min-h-24 w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm leading-6 text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-600"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-neutral-600">
            {content.length} / {MAX_STATUS_LENGTH}
          </p>

          <p className={remaining < 20 ? "text-xs text-amber-400" : "text-xs text-neutral-600"}>
            {remaining}{" "}
            <T
              textKey="dashboard.social.status.charactersRemaining"
              fallback="caratteri disponibili"
            />
          </p>
        </div>
      </div>

      {!publicProfileEnabled && (
        <p className="mt-4 rounded-2xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100">
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
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-45"
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
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <T textKey="dashboard.social.status.remove" fallback="Rimuovi stato" />
          </button>
        )}
      </div>

      {error === "empty" && (
        <p className="mt-4 text-sm text-red-300">
          <T
            textKey="dashboard.social.status.errors.empty"
            fallback="Scrivi qualcosa prima di pubblicare."
          />
        </p>
      )}

      {error === "generic" && (
        <p className="mt-4 text-sm text-red-300">
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
