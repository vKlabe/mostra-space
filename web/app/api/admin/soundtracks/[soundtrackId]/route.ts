import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    soundtrackId: string;
  }>;
};

type UpdateSoundtrackPayload = {
  title?: unknown;
  mood?: unknown;
  loopDurationSeconds?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
};

type ExistingSoundtrack = {
  id: string;
  storage_path: string | null;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function cleanPositiveInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

function cleanNonNegativeInteger(value: unknown, fallback: number) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.round(parsed);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { soundtrackId } = await context.params;

  if (!soundtrackId) {
    return NextResponse.json(
      { error: "Missing soundtrackId" },
      { status: 400 }
    );
  }

  const current = await requireAdminApi();

  if (!current.ok) {
    return NextResponse.json(
      { error: current.error },
      { status: current.status }
    );
  }

  let body: UpdateSoundtrackPayload;

  try {
    body = (await request.json()) as UpdateSoundtrackPayload;
  } catch {
    return NextResponse.json(
      { error: "Payload non valido." },
      { status: 400 }
    );
  }

  const title = cleanText(body.title);
  const mood = cleanNullableText(body.mood);
  const loopDurationSeconds = cleanPositiveInteger(
    body.loopDurationSeconds
  );
  const isActive = body.isActive === true;
  const sortOrder = cleanNonNegativeInteger(body.sortOrder, 100);

  if (!title) {
    return NextResponse.json(
      { error: "Il titolo della soundtrack è obbligatorio." },
      { status: 400 }
    );
  }

  const { data: soundtrack, error: updateError } = await current.admin
    .from("gallery_soundtracks")
    .update({
      title,
      mood,
      loop_duration_seconds: loopDurationSeconds,
      is_active: isActive,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", soundtrackId)
    .select(
      [
        "id",
        "title",
        "mood",
        "loop_duration_seconds",
        "audio_url",
        "storage_path",
        "is_active",
        "sort_order",
        "created_at",
        "updated_at",
      ].join(", ")
    )
    .single();

  if (updateError || !soundtrack) {
    return NextResponse.json(
      {
        error: "Errore aggiornamento soundtrack.",
        details: updateError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    soundtrack,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { soundtrackId } = await context.params;

  if (!soundtrackId) {
    return NextResponse.json(
      { error: "Missing soundtrackId" },
      { status: 400 }
    );
  }

  const current = await requireAdminApi();

  if (!current.ok) {
    return NextResponse.json(
      { error: current.error },
      { status: current.status }
    );
  }

  const { data: existingSoundtrack, error: existingError } =
    await current.admin
      .from("gallery_soundtracks")
      .select("id, storage_path")
      .eq("id", soundtrackId)
      .maybeSingle<ExistingSoundtrack>();

  if (existingError) {
    return NextResponse.json(
      {
        error: "Errore caricamento soundtrack.",
        details: existingError.message,
      },
      { status: 500 }
    );
  }

  if (!existingSoundtrack) {
    return NextResponse.json(
      { error: "Soundtrack non trovata." },
      { status: 404 }
    );
  }

  const { error: unlinkError } = await current.admin
    .from("galleries")
    .update({
      soundtrack_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("soundtrack_id", soundtrackId);

  if (unlinkError) {
    return NextResponse.json(
      {
        error: "Errore scollegamento gallerie dalla soundtrack.",
        details: unlinkError.message,
      },
      { status: 500 }
    );
  }

  const { error: deleteError } = await current.admin
    .from("gallery_soundtracks")
    .delete()
    .eq("id", soundtrackId);

  if (deleteError) {
    return NextResponse.json(
      {
        error: "Errore eliminazione soundtrack.",
        details: deleteError.message,
      },
      { status: 500 }
    );
  }

  if (existingSoundtrack.storage_path) {
    await current.admin.storage
      .from("gallery-soundtracks")
      .remove([existingSoundtrack.storage_path]);
  }

  return NextResponse.json({
    success: true,
    deletedSoundtrackId: soundtrackId,
  });
}
