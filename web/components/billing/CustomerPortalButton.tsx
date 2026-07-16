"use client";

import { useState } from "react";
import T from "@/components/i18n/T";

type CustomerPortalButtonProps = {
  children?: React.ReactNode;
  className?: string;
};

export default function CustomerPortalButton({
  children = (
    <T
      textKey="billing.customerPortal.actions.manageSubscription"
      fallback="Gestisci abbonamento"
    />
  ),
  className,
}: CustomerPortalButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleOpenPortal() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/billing/create-portal-session", {
        method: "POST",
      });

      const data = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Errore apertura portale Stripe.");
      }

      window.location.href = data.url;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Errore apertura portale Stripe."
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleOpenPortal}
        disabled={loading}
        className={
          className ||
          "rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {loading ? (
          <T
            textKey="billing.customerPortal.actions.opening"
            fallback="Apertura portale..."
          />
        ) : (
          children
        )}
      </button>

      {errorMessage && (
        <p className="mt-3 text-xs leading-5 text-red-300">{errorMessage}</p>
      )}
    </div>
  );
}