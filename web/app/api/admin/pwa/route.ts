import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import {
  PushDeliveryConfigurationError,
} from "@/lib/pwa/pushDelivery.server";
import { runRecordedPushDispatch } from "@/lib/pwa/pushDispatchRun.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminPushAction = {
  action?: unknown;
  deliveryId?: unknown;
  subscriptionId?: unknown;
};

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

async function recordAction({
  admin,
  adminUserId,
  action,
  subscriptionId,
  deliveryId,
  metadata = {},
}: {
  admin: NonNullable<Awaited<ReturnType<typeof requireAdminApi>>["admin"]>;
  adminUserId: string;
  action: "dispatch_run" | "delivery_requeued" | "subscription_disabled";
  subscriptionId?: string;
  deliveryId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await admin.from("pwa_push_admin_actions").insert({
    admin_user_id: adminUserId,
    action,
    subscription_id: subscriptionId || null,
    delivery_id: deliveryId || null,
    metadata,
  });

  if (error) {
    console.error("Unable to record PWA admin action", {
      adminUserId,
      action,
      code: error.code,
    });
  }
}

export async function POST(request: Request) {
  const current = await requireAdminApi();

  if (!current.ok || !current.admin || !current.user) {
    return json(
      { success: false, code: current.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" },
      current.status
    );
  }

  let body: AdminPushAction;

  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return json({ success: false, code: "INVALID_PAYLOAD" }, 400);
    }

    body = payload as AdminPushAction;
  } catch {
    return json({ success: false, code: "INVALID_JSON" }, 400);
  }

  if (body.action === "dispatch") {
    try {
      const summary = await runRecordedPushDispatch("admin");
      await recordAction({
        admin: current.admin,
        adminUserId: current.user.id,
        action: "dispatch_run",
        metadata: summary,
      });
      return json({ success: true, summary });
    } catch (error) {
      if (error instanceof PushDeliveryConfigurationError) {
        return json({ success: false, code: "PUSH_NOT_CONFIGURED" }, 503);
      }

      console.error("Manual PWA dispatcher failed", {
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      });
      return json({ success: false, code: "DISPATCH_FAILED" }, 500);
    }
  }

  if (body.action === "retry_delivery") {
    if (!isUuid(body.deliveryId)) {
      return json({ success: false, code: "INVALID_DELIVERY_ID" }, 400);
    }

    const { data: delivery, error: deliveryError } = await current.admin
      .from("pwa_push_deliveries")
      .select("id, notification_id, subscription_id, status")
      .eq("id", body.deliveryId)
      .maybeSingle();

    if (deliveryError) {
      return json({ success: false, code: "LOAD_FAILED" }, 500);
    }

    if (!delivery) {
      return json({ success: false, code: "DELIVERY_NOT_FOUND" }, 404);
    }

    const [{ data: subscription }, { data: notification }] = await Promise.all([
      current.admin
        .from("pwa_push_subscriptions")
        .select("id, active, expires_at")
        .eq("id", delivery.subscription_id)
        .maybeSingle(),
      current.admin
        .from("account_notifications")
        .select("id, read_at, scheduled_for")
        .eq("id", delivery.notification_id)
        .maybeSingle(),
    ]);

    const subscriptionExpired = Boolean(
      subscription?.expires_at &&
        Date.parse(subscription.expires_at) <= Date.now()
    );

    if (!subscription?.active || subscriptionExpired) {
      return json({ success: false, code: "SUBSCRIPTION_INACTIVE" }, 409);
    }

    if (
      !notification ||
      notification.read_at ||
      Date.parse(notification.scheduled_for) > Date.now()
    ) {
      return json({ success: false, code: "NOTIFICATION_NOT_DELIVERABLE" }, 409);
    }

    const { data: updated, error: updateError } = await current.admin
      .from("pwa_push_deliveries")
      .update({
        status: "pending",
        attempt_count: 0,
        next_attempt_at: new Date().toISOString(),
        claimed_at: null,
        claim_token: null,
        response_status: null,
        last_error_code: null,
        sent_at: null,
      })
      .eq("id", delivery.id)
      .in("status", ["failed", "skipped"])
      .select("id, status")
      .maybeSingle();

    if (updateError) {
      return json({ success: false, code: "RETRY_FAILED" }, 500);
    }

    if (!updated) {
      return json({ success: false, code: "DELIVERY_NOT_RETRYABLE" }, 409);
    }

    await recordAction({
      admin: current.admin,
      adminUserId: current.user.id,
      action: "delivery_requeued",
      deliveryId: delivery.id,
      subscriptionId: delivery.subscription_id,
    });

    return json({ success: true, delivery: updated });
  }

  if (body.action === "disable_subscription") {
    if (!isUuid(body.subscriptionId)) {
      return json({ success: false, code: "INVALID_SUBSCRIPTION_ID" }, 400);
    }

    const now = new Date().toISOString();
    const { data: subscription, error: updateError } = await current.admin
      .from("pwa_push_subscriptions")
      .update({
        active: false,
        disabled_at: now,
        last_error_code: "ADMIN_DISABLED",
        last_error_at: now,
      })
      .eq("id", body.subscriptionId)
      .eq("active", true)
      .select("id, user_id, active")
      .maybeSingle();

    if (updateError) {
      return json({ success: false, code: "DISABLE_FAILED" }, 500);
    }

    if (!subscription) {
      return json({ success: false, code: "SUBSCRIPTION_NOT_ACTIVE" }, 409);
    }

    const { error: settleError } = await current.admin
      .from("pwa_push_deliveries")
      .update({
        status: "skipped",
        claimed_at: null,
        claim_token: null,
        last_error_code: "ADMIN_DISABLED",
      })
      .eq("subscription_id", subscription.id)
      .in("status", ["pending", "processing"]);

    if (settleError) {
      console.error("Unable to settle disabled subscription deliveries", {
        subscriptionId: subscription.id,
        code: settleError.code,
      });
    }

    const { count: activeDeviceCount } = await current.admin
      .from("pwa_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", subscription.user_id)
      .eq("active", true);

    if (!activeDeviceCount) {
      await current.admin.from("pwa_push_preferences").upsert(
        {
          user_id: subscription.user_id,
          push_enabled: false,
        },
        { onConflict: "user_id" }
      );
    }

    await recordAction({
      admin: current.admin,
      adminUserId: current.user.id,
      action: "subscription_disabled",
      subscriptionId: subscription.id,
    });

    return json({ success: true, subscription });
  }

  return json({ success: false, code: "INVALID_ACTION" }, 400);
}
