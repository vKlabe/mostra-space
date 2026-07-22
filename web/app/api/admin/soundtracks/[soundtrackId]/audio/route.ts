import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SOUNDTRACK_BUCKET = "gallery-soundtracks";
const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
];

type RouteContext = {
  params: Promise<{
    soundtrackId: string;
  }>;
};

type ExistingSoundtrack = {
  id: string;
  storage_path: string | null;
};

function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();

  if (fromName) {
    return fromName.replace(/[^a-z0-9]/g, "");
  }

  if (file.type === "audio/ogg") {
    return "ogg";
  }

  if (file.type === "audio/wav" || file.type === "audio/x-wav") {
    return "wav";
  }

  return "mp3";
}

function validateAudioFile(file: File | null) {
  if (!file) {
    return "File audio mancante.";
  }

  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return "Formato audio non supportato. Usa MP3, OGG oppure WAV leggero.";
  }

  if (file.size <= 0) {
    return "Il file audio selezionato è vuoto.";
  }

  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return "Il file audio non può superare 10 MB.";
  }

  return "";
}

export async function POST(request: Request, context: RouteContext) {
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

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Payload multipart non valido." },
      { status: 400 }
    );
  }

  const audioFile = formData.get("audio_file");
const file = audioFile instanceof File ? audioFile : null;
const validationError = validateAudioFile(file);

if (validationError) {
  return NextResponse.json({ error: validationError }, { status: 400 });
}

if (!file) {
  return NextResponse.json(
    { error: "File audio mancante." },
    { status: 400 }
  );
}

const extension = getFileExtension(file);
  const storagePath = `soundtracks/${soundtrackId}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await current.admin.storage
    .from(SOUNDTRACK_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "audio/mpeg",
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        error: "Errore upload audio soundtrack.",
        details: uploadError.message,
      },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = current.admin.storage
    .from(SOUNDTRACK_BUCKET)
    .getPublicUrl(storagePath);

  const audioUrl = publicUrlData.publicUrl;

  const { data: soundtrack, error: updateError } = await current.admin
    .from("gallery_soundtracks")
    .update({
      audio_url: audioUrl,
      storage_path: storagePath,
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
    await current.admin.storage.from(SOUNDTRACK_BUCKET).remove([storagePath]);

    return NextResponse.json(
      {
        error: "Errore aggiornamento audio soundtrack.",
        details: updateError?.message || null,
      },
      { status: 500 }
    );
  }

  if (existingSoundtrack.storage_path) {
    await current.admin.storage
      .from(SOUNDTRACK_BUCKET)
      .remove([existingSoundtrack.storage_path]);
  }

  return NextResponse.json({
    success: true,
    soundtrack,
  });
}
