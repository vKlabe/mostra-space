import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  validatePushSubscription,
  validateSubscriptionSelector,
} from "@/lib/pwa/pushValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

async function getRequestContext() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { admin, user };
}

async function readJson(request: Request) {
  try {
    return { success: true as const, value: await request.json() };
  } catch {
    return { success: false as const };
  }
}

export async function GET() {
  const { admin, user } = await getRequestContext();

  if (!user) {
    return json({ success: false, code: "UNAUTHORIZED" }, 401);
  }

  const { data, error } = await admin
    .from("pwa_push_subscriptions")
    .select(
      "id, endpoint, device_label, locale, timezone, active, created_at, updated_at, last_seen_at, expires_at, disabled_at"
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Unable to load PWA push subscriptions", {
      userId: user.id,
      code: error.code,
    });
    return json({ success: false, code: "LOAD_FAILED" }, 500);
  }

  const subscriptions = (data || []).map((subscription) => ({
    id: subscription.id,
    endpointHash: createHash("sha256")
      .update(subscription.endpoint)
      .digest("base64url"),
    deviceLabel: subscription.device_label,
    locale: subscription.locale,
    timezone: subscription.timezone,
    active: subscription.active,
    createdAt: subscription.created_at,
    updatedAt: subscription.updated_at,
    lastSeenAt: subscription.last_seen_at,
    expiresAt: subscription.expires_at,
    disabledAt: subscription.disabled_at,
  }));

  return json({ success: true, subscriptions });
}

export async function POST(request: Request) {
  const { admin, user } = await getRequestContext();

  if (!user) {
    return json({ success: false, code: "UNAUTHORIZED" }, 401);
  }

  const body = await readJson(request);

  if (!body.success) {
    return json({ success: false, code: "INVALID_JSON" }, 400);
  }

  const parsed = validatePushSubscription(body.value);

  if (!parsed.success) {
    return json({ success: false, code: parsed.code }, 400);
  }

  const subscription = parsed.value;
  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await admin
    .from("pwa_push_subscriptions")
    .select("id, user_id")
    .eq("endpoint", subscription.endpoint)
    .maybeSingle<{ id: string; user_id: string }>();

  if (existingError) {
    console.error("Unable to inspect PWA push subscription", {
      userId: user.id,
      code: existingError.code,
    });
    return json({ success: false, code: "SAVE_FAILED" }, 500);
  }

  if (existing && existing.user_id !== user.id) {
    // A browser subscription belongs to the currently authenticated account.
    // Removing the old row also removes its delivery history through CASCADE,
    // avoiding cross-account notification delivery on shared devices.
    const { error: removeError } = await admin
      .from("pwa_push_subscriptions")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", existing.user_id);

    if (removeError) {
      console.error("Unable to release PWA push subscription", {
        userId: user.id,
        code: removeError.code,
      });
      return json({ success: false, code: "SAVE_FAILED" }, 500);
    }
  }

  const values = {
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth_key: subscription.authKey,
    content_encoding: subscription.contentEncoding,
    device_label: subscription.deviceLabel,
    user_agent: request.headers.get("user-agent")?.slice(0, 512) || null,
    locale: subscription.locale,
    timezone: subscription.timezone,
    active: true,
    expires_at: subscription.expiresAt,
    disabled_at: null,
    failure_count: 0,
    last_error_code: null,
    last_error_at: null,
    last_seen_at: now,
  };

  const saveQuery = existing?.user_id === user.id
    ? admin
        .from("pwa_push_subscriptions")
        .update(values)
        .eq("id", existing.id)
        .eq("user_id", user.id)
    : admin.from("pwa_push_subscriptions").insert(values);

  const { data: saved, error: saveError } = await saveQuery
    .select("id, active, created_at, updated_at, last_seen_at")
    .single();

  if (saveError || !saved) {
    console.error("Unable to save PWA push subscription", {
      userId: user.id,
      code: saveError?.code || "NO_ROW",
    });
    return json({ success: false, code: "SAVE_FAILED" }, 500);
  }

  return json({
    success: true,
    subscription: {
      id: saved.id,
      active: saved.active,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
      lastSeenAt: saved.last_seen_at,
    },
  });
}

export async function DELETE(request: Request) {
  const { admin, user } = await getRequestContext();

  if (!user) {
    return json({ success: false, code: "UNAUTHORIZED" }, 401);
  }

  const body = await readJson(request);

  if (!body.success) {
    return json({ success: false, code: "INVALID_JSON" }, 400);
  }

  const parsed = validateSubscriptionSelector(body.value);

  if (!parsed.success) {
    return json({ success: false, code: parsed.code }, 400);
  }

  const now = new Date().toISOString();
  let query = admin
    .from("pwa_push_subscriptions")
    .update({
      active: false,
      disabled_at: now,
      last_seen_at: now,
    })
    .eq("user_id", user.id);

  if (parsed.value.subscriptionId) {
    query = query.eq("id", parsed.value.subscriptionId);
  } else if (parsed.value.endpoint) {
    query = query.eq("endpoint", parsed.value.endpoint);
  }

  const { data, error } = await query.select("id, active, disabled_at").maybeSingle();

  if (error) {
    console.error("Unable to disable PWA push subscription", {
      userId: user.id,
      code: error.code,
    });
    return json({ success: false, code: "DISABLE_FAILED" }, 500);
  }

  if (!data) {
    return json({ success: false, code: "SUBSCRIPTION_NOT_FOUND" }, 404);
  }

  const { count: remainingActiveSubscriptions, error: countError } =
    await admin
      .from("pwa_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("active", true);

  if (countError) {
    console.error("Unable to count active PWA push subscriptions", {
      userId: user.id,
      code: countError.code,
    });
    return json({ success: false, code: "DISABLE_FAILED" }, 500);
  }

  if (!remainingActiveSubscriptions) {
    const { error: preferenceError } = await admin
      .from("pwa_push_preferences")
      .upsert(
        {
          user_id: user.id,
          push_enabled: false,
        },
        { onConflict: "user_id" }
      );

    if (preferenceError) {
      console.error("Unable to disable PWA push preference", {
        userId: user.id,
        code: preferenceError.code,
      });
      return json({ success: false, code: "DISABLE_FAILED" }, 500);
    }
  }

  return json({
    success: true,
    remainingActiveSubscriptions: remainingActiveSubscriptions || 0,
    subscription: {
      id: data.id,
      active: data.active,
      disabledAt: data.disabled_at,
    },
  });
}
