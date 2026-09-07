import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const PWA_RELEASE = "pwa-10";

type AdminClient = ReturnType<typeof createAdminClient>;

export type PwaReadinessStatus = "pass" | "warn" | "fail";

export type PwaReadinessCheck = {
  id: string;
  label: string;
  status: PwaReadinessStatus;
  detail: string;
};

export type PwaReadinessReport = {
  release: typeof PWA_RELEASE;
  status: "ready" | "degraded" | "blocked";
  generatedAt: string;
  checks: PwaReadinessCheck[];
  metrics: {
    activeExpired: number;
    staleProcessing: number;
    overduePending: number;
    sent24Hours: number;
    failed24Hours: number;
  };
  latestCronRun: {
    status: "running" | "succeeded" | "failed";
    startedAt: string;
    completedAt: string | null;
    durationMs: number | null;
    errorCode: string | null;
  } | null;
};

type DispatchRunRow = {
  status: "running" | "succeeded" | "failed";
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_code: string | null;
};

function countOf(result: { count: number | null }) {
  return result.count || 0;
}

function configurationCheck(): PwaReadinessCheck {
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim() || "";
  const required = [
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()],
    [
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
    ],
    ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()],
    ["WEB_PUSH_VAPID_PUBLIC_KEY", process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim()],
    ["WEB_PUSH_VAPID_PRIVATE_KEY", process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim()],
    ["WEB_PUSH_VAPID_SUBJECT", subject],
    ["PWA_PUSH_DISPATCH_SECRET", process.env.PWA_PUSH_DISPATCH_SECRET?.trim()],
  ] as const;
  const missing: string[] = required
    .filter(([, value]) => !value)
    .map(([name]) => name);
  const secret = process.env.PWA_PUSH_DISPATCH_SECRET?.trim() || "";
  const subjectValid = /^(mailto:|https:\/\/)/i.test(subject);

  if (missing.length > 0) {
    return {
      id: "configuration",
      label: "Configurazione server",
      status: process.env.VERCEL ? "fail" : "warn",
      detail: `${process.env.VERCEL ? "Variabili mancanti" : "Ambiente locale incompleto"}: ${missing.join(", ")}.`,
    };
  }

  if (secret.length < 32 || !subjectValid) {
    return {
      id: "configuration",
      label: "Configurazione server",
      status: "fail",
      detail: "Segreto dispatcher troppo corto o subject VAPID non valido.",
    };
  }

  return {
    id: "configuration",
    label: "Configurazione server",
    status: "pass",
    detail: "Supabase, VAPID e dispatcher sono configurati; i valori non sono esposti.",
  };
}

