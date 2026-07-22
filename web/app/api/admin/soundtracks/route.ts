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

function cleanText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanNullableText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function cleanPositiveInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

function cleanNonNegativeInteger(value: FormDataEntryValue | null, fallback: number) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.round(parsed);
}

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

export async function POST(request: Request) {
  const current = await requireAdminApi();

  if (!current.ok) {
    return NextResponse.json(
      { error: current.error },
      { status: current.status }
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

  const title = cleanText(formData.get("title"));
  const mood = cleanNullableText(formData.get("mood"));
  const loopDurationSeconds = cleanPositiveInteger(
    formData.get("loopDurationSeconds")
  );
  const sortOrder = cleanNonNegativeInteger(formData.get("sortOrder"), 100);
  const isActive = cleanText(formData.get("isActive")) === "true";
  const audioFile = formData.get("audio_file");

  if (!title) {
    return NextResponse.json(
      { error: "Il titolo della soundtrack è obbligatorio." },
      { status: 400 }
    );
  }

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
  const storagePath = `soundtracks/${crypto.randomUUID()}.${extension}`;

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

  const { data: soundtrack, error: insertError } = await current.admin
    .from("gallery_soundtracks")
    .insert({
      title,
      mood,
      loop_duration_seconds: loopDurationSeconds,
      audio_url: audioUrl,
      storage_path: storagePath,
      is_active: isActive,
      sort_order: sortOrder,
    })
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

  if (insertError || !soundtrack) {
    await current.admin.storage.from(SOUNDTRACK_BUCKET).remove([storagePath]);

    return NextResponse.json(
      {
        error: "Errore creazione soundtrack.",
        details: insertError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, soundtrack }, { status: 201 });
}