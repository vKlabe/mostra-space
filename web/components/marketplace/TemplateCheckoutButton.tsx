"use client";

import Link from "next/link";
import { useState } from "react";
import T from "@/components/i18n/T";

type TemplateCheckoutButtonProps = {
  templateId: string;
  isLoggedIn: boolean;
  isPurchased: boolean;
};

export default function TemplateCheckoutButton({
  templateId,
  isLoggedIn,
  isPurchased,
}: TemplateCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCheckout() {
    if (!isLoggedIn) {
      window.location.href = `/login?next=/marketplace`;
      return;
    }

    if (isPurchased) {
      window.location.href = "/dashboard/gallerie";
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/marketplace/templates/${templateId}/checkout`,
        {
          method: "POST",
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(data?.error || "Errore durante apertura checkout.");
        return;
      }

      if (data?.alreadyPurchased) {
        window.location.href = "/dashboard/gallerie";
        return;
      }

      if (!data?.url) {
        setMessage("Checkout non disponibile.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setMessage("Errore di rete durante apertura checkout.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div>
        <Link
          href="/login?next=/marketplace"
          className="inline-flex w-full justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
        >
          <T
            textKey="marketplace.templateCheckout.actions.loginToPurchase"
            fallback="Accedi per acquistare"
          />
        </Link>
      </div>
    );
  }

  if (isPurchased) {
    return (
      <div>
        <Link
          href="/dashboard/gallerie"
          className="inline-flex w-full justify-center rounded-full border border-green-900 bg-green-950/40 px-5 py-3 text-sm font-medium text-green-200 transition hover:border-green-700"
        >
          <T
            textKey="marketplace.templateCheckout.actions.alreadyPurchased"
            fallback="Già acquistato · Usa template"
          />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading}
        className="inline-flex w-full justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <T
            textKey="marketplace.templateCheckout.actions.openingCheckout"
            fallback="Apertura checkout..."
          />
        ) : (
          <T
            textKey="marketplace.templateCheckout.actions.purchase"
            fallback="Acquista template"
          />
        )}
      </button>

      {message && <p className="mt-3 text-sm text-red-300">{message}</p>}
    </div>
  );
}