export async function getPwaReadiness(
  admin: AdminClient = createAdminClient()
): Promise<PwaReadinessReport> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const staleProcessingBefore = new Date(now - 15 * 60 * 1000).toISOString();
  const overduePendingBefore = new Date(now - 5 * 60 * 1000).toISOString();
  const since24Hours = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const [
    subscriptionsSchema,
    preferencesSchema,
    deliveriesSchema,
    actionsSchema,
    runsSchema,
    activeExpiredResult,
    staleProcessingResult,
    overduePendingResult,
    sentResult,
    failedResult,
    latestCronResult,
  ] = await Promise.all([
    admin.from("pwa_push_subscriptions").select("id", { count: "exact", head: true }),
    admin.from("pwa_push_preferences").select("user_id", { count: "exact", head: true }),
    admin.from("pwa_push_deliveries").select("id", { count: "exact", head: true }),
    admin.from("pwa_push_admin_actions").select("id", { count: "exact", head: true }),
    admin.from("pwa_push_dispatch_runs").select("id", { count: "exact", head: true }),
    admin
      .from("pwa_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .not("expires_at", "is", null)
      .lte("expires_at", nowIso),
    admin
      .from("pwa_push_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("status", "processing")
      .lt("claimed_at", staleProcessingBefore),
    admin
      .from("pwa_push_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("next_attempt_at", overduePendingBefore),
    admin
      .from("pwa_push_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("created_at", since24Hours),
    admin
      .from("pwa_push_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", since24Hours),
    admin
      .from("pwa_push_dispatch_runs")
      .select("status, started_at, completed_at, duration_ms, error_code")
      .eq("trigger_source", "cron")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle<DispatchRunRow>(),
  ]);

  const schemaResults = [
    subscriptionsSchema,
    preferencesSchema,
    deliveriesSchema,
    actionsSchema,
    runsSchema,
  ];
  const operationalResults = [
    activeExpiredResult,
    staleProcessingResult,
    overduePendingResult,
    sentResult,
    failedResult,
  ];
  const checks: PwaReadinessCheck[] = [configurationCheck()];
  const schemaErrors = schemaResults.filter((result) => result.error);

  checks.push({
    id: "database",
    label: "Schema e accesso database",
    status: schemaErrors.length > 0 ? "fail" : "pass",
    detail:
      schemaErrors.length > 0
        ? "Una o più tabelle PWA non sono disponibili al service role."
        : "Tabelle PWA, preferenze, consegne, audit e heartbeat sono disponibili.",
  });

  const latestCron = latestCronResult.data;
  if (latestCronResult.error) {
    checks.push({
      id: "cron",
      label: "Heartbeat dispatcher",
      status: "fail",
      detail: "Impossibile leggere l'ultimo ciclo automatico.",
    });
  } else if (!latestCron) {
    checks.push({
      id: "cron",
      label: "Heartbeat dispatcher",
      status: "warn",
      detail: "Nessun ciclo PWA 10 registrato; in Preview è atteso, in Production attendi due minuti.",
    });
  } else {
    const ageMs = Math.max(0, now - Date.parse(latestCron.started_at));
    const recent = ageMs <= 5 * 60 * 1000;
    const healthy = recent && latestCron.status === "succeeded";
    checks.push({
      id: "cron",
      label: "Heartbeat dispatcher",
      status: healthy ? "pass" : recent ? "warn" : "fail",
      detail: healthy
        ? `Ultimo ciclo automatico riuscito ${Math.max(0, Math.floor(ageMs / 1000))} secondi fa.`
        : recent
          ? `L'ultimo ciclo è ${latestCron.status}${latestCron.error_code ? ` (${latestCron.error_code})` : ""}.`
          : `Nessun ciclo automatico negli ultimi ${Math.floor(ageMs / 60000)} minuti.`,
    });
  }

  const operationalError = operationalResults.some((result) => result.error);
  const activeExpired = countOf(activeExpiredResult);
  const staleProcessing = countOf(staleProcessingResult);
  const overduePending = countOf(overduePendingResult);
  const sent24Hours = countOf(sentResult);
  const failed24Hours = countOf(failedResult);

  checks.push({
    id: "queue",
    label: "Coda di consegna",
    status: operationalError
      ? "fail"
      : staleProcessing > 0 || overduePending > 0
        ? "warn"
        : "pass",
    detail: operationalError
      ? "Impossibile calcolare lo stato della coda."
      : `${overduePending} pending oltre 5 minuti; ${staleProcessing} processing oltre 15 minuti.`,
  });

  checks.push({
    id: "subscriptions",
    label: "Endpoint attivi",
    status: operationalError ? "fail" : activeExpired > 0 ? "warn" : "pass",
    detail: operationalError
      ? "Impossibile verificare gli endpoint."
      : activeExpired > 0
        ? `${activeExpired} endpoint attivi risultano scaduti e saranno disattivati dal dispatcher.`
        : "Nessun endpoint scaduto è ancora attivo.",
  });

  checks.push({
    id: "deliveries",
    label: "Consegne nelle ultime 24 ore",
    status: operationalError ? "fail" : failed24Hours > 0 ? "warn" : "pass",
    detail: operationalError
      ? "Impossibile verificare le consegne recenti."
      : `${sent24Hours} inviate; ${failed24Hours} fallite.`,
  });

  const status = checks.some((check) => check.status === "fail")
    ? "blocked"
    : checks.some((check) => check.status === "warn")
      ? "degraded"
      : "ready";

  return {
    release: PWA_RELEASE,
    status,
    generatedAt: nowIso,
    checks,
    metrics: {
      activeExpired,
      staleProcessing,
      overduePending,
      sent24Hours,
      failed24Hours,
    },
    latestCronRun: latestCron
      ? {
          status: latestCron.status,
          startedAt: latestCron.started_at,
          completedAt: latestCron.completed_at,
          durationMs: latestCron.duration_ms,
          errorCode: latestCron.error_code,
        }
      : null,
  };
}
