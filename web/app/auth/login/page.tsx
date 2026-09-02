"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import T from "@/components/i18n/T";
import GoogleOAuthButton from "@/components/auth/GoogleOAuthButton";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkExistingSession() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (user) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setCheckingSession(false);
    }

    void checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      await fetch("/api/auth/sync-profile", {
        method: "POST",
      });

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage(
        "Errore di rete durante l’accesso. Riprova tra qualche secondo."
      );
      setLoading(false);
    }
  }

  const formDisabled = loading || checkingSession;

  return (
    <main className="museum-page flex min-h-screen items-center justify-center px-5 py-12">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-[rgba(23,21,17,0.82)] shadow-[var(--museum-shadow-soft)] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden min-h-[680px] overflow-hidden border-r border-[var(--museum-border)] bg-[var(--museum-charcoal)] lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(197,151,94,0.22),transparent_20rem),linear-gradient(180deg,rgba(243,237,226,0.05),rgba(0,0,0,0.75))]" />

          <div className="absolute left-10 top-10">
            <Link
              href="/"
              className="museum-logo text-4xl leading-none text-[var(--museum-ivory)]"
            >
              mostra
              <span className="text-[var(--museum-bronze-light)]">.</span>
              <span className="text-[var(--museum-ivory-soft)]">space</span>
            </Link>
          </div>

          <div className="absolute inset-x-14 top-40 h-[26rem] rounded-t-full border border-[rgba(197,151,94,0.28)] bg-[linear-gradient(180deg,rgba(216,205,187,0.08),rgba(0,0,0,0.2))]" />

          <div className="absolute left-1/2 top-64 h-44 w-24 -translate-x-1/2 rounded-full border-[10px] border-[rgba(168,121,69,0.88)] opacity-90 shadow-[0_0_60px_rgba(168,121,69,0.18)]" />
          <div className="absolute left-1/2 top-76 h-32 w-16 -translate-x-1/2 rotate-45 rounded-full border-[8px] border-[rgba(197,151,94,0.75)] opacity-90" />

          <div className="absolute bottom-12 left-10 right-10">
            <p className="museum-label">
              <T
                textKey="auth.login.hero.label"
                fallback="Accesso riservato"
              />
            </p>

            <h2 className="museum-title mt-5 text-5xl text-[var(--museum-ivory)]">
              <T
                textKey="auth.login.hero.title"
                fallback="Entra nel tuo spazio espositivo."
              />
            </h2>

            <p className="museum-subtitle mt-5 text-sm text-[var(--museum-stone)]">
              <T
                textKey="auth.login.hero.subtitle"
                fallback="Gestisci gallerie, opere, richieste, abbonamento e strumenti immersivi da un’unica dashboard."
              />
            </p>
          </div>
        </div>

        <div className="px-6 py-8 md:px-10 md:py-12">
          <div className="lg:hidden">
            <Link
              href="/"
              className="museum-logo text-3xl leading-none text-[var(--museum-ivory)]"
            >
              mostra
              <span className="text-[var(--museum-bronze-light)]">.</span>
              <span className="text-[var(--museum-ivory-soft)]">space</span>
            </Link>
          </div>

          <div className="mt-8 lg:mt-0">
            <p className="museum-label">
              <T textKey="auth.login.form.label" fallback="Accesso" />
            </p>

            <h1 className="museum-title mt-5 text-5xl text-[var(--museum-ivory)] md:text-6xl">
              <T textKey="auth.login.form.title" fallback="Accedi." />
            </h1>

            <p className="museum-subtitle mt-5 max-w-xl text-sm text-[var(--museum-stone)]">
              <T
                textKey="auth.login.form.subtitle"
                fallback="Entra nel portale per gestire account, gallerie, opere, richieste, abbonamento e allestimenti!"
              />
            </p>
          </div>

          <div className="mt-10 space-y-4">
            <GoogleOAuthButton mode="login" disabled={formDisabled} />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--museum-border)]" />
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
                <T textKey="auth.oauth.separator" fallback="oppure" />
              </span>
              <div className="h-px flex-1 bg-[var(--museum-border)]" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm text-[var(--museum-ivory-soft)]">
                <T textKey="auth.login.form.email" fallback="Email" />
              </label>

              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={formDisabled}
                className="museum-input mt-2 w-full rounded-2xl px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--museum-ivory-soft)]">
                <T textKey="auth.login.form.password" fallback="Password" />
              </label>

              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={formDisabled}
                className="museum-input mt-2 w-full rounded-2xl px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="La tua password"
              />
            </div>

            <div className="text-right">
              <Link
                href="/auth/forgot-password"
                className="museum-link text-sm underline-offset-4 hover:underline"
              >
                <T
                  textKey="auth.login.form.forgotPassword"
                  fallback="Password dimenticata?"
                />
              </Link>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-[rgba(182,91,78,0.45)] bg-[rgba(182,91,78,0.08)] p-4 text-sm text-[var(--museum-danger)]">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={formDisabled}
              className="museum-button-primary w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkingSession ? (
                <T
                  textKey="auth.login.actions.checkingSession"
                  fallback="Controllo sessione..."
                />
              ) : loading ? (
                <T
                  textKey="auth.login.actions.loggingIn"
                  fallback="Accesso..."
                />
              ) : (
                <T textKey="auth.login.actions.login" fallback="Accedi" />
              )}
            </button>

            <p className="text-center text-sm text-[var(--museum-stone)]">
              <T
                textKey="auth.login.register.noAccount"
                fallback="Non hai un account?"
              />{" "}
              <Link
                href="/auth/register"
                className="text-[var(--museum-bronze-light)] underline-offset-4 hover:underline"
              >
                <T
                  textKey="auth.login.register.action"
                  fallback="Registrati"
                />
              </Link>
            </p>
          </form>

          <p className="mt-8 text-center text-xs leading-5 text-[var(--museum-stone-muted)]">
            <T
              textKey="auth.login.legal.acceptance"
              fallback="Accedendo accetti i"
            />{" "}
            <Link
              href="/legal/termini"
              className="text-[var(--museum-stone)] underline-offset-4 hover:text-[var(--museum-bronze-light)] hover:underline"
            >
              <T textKey="auth.login.legal.terms" fallback="Termini" />
            </Link>{" "}
            <T textKey="auth.login.legal.andPrivacy" fallback="e la" />{" "}
            <Link
              href="/legal/privacy"
              className="text-[var(--museum-stone)] underline-offset-4 hover:text-[var(--museum-bronze-light)] hover:underline"
            >
              <T
                textKey="auth.login.legal.privacyPolicy"
                fallback="Privacy Policy"
              />
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}