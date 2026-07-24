import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type GalleryEvent = {
  id: string;
  owner_id: string;
  gallery_id: string;
  title: string;
};

type InviteProfile = {
  id: string;
  email: string | null;
};

function cleanEmail(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const cleaned = value.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    return "";
  }

  return cleaned.slice(0, 254);
}

function cleanEmails(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((item) => cleanEmail(item)).filter(Boolean))).slice(0, 200);
}

async function requireEventPermission(eventId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized", admin, user: null, event: null };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) {
    return { ok: false, status: 404, error: "Profilo non trovato.", admin, user, event: null };
  }

  const { data: event } = await admin
    .from("gallery_events")
    .select("id, owner_id, gallery_id, title")
    .eq("id", eventId)
    .maybeSingle<GalleryEvent>();

  if (!event) {
    return { ok: false, status: 404, error: "Evento non trovato.", admin, user, event: null };
  }

  if (profile.role !== "admin" && event.owner_id !== user.id) {
    return { ok: false, status: 403, error: "Non puoi gestire gli inviti di questo evento.", admin, user, event };
  }

  return { ok: true, status: 200, error: null, admin, user, event };
}

export async function POST(request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const permission = await requireEventPermission(eventId);

  if (!permission.ok || !permission.user || !permission.event) {
    return NextResponse.json(
      { success: false, error: permission.error },
      { status: permission.status }
    );
  }

  let body: { emails?: unknown };

  try {
    body = (await request.json()) as { emails?: unknown };
  } catch {
    return NextResponse.json(
      { success: false, error: "Payload non valido." },
      { status: 400 }
    );
  }

  const emails = cleanEmails(body.emails);

  if (emails.length === 0) {
    return NextResponse.json(
      { success: false, error: "Inserisci almeno una email valida." },
      { status: 400 }
    );
  }

  const { data: profiles } = await permission.admin
    .from("profiles")
    .select("id, email")
    .in("email", emails);

  const profileByEmail = new Map(
    ((profiles || []) as InviteProfile[])
      .filter((profile) => profile.email)
      .map((profile) => [profile.email!.toLowerCase(), profile])
  );

  const rows = emails.map((email) => ({
    event_id: permission.event!.id,
    email,
    user_id: profileByEmail.get(email)?.id || null,
    role: "attendee",
    status: "invited",
    created_by: permission.user!.id,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await permission.admin
    .from("gallery_event_invites")
    .upsert(rows, {
      onConflict: "event_id,email",
      ignoreDuplicates: false,
    })
    .select("id, email, user_id, invite_token, status");

  if (error) {
    return NextResponse.json(
      { success: false, error: "Errore salvataggio inviti.", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, invites: data || [] });
}
