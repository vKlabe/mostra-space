import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  dispatchDuePushNotifications,
  PushDeliveryConfigurationError,
  type PushDispatchSummary,
} from "@/lib/pwa/pushDelivery.server";

export type PushDispatchTrigger = "cron" | "admin";

function dispatchErrorCode(error: unknown) {
  if (error instanceof PushDeliveryConfigurationError) {
    return "PUSH_DELIVERY_NOT_CONFIGURED";
  }

  if (error instanceof Error && error.name) {
    return error.name.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase().slice(0, 120);
  }

  return "UNKNOWN_ERROR";
}

export async function runRecordedPushDispatch(
  triggerSource: PushDispatchTrigger
): Promise<PushDispatchSummary> {
  const admin = createAdminClient();
  const startedAt = Date.now();
  const { data: run, error: startError } = await admin
    .from("pwa_push_dispatch_runs")
    .insert({ trigger_source: triggerSource, status: "running" })
    .select("id")
    .single<{ id: string }>();

  if (startError || !run) {
    throw new Error(`Push dispatch telemetry start failed: ${startError?.code || "NO_ROW"}`);
  }

  try {
    const summary = await dispatchDuePushNotifications();
    const completedAt = new Date().toISOString();
    const { error: completionError } = await admin
      .from("pwa_push_dispatch_runs")
      .update({
        status: "succeeded",
        summary,
        completed_at: completedAt,
        duration_ms: Math.max(0, Date.now() - startedAt),
        error_code: null,
      })
      .eq("id", run.id)
      .eq("status", "running");

    if (completionError) {
      throw new Error(`Push dispatch telemetry completion failed: ${completionError.code}`);
    }

    const { error: pruneError } = await admin.rpc("pwa_prune_push_dispatch_runs", {
      p_keep_days: 30,
    });

    if (pruneError) {
      console.error("Unable to prune PWA dispatcher telemetry", {
        code: pruneError.code,
      });
    }

    return summary;
  } catch (error) {
    const { error: failureError } = await admin
      .from("pwa_push_dispatch_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        duration_ms: Math.max(0, Date.now() - startedAt),
        error_code: dispatchErrorCode(error),
      })
      .eq("id", run.id)
      .eq("status", "running");

    if (failureError) {
      console.error("Unable to record failed PWA dispatcher run", {
        code: failureError.code,
      });
    }

    throw error;
  }
}
