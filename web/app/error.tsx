"use client";

import Link from "next/link";
import { useEffect } from "react";
import T from "@/components/i18n/T";

type ErrorPageProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <main className="museum-page min-h-screen px-5 py-10 text-[var(--museum-ivory)]">
      <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col justify-center">
        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-[var(--museum-danger)]">
          <T
            textKey="errorPage.header.label"
            fallback="Errore applicazione"
          />
        </p>

        <h1 className="museum-title text-[clamp(2.4rem,7vw,4rem)]">
          <T
            textKey="errorPage.header.title"
            fallback="Qualcosa non ha risposto come previsto."
          />
        </h1>

        <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--museum-stone)]">
          <T
            textKey="errorPage.header.description"
            fallback="La piattaforma ha incontrato un errore temporaneo. Puoi riprovare oppure tornare alla dashboard."
          />
        </p>

        {error.digest && (
          <p className="mt-4 break-all rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-xs text-[var(--museum-stone-muted)]">
            <T
              textKey="errorPage.details.codeLabel"
              fallback="Codice errore:"
            />{" "}
            {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="museum-button-primary px-5 py-2.5 text-sm"
          >
            <T textKey="errorPage.actions.retry" fallback="Riprova" />
          </button>

          <Link
            href="/dashboard"
            className="museum-button-secondary px-5 py-2.5 text-sm"
          >
            <T
              textKey="errorPage.actions.dashboard"
              fallback="Vai alla dashboard"
            />
          </Link>

          <Link
            href="/"
            className="rounded-full border border-neutral-800 px-5 py-2 text-sm text-neutral-400 transition hover:border-neutral-600 hover:text-neutral-100"
          >
            <T
              textKey="errorPage.actions.home"
              fallback="Torna alla home"
            />
          </Link>
        </div>
      </section>
    </main>
  );
}
