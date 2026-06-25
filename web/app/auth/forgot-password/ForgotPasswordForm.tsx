"use client";

import { FormEvent, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatusMessage(null);
    setErrorMessage(null);
    setIsSubmitting(true);

    const supabase = getSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(
        "Non siamo riusciti a inviare l’email di recupero. Controlla l’indirizzo e riprova."
      );
      return;
    }

    setStatusMessage(
      "Se l’email è associata a un account, riceverai un link per reimpostare la password."
    );
    setEmail("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-sm text-[var(--museum-ivory-soft)]"
        >
          Email account
        </label>

        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nome@email.com"
          className="museum-input mt-2 w-full rounded-2xl px-4 py-3 text-sm"
        />
      </div>

      {statusMessage && (
        <div className="rounded-2xl border border-[rgba(127,175,123,0.45)] bg-[rgba(127,175,123,0.08)] px-4 py-3 text-sm leading-6 text-[var(--museum-success)]">
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-[rgba(182,91,78,0.45)] bg-[rgba(182,91,78,0.08)] px-4 py-3 text-sm leading-6 text-[var(--museum-danger)]">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="museum-button-primary w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Invio in corso..." : "Invia link di recupero"}
      </button>
    </form>
  );
}