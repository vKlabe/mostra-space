"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TestStatus = {
  ok: boolean;
  message: string;
  projectUrl?: string;
};

export default function TestSupabasePage() {
  const [status, setStatus] = useState<TestStatus>({
    ok: false,
    message: "Test connessione in corso...",
  });

  useEffect(() => {
    async function runTest() {
      try {
        const supabase = createClient();

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setStatus({
            ok: false,
            message: `Errore Supabase Auth: ${error.message}`,
            projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          });
          return;
        }

        setStatus({
          ok: true,
          message: data.session
            ? "Connessione Supabase funzionante. Sessione utente trovata."
            : "Connessione Supabase funzionante. Nessun utente loggato, ed è normale per ora.",
          projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Errore sconosciuto";

        setStatus({
          ok: false,
          message,
          projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        });
      }
    }

    runTest();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
      <section className="mx-auto max-w-4xl">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-neutral-500">
          Test tecnico
        </p>

        <h1 className="text-4xl font-semibold">Test connessione Supabase</h1>

        <p className="mt-4 max-w-2xl text-neutral-300">
          Questa pagina verifica se il frontend Next.js riesce a creare un
          client Supabase usando le variabili ambiente pubbliche.
        </p>

        <div className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Stato
          </p>

          <div
            className={`mt-4 rounded-2xl border p-5 ${
              status.ok
                ? "border-emerald-700 bg-emerald-950/30"
                : "border-red-800 bg-red-950/30"
            }`}
          >
            <p className="text-lg font-medium">
              {status.ok ? "OK" : "ATTENZIONE"}
            </p>

            <p className="mt-2 text-neutral-300">{status.message}</p>

            <p className="mt-4 break-all text-sm text-neutral-500">
              Project URL: {status.projectUrl || "Non configurato"}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}