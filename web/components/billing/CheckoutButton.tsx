"use client";

import { useState } from "react";
import type { PlanName } from "@/lib/plans";

type PaidPlan = Exclude<PlanName, "free" | "institution">;

type CheckoutButtonProps = {
  plan: PaidPlan;
  children: React.ReactNode;
  className?: string;
};

async function readResponseSafely(response: Response) {
  const text = await response.text();

  if (!text) {
    return {
      url: null,
      error: `Risposta vuota dal server. Status: ${response.status}`,
    };
  }

  try {
    return JSON.parse(text) as {
      url?: string;
      error?: string;
      details?: string;
    };
  } catch {
    return {
      url: null,
      error: `Risposta non JSON dal server. Status: ${response.status}`,
      details: text.slice(0, 500),
    };
  }
}

export default function CheckoutButton({
  plan,
  children,
  className,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await readResponseSafely(response);

      if (!response.ok || !data.url) {
        throw new Error(
          [data.error, data.details].filter(Boolean).join(" — ") ||
            "Errore apertura checkout Stripe."
        );
      }

      window.location.href = data.url;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Errore apertura checkout Stripe."
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={
          className ||
          "w-full rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {loading ? "Apertura checkout..." : children}
      </button>

      {errorMessage && (
        <p className="mt-3 text-xs leading-5 text-red-300">{errorMessage}</p>
      )}
    </div>
  );
}