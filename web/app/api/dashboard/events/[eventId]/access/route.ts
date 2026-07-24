import crypto from "node:crypto";
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

type AccessMode = "public" | "password" | "invite_only" | "private_link";

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type GalleryEvent = {
  id: string;
  owner_id: string;
};

function cleanAccessMode(value: unknown): AccessMode {
  if (
    value === "public" ||
    value === "password" ||
    value === "invite_only" ||
    value === "private_link"
  ) {
    return value;
  }

  return "public";
}

function cleanNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
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

  const { data: event } = await admin
    .from("gallery_events")
    .select("id, owner_id")
    .eq("id", eventId)
    .maybeSingle<GalleryEvent>();

  if (!profile || !event) {
    return { ok: false, status: 404, error: "Evento non trovato.", admin, user, event: null };
  }

  if (profile.role !== "admin" && event.owner_id !== user.id) {
    return { ok: false, status: 403, error: "Non puoi modificare questo evento.", admin, user, event };
  }

  return { ok: true, status: 200, error: null, admin, user, event };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const permission = await requireEventPermission(eventId);

  if (!permission.ok || !permission.event) {
    return NextResponse.json(
      { success: false, error: permission.error },
      { status: permission.status }
    );
  }

  let body: { accessMode?: unknown; password?: unknown };

  try {
    body = (await request.json()) as { accessMode?: unknown; password?: unknown };
  } catch {
    return NextResponse.json(
      { success: false, error: "Payload non valido." },
      { status: 400 }
    );
  }

  const accessMode = cleanAccessMode(body.accessMode);
  const password = cleanNullableText(body.password);

  if (accessMode === "password" && (!password || password.length < 4)) {
    return NextResponse.json(
      { success: false, error: "Inserisci una password di almeno 4 caratteri." },
      { status: 400 }
    );
  }

  const { data, error } = await permission.admin
    .from("gallery_events")
    .update({
      access_mode: accessMode,
      password_hash: accessMode === "password" && password ? hashPassword(password) : null,
      private_token: accessMode === "private_link" ? crypto.randomUUID() : null,
      is_listed: accessMode === "public" || accessMode === "password",
      requires_login: accessMode === "invite_only",
      updated_at: new Date().toISOString(),
    })
    .eq("id", permission.event.id)
    .select("id, access_mode, private_token, is_listed, requires_login")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: "Errore aggiornamento accesso evento.", details: error?.message || null },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, event: data });
}
