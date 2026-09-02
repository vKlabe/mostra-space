"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import T from "@/components/i18n/T";

const DISMISS_SESSION_KEY = "mostraspace_google_password_prompt_dismissed";
const CREATOR_UPGRADE_PATH = "/account/upgrade-gallerist";

function getProviderNames(
  identities: Array<{ provider?: string | null }> | null | undefined,
  appProviders: unknown
) {
  const values = new Set<string>();

  for (const identity of identities || []) {
    if (identity.provider) {
      values.add(identity.provider.toLowerCase());
    }
  }

  if (Array.isArray(appProviders)) {
    for (const provider of appProviders) {
      if (typeof provider === "string") {
        values.add(provider.toLowerCase());
      }
    }
  }

  return values;
}

export default function GoogleAccountCompletionGate() {
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [isGoogleOnly, setIsGoogleOnly] = useState(false);
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<ReactNode | null>(null);
  const [successMessage, setSuccessMessage] = useState<ReactNode | null>(null);

  const isMandatory = pathname === CREATOR_UPGRADE_PATH;
  const shouldIgnorePath = useMemo(() => {
    return (
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/legal") ||
      pathname === "/unity-frame"
    );
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function inspectAuthMethod() {
      if (shouldIgnorePath) {
        setChecking(false);
        setOpen(false);
        return;
      }

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) {
        setChecking(false);
        setOpen(false);
        return;
      }

      const { data: identityData } = await supabase.auth.getUserIdentities();

      if (cancelled) {
        return;
      }

      const providers = getProviderNames(
        identityData?.identities,
        user.app_metadata?.providers
      );

      const hasGoogle = providers.has("google");
      const hasEmailPassword = providers.has("email");
      const googleOnly = hasGoogle && !hasEmailPassword;

      setEmail(user.email || "");
      setIsGoogleOnly(googleOnly);
      setChecking(false);

      if (!googleOnly) {
        setOpen(false);
        return;
      }

      if (isMandatory) {
        setOpen(true);
        return;
      }

      const dismissedThisSession =
        window.sessionStorage.getItem(DISMISS_SESSION_KEY) === "1";

      const cameFromGoogle =
        new URLSearchParams(window.location.search).get("oauth") === "google";

      if (cameFromGoogle && !dismissedThisSession) {
        setOpen(true);
      }
    }

    void inspectAuthMethod();

    return () => {
      cancelled = true;
    };
  }, [isMandatory, shouldIgnorePath]);

  function dismissForNow() {
    if (isMandatory) {
      return;
    }

    window.sessionStorage.setItem(DISMISS_SESSION_KEY, "1");
    setOpen(false);
  }

  async function handleSetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage(
        <T
          textKey="auth.googleCompletion.errors.passwordTooShort"
          fallback="La password deve avere almeno 6 caratteri."
        />
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        <T
          textKey="auth.googleCompletion.errors.passwordMismatch"
          fallback="Le due password non coincidono."
        />
      );
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      await supabase.auth.refreshSession();

      const { data: identityData } = await supabase.auth.getUserIdentities();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const providers = getProviderNames(
        identityData?.identities,
        user?.app_metadata?.providers
      );

      if (!providers.has("email")) {
        // Supabase può aggiornare i claims con un piccolo ritardo. La password è
        // comunque stata impostata correttamente se updateUser non ha restituito errore.
      }

      window.sessionStorage.removeItem(DISMISS_SESSION_KEY);
      setIsGoogleOnly(false);
      setSuccessMessage(
        <T
          textKey="auth.googleCompletion.success"
          fallback="Password mostra.space impostata correttamente."
        />
      );
      setPassword("");
      setConfirmPassword("");

      window.setTimeout(() => {
        setOpen(false);

        const url = new URL(window.location.href);
        if (url.searchParams.get("oauth") === "google") {
          url.searchParams.delete("oauth");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
      }, 700);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message ? (
          error.message
        ) : (
          <T
            textKey="auth.googleCompletion.errors.generic"
            fallback="Non riesco a impostare la password. Riprova tra qualche secondo."
          />
        )
      );
    } finally {
      setSaving(false);
    }
  }

  if (checking || !isGoogleOnly || !open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] p-6 shadow-2xl md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="museum-label">
              <T
                textKey="auth.googleCompletion.label"
                fallback="Account Google"
              />
            </p>

            <h2 className="mt-4 font-editorial text-4xl font-medium text-[var(--museum-ivory)] md:text-5xl">
              {isMandatory ? (
                <T
                  textKey="auth.googleCompletion.mandatoryTitle"
                  fallback="Completa il tuo account prima di diventare Creator."
                />
              ) : (
                <T
                  textKey="auth.googleCompletion.title"
                  fallback="Completa il tuo account mostra.space"
                />
              )}
            </h2>
          </div>

          {!isMandatory && (
            <button
              type="button"
              onClick={dismissForNow}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--museum-border)] text-xl text-[var(--museum-stone)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)]"
              aria-label="×"
            >
              ×
            </button>
          )}
        </div>

        <p className="mt-5 text-sm leading-7 text-[var(--museum-stone)]">
          {isMandatory ? (
            <T
              textKey="auth.googleCompletion.mandatoryDescription"
              fallback="Hai effettuato l’accesso con Google. Per attivare gli strumenti Creator/Gallerista devi prima impostare una password mostra.space; subito dopo potrai continuare con il completamento del profilo professionale."
            />
          ) : (
            <T
              textKey="auth.googleCompletion.description"
              fallback="Hai effettuato l’accesso con Google e puoi già usare mostra.space come Visitor. Imposta una password mostra.space per accedere anche con email e password e per confermare le operazioni più importanti del tuo account."
            />
          )}
        </p>

        {email && (
          <div className="mt-5 rounded-2xl border border-[var(--museum-border)] bg-black/20 px-4 py-3 text-sm text-[var(--museum-stone)]">
            <span className="text-[var(--museum-stone-muted)]">
              <T textKey="auth.googleCompletion.email" fallback="Email:" />
            </span>{" "}
            <span className="break-all text-[var(--museum-ivory-soft)]">{email}</span>
          </div>
        )}

        <form onSubmit={handleSetPassword} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-[var(--museum-ivory-soft)]">
              <T
                textKey="auth.googleCompletion.password"
                fallback="Password mostra.space"
              />
            </label>

            <input
              type="password"
              minLength={6}
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={saving}
              className="museum-input mt-2 w-full rounded-2xl px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="••••••"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--museum-ivory-soft)]">
              <T
                textKey="auth.googleCompletion.confirmPassword"
                fallback="Conferma password"
              />
            </label>

            <input
              type="password"
              minLength={6}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={saving}
              className="museum-input mt-2 w-full rounded-2xl px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="••••••"
            />
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-[rgba(182,91,78,0.45)] bg-[rgba(182,91,78,0.08)] p-4 text-sm text-[var(--museum-danger)]">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-2xl border border-[rgba(127,175,123,0.45)] bg-[rgba(127,175,123,0.08)] p-4 text-sm text-[var(--museum-success)]">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="museum-button-primary w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <T
                textKey="auth.googleCompletion.saving"
                fallback="Impostazione password..."
              />
            ) : (
              <T
                textKey="auth.googleCompletion.submit"
                fallback="Imposta password"
              />
            )}
          </button>

          {!isMandatory && (
            <button
              type="button"
              onClick={dismissForNow}
              className="museum-button-secondary w-full px-6 py-3"
            >
              <T
                textKey="auth.googleCompletion.later"
                fallback="Lo farò più tardi"
              />
            </button>
          )}
        </form>

        <p className="mt-5 text-xs leading-5 text-[var(--museum-stone-muted)]">
          <T
            textKey="auth.googleCompletion.securityNote"
            fallback="La password che imposti è una password mostra.space: non è la password del tuo account Google e non devi inserire qui la password di Google."
          />
        </p>
      </div>
    </div>
  );
}
