"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import T from "@/components/i18n/T";

type GoogleOAuthButtonProps = {
  mode: "login" | "register";
  disabled?: boolean;
  className?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Non riesco ad avviare l’accesso con Google. Riprova tra qualche secondo.";
}

export default function GoogleOAuthButton({
  mode,
  disabled = false,
  className = "",
}: GoogleOAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGoogleOAuth() {
    if (disabled || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);

      redirectTo.searchParams.set("next", "/dashboard");

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
      setErrorMessage(getErrorMessage(error));
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

      {errorMessage && (
        <div className="mt-3 rounded-2xl border border-[rgba(182,91,78,0.45)] bg-[rgba(182,91,78,0.08)] p-4 text-sm text-[var(--museum-danger)]">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
