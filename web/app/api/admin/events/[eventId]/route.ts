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

type EventPatchBody = {
  action?: unknown;
  featuredSortOrder?: unknown;
  highlightSortOrder?: unknown;
};

function cleanSortOrder(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 100;
  }

  if (numberValue < 1) {
    return 1;
  }

  if (numberValue > 999) {
    return 999;
  }

  return Math.round(numberValue);
}

async function requireAdminApi() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
      admin,
      user: null,
      profile: null,
    };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    return {
      ok: false,
      status: 404,
      error: "Profilo non trovato.",
      admin,
      user,
      profile: null,
    };
  }

  if (profile.role !== "admin") {
    return {
      ok: false,
      status: 403,
      error: "Solo gli admin possono modificare la curation eventi.",
      admin,
      user,
      profile,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    admin,
    user,
    profile,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { eventId } = await context.params;

  if (!eventId) {
    return NextResponse.json(
      { success: false, error: "Event ID mancante." },
      { status: 400 }
    );
  }

  const current = await requireAdminApi();

  if (!current.ok) {
    return NextResponse.json(
      { success: false, error: current.error },
      { status: current.status }
    );
  }

  let body: EventPatchBody;

  try {
    body = (await request.json()) as EventPatchBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Payload non valido." },
      { status: 400 }
    );
  }

  const action = typeof body.action === "string" ? body.action : "";
  const featuredSortOrder = cleanSortOrder(body.featuredSortOrder);
  const highlightSortOrder = cleanSortOrder(body.highlightSortOrder);

  if (action === "set-featured") {
    await current.admin
      .from("gallery_events")
      .update({
        public_featured_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .neq("id", eventId);

    const { data, error } = await current.admin
      .from("gallery_events")
      .update({
        public_featured_enabled: true,
        public_featured_sort_order: featuredSortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select("id, public_featured_enabled, public_featured_sort_order")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          success: false,
          error: "Errore impostazione evento in evidenza.",
          details: error?.message || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, event: data });
  }

  if (action === "unset-featured") {
    const { data, error } = await current.admin
      .from("gallery_events")
      .update({
        public_featured_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select("id, public_featured_enabled")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          success: false,
          error: "Errore rimozione evento in evidenza.",
          details: error?.message || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, event: data });
  }

  if (action === "update-featured-order") {
    const { data, error } = await current.admin
      .from("gallery_events")
      .update({
        public_featured_sort_order: featuredSortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select("id, public_featured_sort_order")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          success: false,
          error: "Errore aggiornamento ordine evento in evidenza.",
          details: error?.message || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, event: data });
  }

  if (action === "set-highlight") {
    const { data, error } = await current.admin
      .from("gallery_events")
      .update({
        public_highlight_enabled: true,
        public_highlight_sort_order: highlightSortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select("id, public_highlight_enabled, public_highlight_sort_order")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          success: false,
          error: "Errore aggiunta evento allo slider.",
          details: error?.message || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, event: data });
  }

  if (action === "unset-highlight") {
    const { data, error } = await current.admin
      .from("gallery_events")
      .update({
        public_highlight_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select("id, public_highlight_enabled")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          success: false,
          error: "Errore rimozione evento dallo slider.",
          details: error?.message || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, event: data });
  }

  if (action === "update-highlight-order") {
    const { data, error } = await current.admin
      .from("gallery_events")
      .update({
        public_highlight_sort_order: highlightSortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select("id, public_highlight_sort_order")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          success: false,
          error: "Errore aggiornamento ordine slider.",
          details: error?.message || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, event: data });
  }

  return NextResponse.json(
    { success: false, error: "Azione non valida." },
    { status: 400 }
  );
}
