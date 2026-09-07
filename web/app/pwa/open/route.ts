import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSafePwaDestination } from "@/lib/auth/safeNavigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function redirectWithoutCache(destination: URL) {
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const destination = getSafePwaDestination(
    requestUrl.searchParams.get("next")
  );
  const rawNotificationId = requestUrl.searchParams.get("notification");
  const notificationId =
    rawNotificationId && UUID_PATTERN.test(rawNotificationId)
      ? rawNotificationId
      : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const gateway = new URL("/pwa/open", requestUrl.origin);
    gateway.searchParams.set("next", destination);

    if (notificationId) {
      gateway.searchParams.set("notification", notificationId);
    }

    const login = new URL("/auth/login", requestUrl.origin);
    login.searchParams.set("next", `${gateway.pathname}${gateway.search}`);

    return redirectWithoutCache(login);
  }

  if (notificationId) {
    const admin = createAdminClient();
    const { error } = await admin
      .from("account_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      console.error("Unable to mark opened PWA notification as read", {
        userId: user.id,
        notificationId,
        code: error.code,
      });
    }
  }

  return redirectWithoutCache(new URL(destination, requestUrl.origin));
}
