"use client";

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
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
      <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col justify-center">
        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-red-400">
          <T
            textKey="errorPage.header.label"
            fallback="Errore applicazione"
          />
        </p>

        <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
          <T
            textKey="errorPage.header.title"
            fallback="Qualcosa non ha risposto come previsto."
          />
        </h1>

        <p className="mt-6 max-w-2xl text-sm leading-7 text-neutral-400">
          <T
            textKey="errorPage.header.description"
            fallback="La piattaforma ha incontrato un errore temporaneo. Puoi riprovare oppure tornare alla dashboard."
          />
        </p>

        {error.digest && (
          <p className="mt-4 break-all rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-xs text-neutral-500">
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
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            <T textKey="errorPage.actions.retry" fallback="Riprova" />
          </button>

          <a
            href="/dashboard"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="errorPage.actions.dashboard"
              fallback="Vai alla dashboard"
            />
          </a>

          <a
            href="/"
            className="rounded-full border border-neutral-800 px-5 py-2 text-sm text-neutral-400 transition hover:border-neutral-600 hover:text-neutral-100"
          >
            <T
              textKey="errorPage.actions.home"
              fallback="Torna alla home"
            />
          </a>
        </div>
      </section>
    </main>
  );
}