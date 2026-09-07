"use client";

import { useState } from "react";
import type {
  PwaReadinessReport,
  PwaReadinessStatus,
} from "@/lib/pwa/pwaReadiness.server";

function statusStyle(status: PwaReadinessStatus) {
  if (status === "pass") {
    return "border-green-900 bg-green-950/30 text-green-300";
  }

  if (status === "warn") {
    return "border-amber-900 bg-amber-950/30 text-amber-300";
  }

  return "border-red-900 bg-red-950/30 text-red-300";
}

function statusLabel(status: PwaReadinessStatus) {
  if (status === "pass") return "OK";
  if (status === "warn") return "Attenzione";
  return "Bloccante";
}

function reportLabel(status: PwaReadinessReport["status"]) {
  if (status === "ready") return "Pronta";
  if (status === "degraded") return "Da verificare";
  return "Bloccata";
}

export default function AdminPwaReadiness({
  initialReport,
}: {
  initialReport: PwaReadinessReport;
}) {
  const [report, setReport] = useState(initialReport);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (working) return;

    setWorking(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/pwa/health", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success || !payload.report) {
        throw new Error(payload?.code || "READINESS_FAILED");
      }

      setReport(payload.report as PwaReadinessReport);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `Diagnosi non riuscita: ${caught.message}`
          : "Diagnosi non riuscita."
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="mb-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-amber-500">
            Certificazione {report.release}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-medium">Readiness operativa</h2>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${
                report.status === "ready"
                  ? "border-green-900 bg-green-950/30 text-green-300"
                  : report.status === "degraded"
                    ? "border-amber-900 bg-amber-950/30 text-amber-300"
                    : "border-red-900 bg-red-950/30 text-red-300"
              }`}
            >
              {reportLabel(report.status)}
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
            Controllo in sola lettura di configurazione, schema, heartbeat Cron,
            coda, endpoint e consegne recenti.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={working}
          className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
        >
          {working ? "Controllo..." : "Aggiorna diagnosi"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {report.checks.map((check) => (
          <article
            key={check.id}
            className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-medium text-neutral-200">{check.label}</h3>
              <span
                className={`shrink-0 rounded-full border px-2 py-1 text-[10px] ${statusStyle(check.status)}`}
              >
                {statusLabel(check.status)}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-neutral-500">{check.detail}</p>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs text-neutral-600" aria-live="polite">
        Ultimo controllo: {new Date(report.generatedAt).toLocaleString("it-IT")}
        {error ? ` · ${error}` : ""}
      </p>
    </section>
  );
}
