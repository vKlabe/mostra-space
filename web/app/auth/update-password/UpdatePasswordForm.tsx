"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import T from "@/components/i18n/T";

function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isPreparingSession, setIsPreparingSession] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function prepareSession() {
      const supabase = getSupabaseBrowserClient();

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }

          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, url.toString());
        }

        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }

          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setErrorMessage(
            "Il link non è valido o è scaduto. Richiedi un nuovo recupero password."
          );
          setIsReady(false);
          return;
        }

        setIsReady(true);
      } catch {
        setErrorMessage(
          "Il link non è valido o è scaduto. Richiedi un nuovo recupero password."
        );
        setIsReady(false);
      } finally {
        setIsPreparingSession(false);
      }
    }

    prepareSession();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatusMessage(null);
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("La nuova password deve avere almeno 8 caratteri.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("Le due password non coincidono.");
      return;
    }

    setIsSubmitting(true);

    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(
        "Non siamo riusciti ad aggiornare la password. Richiedi un nuovo link e riprova."
      );
      return;
    }

    setPassword("");
    setPasswordConfirm("");
    setStatusMessage("Password aggiornata correttamente.");
  }

  if (isPreparingSession) {
    return (
      <div className="mt-8 rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] px-4 py-4 text-sm text-[var(--museum-stone)]">
        <T
          textKey="auth.updatePasswordForm.verifyingLink"
          fallback="Verifica del link in corso..."
        />
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="mt-8 space-y-5">
        {errorMessage && (
          <div className="rounded-2xl border border-[rgba(182,91,78,0.45)] bg-[rgba(182,91,78,0.08)] px-4 py-3 text-sm leading-6 text-[var(--museum-danger)]">
            {errorMessage}
          </div>
        )}

        <Link
          href="/auth/forgot-password"
          className="museum-button-primary flex w-full px-5 py-3"
        >
          <T
            textKey="auth.updatePasswordForm.requestNewLink"
            fallback="Richiedi nuovo link"
          />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="password"
          className="block text-sm text-[var(--museum-ivory-soft)]"
        >
          <T
            textKey="auth.updatePasswordForm.newPassword"
            fallback="Nuova password"
          />
        </label>

        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="museum-input mt-2 w-full rounded-2xl px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="password-confirm"
          className="block text-sm text-[var(--museum-ivory-soft)]"
        >
          <T
            textKey="auth.updatePasswordForm.confirmPassword"
            fallback="Conferma nuova password"
          />
        </label>

        <input
          id="password-confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
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
        {isSubmitting ? (
          <T
            textKey="auth.updatePasswordForm.updating"
            fallback="Aggiornamento..."
          />
        ) : (
          <T
            textKey="auth.updatePasswordForm.updatePassword"
            fallback="Aggiorna password"
          />
        )}
      </button>

      {statusMessage && (
        <Link
          href="/dashboard"
          className="museum-button-secondary flex w-full px-5 py-3"
        >
          <T
            textKey="auth.updatePasswordForm.goToDashboard"
            fallback="Vai alla dashboard"
          />
        </Link>
      )}
    </form>
  );
}