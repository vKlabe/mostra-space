"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

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
      <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-4 text-sm text-neutral-400">
        Verifica del link in corso...
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="mt-8 space-y-5">
        {errorMessage && (
          <div className="rounded-2xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm leading-6 text-red-200">
            {errorMessage}
          </div>
        )}

        <Link
          href="/auth/forgot-password"
          className="flex w-full justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
        >
          Richiedi nuovo link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="password"
          className="text-sm font-medium text-neutral-200"
        >
          Nuova password
        </label>

        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
        />
      </div>

      <div>
        <label
          htmlFor="password-confirm"
          className="text-sm font-medium text-neutral-200"
        >
          Conferma nuova password
        </label>

        <input
          id="password-confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
        />
      </div>

      {statusMessage && (
        <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm leading-6 text-emerald-200">
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm leading-6 text-red-200">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Aggiornamento..." : "Aggiorna password"}
      </button>

      {statusMessage && (
        <Link
          href="/dashboard"
          className="flex w-full justify-center rounded-full border border-neutral-700 px-5 py-3 text-sm font-medium text-neutral-200 transition hover:border-neutral-500 hover:text-white"
        >
          Vai alla dashboard
        </Link>
      )}
    </form>
  );
}