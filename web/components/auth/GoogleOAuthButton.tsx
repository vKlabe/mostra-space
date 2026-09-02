"use client";

import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import T from "@/components/i18n/T";

type GoogleOAuthButtonProps = {
  mode: "login" | "register";
  disabled?: boolean;
  className?: string;
};

export default function GoogleOAuthButton({
  mode,
  disabled = false,
  className = "",
}: GoogleOAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<ReactNode | null>(null);

  async function handleGoogleOAuth() {
    if (disabled || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);

      redirectTo.searchParams.set("next", "/dashboard?oauth=google");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo.toString(),
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message ? (
          error.message
        ) : (
          <T
            textKey="auth.oauth.google.startError"
            fallback="Non riesco ad avviare l’accesso con Google. Riprova tra qualche secondo."
          />
        )
      );
      setIsLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleGoogleOAuth}
        disabled={disabled || isLoading}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-[var(--museum-border)] bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 bg-white font-semibold text-neutral-900">
          G
        </span>

        {isLoading ? (
          <T textKey="auth.oauth.google.loading" fallback="Apertura Google..." />
        ) : mode === "register" ? (
          <T
            textKey="auth.oauth.google.register"
            fallback="Registrati con Google"
          />
        ) : (
          <T textKey="auth.oauth.google.login" fallback="Accedi con Google" />
        )}
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-[var(--museum-stone-muted)]">
        <T
          textKey="auth.oauth.google.visitorNotice"
          fallback="Se crei un nuovo account con Google, entri come Visitor. Per creare gallerie e pubblicare mostre potrai completare il profilo Creator e impostare una password mostra.space."
        />
      </p>

      {errorMessage && (
        <div className="mt-3 rounded-2xl border border-[rgba(182,91,78,0.45)] bg-[rgba(182,91,78,0.08)] p-4 text-sm text-[var(--museum-danger)]">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
