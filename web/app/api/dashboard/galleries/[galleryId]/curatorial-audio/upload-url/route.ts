import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlanName } from "@/lib/plans";

export const dynamic = "force-dynamic";

const BUCKET = "gallery-curatorial-audio";
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
]);

type RouteContext = {
  params: Promise<{
    galleryId: string;
  }>;
};

type UploadUrlPayload = {
  fileName?: unknown;
  fileSizeBytes?: unknown;
  mimeType?: unknown;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: string | null;
};

type GalleryRecord = {
  id: string;
  owner_id: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getExtension(fileName: string, mimeType: string) {
  const fromName = fileName.split(".").pop()?.toLowerCase() || "";

  if (["mp3", "ogg", "wav", "m4a", "aac", "mpeg", "mp4"].includes(fromName)) {
    return fromName === "mpeg" ? "mp3" : fromName;
  }

  if (mimeType === "audio/ogg") return "ogg";
  if (mimeType === "audio/wav" || mimeType === "audio/x-wav") return "wav";
  if (mimeType === "audio/mp4" || mimeType === "audio/x-m4a") return "m4a";
  if (mimeType === "audio/aac") return "aac";

  return "mp3";
}

function canUseCuratorialAudio(role: string | null | undefined, planValue: string | null | undefined) {
  if (role === "admin") {
    return true;
  }

  const plan = normalizePlanName(planValue);

  return plan === "business" || plan === "diamond" || plan === "institution";
}

export async function POST(request: Request, context: RouteContext) {
  const { galleryId } = await context.params;

  if (!galleryId) {
    return NextResponse.json({ error: "Missing galleryId" }, { status: 400 });
  }

  let body: UploadUrlPayload;

  try {
    body = (await request.json()) as UploadUrlPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fileName = cleanText(body.fileName);
  const mimeType = cleanText(body.mimeType).toLowerCase();
  const fileSizeBytes = Number(body.fileSizeBytes);

  if (!fileName) {
    return NextResponse.json(
      { error: "Nome file mancante." },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Formato audio non supportato. Usa MP3, WAV, OGG, M4A o AAC." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return NextResponse.json(
      { error: "Dimensione file non valida." },
      { status: 400 }
    );
  }

  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Audio troppo pesante. Il limite massimo è 25 MB." },
      { status: 413 }
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: profile }, { data: gallery, error: galleryError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, role, plan")
        .eq("id", user.id)
        .maybeSingle<Profile>(),
      admin
        .from("galleries")
        .select("id, owner_id")
        .eq("id", galleryId)
        .maybeSingle<GalleryRecord>(),
    ]);

  if (galleryError || !gallery) {
    return NextResponse.json(
      { error: "Galleria non trovata." },
      { status: 404 }
    );
  }

  const isOwner = gallery.owner_id === user.id;
  const isAdmin = profile?.role === "admin";

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canUseCuratorialAudio(profile?.role, profile?.plan)) {
    return NextResponse.json(
      {
        error:
          "L’audio guida della galleria è disponibile solo dai piani Business, Diamond e Institution.",
      },
      { status: 403 }
    );
  }

  const extension = getExtension(fileName, mimeType);
  const storagePath = `${gallery.owner_id}/${gallery.id}/${randomUUID()}.${extension}`;

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    return NextResponse.json(
      {
        error: "Non riesco a preparare il caricamento audio.",
        details: error?.message || null,
      },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

  return NextResponse.json({
    success: true,
    bucket: BUCKET,
    path: storagePath,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl,
    maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
  });
}
