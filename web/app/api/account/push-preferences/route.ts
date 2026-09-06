import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  mapPushPreferences,
  validatePushPreferencePatch,
} from "@/lib/pwa/pushValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

const PREFERENCE_COLUMNS =
  "push_enabled, messages_enabled, followers_enabled, favorites_enabled, publications_enabled, invitations_enabled, events_enabled, event_reminders_enabled, gallery_updates_enabled, platform_updates_enabled" as const;

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

export async function GET() {
  const { admin, user } = await getRequestContext();

  if (!user) {
    return json({ success: false, code: "UNAUTHORIZED" }, 401);
  }

  const { data, error } = await admin
    .from("pwa_push_preferences")
    .select(PREFERENCE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load PWA push preferences", {
      userId: user.id,
      code: error.code,
    });
    return json({ success: false, code: "LOAD_FAILED" }, 500);
  }

  return json({
    success: true,
    preferences: mapPushPreferences(data as Record<string, unknown> | null),
  });
}

export async function PATCH(request: Request) {
  const { admin, user } = await getRequestContext();

  if (!user) {
    return json({ success: false, code: "UNAUTHORIZED" }, 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ success: false, code: "INVALID_JSON" }, 400);
  }

  const parsed = validatePushPreferencePatch(body);

  if (!parsed.success) {
    return json({ success: false, code: parsed.code }, 400);
  }

  if (parsed.value.push_enabled === true) {
    const { count, error: countError } = await admin
      .from("pwa_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("active", true);

    if (countError) {
      console.error("Unable to verify active PWA push subscriptions", {
        userId: user.id,
        code: countError.code,
      });
      return json({ success: false, code: "SAVE_FAILED" }, 500);
    }

    if (!count) {
      return json(
        { success: false, code: "ACTIVE_SUBSCRIPTION_REQUIRED" },
        409
      );
    }
  }

  const { data, error } = await admin
    .from("pwa_push_preferences")
    .upsert(
      {
        user_id: user.id,
        ...parsed.value,
      },
      { onConflict: "user_id" }
    )
    .select(PREFERENCE_COLUMNS)
    .single();

  if (error || !data) {
    console.error("Unable to save PWA push preferences", {
      userId: user.id,
      code: error?.code || "NO_ROW",
    });
    return json({ success: false, code: "SAVE_FAILED" }, 500);
  }

  return json({
    success: true,
    preferences: mapPushPreferences(data as Record<string, unknown>),
  });
}
