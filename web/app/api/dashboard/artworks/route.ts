import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  bytesToMb,
  canUploadArtwork,
  getPlanLimits,
  normalizePlanName,
} from "@/lib/plans";
import {
  parseDimensionCm,
  parseOptionalDepthCm,
} from "@/lib/artworks/dimensions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: string | null;
};

type ExistingArtwork = {
  id: string;
  file_size_bytes: number | null;
};

type JsonArtworkPayload = {
  action?: unknown;
  title?: unknown;
  artist_name?: unknown;
  year?: unknown;
  technique?: unknown;
  dimensions?: unknown;
  width_cm?: unknown;
  height_cm?: unknown;
  depth_cm?: unknown;
  description?: unknown;
  price?: unknown;
  currency?: unknown;
  is_for_sale?: unknown;
  is_public?: unknown;
  fileName?: unknown;
  fileType?: unknown;
  fileSizeBytes?: unknown;
  storagePath?: unknown;
  imageWidth?: unknown;
  imageHeight?: unknown;
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

function cleanBoolean(value: unknown) {
  return value === true || value === "true" || value === "on" || value === "1";
}

function cleanPrice(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim().replace(",", ".");

  if (!cleaned) {
    return null;
  }

  const numberValue = Number(cleaned);

  if (Number.isNaN(numberValue) || numberValue < 0) {
    return null;
  }

  return numberValue;
}

function getFileExtension(filename: string) {
  const parts = filename.split(".");
  const extension = parts.length > 1 ? parts[parts.length - 1] : "";

  return extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

function isAllowedImageContentType(contentType: string) {
  return (
    contentType === "image/jpeg" ||
    contentType === "image/png" ||
    contentType === "image/webp"
  );
}

function isAllowedImageFile(file: File) {
  return isAllowedImageContentType(file.type);
}

const MAX_IMAGE_LONG_SIDE_PX = 2048;

function getImagePixelSizeFromBody(body: JsonArtworkPayload) {
  return {
    width: cleanPositiveInteger(body.imageWidth),
    height: cleanPositiveInteger(body.imageHeight),
  };
}

function validateImagePixelSize(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return {
      ok: false,
      error: "Dimensioni immagine mancanti. Ricarica il file e riprova.",
    };
  }

  const longestSide = Math.max(width, height);

  if (longestSide > MAX_IMAGE_LONG_SIDE_PX) {
    return {
      ok: false,
      error: `Immagine troppo grande: ${width}×${height}px. Il lato lungo massimo consentito è ${MAX_IMAGE_LONG_SIDE_PX}px.`,
    };
  }

  return {
    ok: true,
    error: null,
  };
}

function cleanPositiveInteger(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return 0;
  }

  return Math.round(numberValue);
}

function parseArtworkFields(body: JsonArtworkPayload | FormData) {
  const getValue = (key: string) =>
    body instanceof FormData
      ? body.get(key)
      : body[key as keyof JsonArtworkPayload];

  return {
    title: cleanText(getValue("title")),
    artistName: cleanNullableText(getValue("artist_name")),
    year: cleanNullableText(getValue("year")),
    technique: cleanNullableText(getValue("technique")),
    dimensions: cleanNullableText(getValue("dimensions")),
    widthCm: parseDimensionCm(cleanText(getValue("width_cm"))),
    heightCm: parseDimensionCm(cleanText(getValue("height_cm"))),
    depthCm: parseOptionalDepthCm(cleanText(getValue("depth_cm"))),
    description: cleanNullableText(getValue("description")),
    price: cleanPrice(getValue("price")),
    currency: cleanText(getValue("currency")) || "EUR",
    isForSale: cleanBoolean(getValue("is_for_sale")),
    isPublic: cleanBoolean(getValue("is_public")),
  };
}

async function getArtworkUsage(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const { data: existingArtworks, error: artworksError } = await admin
    .from("artworks")
    .select("id, file_size_bytes")
    .eq("owner_id", userId);

  if (artworksError) {
    return {
      error: artworksError,
      currentArtworkCount: 0,
      currentStorageUsedBytes: 0,
    };
  }

  const safeExistingArtworks = (existingArtworks || []) as ExistingArtwork[];

  const currentArtworkCount = safeExistingArtworks.length;

  const currentStorageUsedBytes = safeExistingArtworks.reduce(
    (total, artwork) => total + (artwork.file_size_bytes || 0),
    0
  );

  return {
    error: null,
    currentArtworkCount,
    currentStorageUsedBytes,
  };
}

async function checkUploadLimits({
  admin,
  userId,
  plan,
  fileSizeBytes,
}: {
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  plan: ReturnType<typeof normalizePlanName>;
  fileSizeBytes: number;
}) {
  const limits = getPlanLimits(plan);
  const usage = await getArtworkUsage(admin, userId);

  if (usage.error) {
    return {
      ok: false,
      status: 500,
      error: "Errore controllo opere esistenti.",
      details: usage.error.message,
      limits,
      usage,
      uploadCheck: null,
    };
  }

  const uploadCheck = canUploadArtwork({
    profilePlan: plan,
    currentArtworkCount: usage.currentArtworkCount,
    currentStorageUsedMb: bytesToMb(usage.currentStorageUsedBytes),
    newFileSizeMb: bytesToMb(fileSizeBytes),
  });

  if (!uploadCheck.allowed) {
    return {
      ok: false,
      status: 403,
      error:
        uploadCheck.reason || `Hai raggiunto un limite del piano ${limits.label}.`,
      details: null,
      limits,
      usage,
      uploadCheck,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    details: null,
    limits,
    usage,
    uploadCheck,
  };
}

async function handlePrepareUpload({
  body,
  admin,
  userId,
  plan,
}: {
  body: JsonArtworkPayload;
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  plan: ReturnType<typeof normalizePlanName>;
}) {
  const fileName = cleanText(body.fileName);
  const fileType = cleanText(body.fileType);
  const fileSizeBytes = cleanPositiveInteger(body.fileSizeBytes);

  if (!fileName) {
    return NextResponse.json(
      { error: "Nome file mancante." },
      { status: 400 }
    );
  }

  if (fileSizeBytes <= 0) {
    return NextResponse.json(
      { error: "Il file immagine e vuoto." },
      { status: 400 }
    );
  }

  if (!isAllowedImageContentType(fileType)) {
    return NextResponse.json(
      { error: "Formato immagine non supportato. Usa JPG, PNG o WEBP." },
      { status: 400 }
    );
  }

  const imagePixelSize = getImagePixelSizeFromBody(body);
const imagePixelCheck = validateImagePixelSize(
  imagePixelSize.width,
  imagePixelSize.height
);

if (!imagePixelCheck.ok) {
  return NextResponse.json(
    { error: imagePixelCheck.error },
    { status: 400 }
  );
}

  const limitCheck = await checkUploadLimits({
    admin,
    userId,
    plan,
    fileSizeBytes,
  });

  if (!limitCheck.ok) {
    return NextResponse.json(
      {
        error: limitCheck.error,
        details: limitCheck.details,
        current: limitCheck.uploadCheck?.current,
        limit: limitCheck.uploadCheck?.limit,
        upgradeTo: limitCheck.uploadCheck?.upgradeTo,
      },
      { status: limitCheck.status }
    );
  }

  const extension = getFileExtension(fileName);
  const safeFileName = `${crypto.randomUUID()}.${extension}`;
  const storagePath = `${userId}/${safeFileName}`;

  const { data: signedUpload, error: signedUploadError } = await admin.storage
    .from("artworks")
    .createSignedUploadUrl(storagePath);

  if (signedUploadError || !signedUpload?.token) {
    return NextResponse.json(
      {
        error: "Errore preparazione upload immagine.",
        details: signedUploadError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    storagePath: signedUpload.path || storagePath,
    uploadToken: signedUpload.token,
    signedUrl: signedUpload.signedUrl,
    usage: {
      plan,
      artworksCurrent: limitCheck.usage.currentArtworkCount,
      artworksLimit: limitCheck.limits.maxArtworksTotal,
      storageUsedMb: bytesToMb(limitCheck.usage.currentStorageUsedBytes),
      storageLimitMb: limitCheck.limits.maxStorageMb,
      fileSizeMb: bytesToMb(fileSizeBytes),
      fileLimitMb: limitCheck.limits.maxArtworkFileMb,
    },
  });
}

async function handleCreateArtworkFromUploadedFile({
  body,
  admin,
  userId,
  plan,
}: {
  body: JsonArtworkPayload;
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  plan: ReturnType<typeof normalizePlanName>;
}) {
  const fields = parseArtworkFields(body);
  const storagePath = cleanText(body.storagePath);
  const fileType = cleanText(body.fileType);
  const fileSizeBytes = cleanPositiveInteger(body.fileSizeBytes);

  if (!fields.title) {
    return NextResponse.json(
      { error: "Il titolo dell opera e obbligatorio." },
      { status: 400 }
    );
  }

  if (!storagePath || !storagePath.startsWith(`${userId}/`)) {
    return NextResponse.json(
      { error: "Percorso file non valido." },
      { status: 400 }
    );
  }

  if (storagePath.includes("..")) {
    return NextResponse.json(
      { error: "Percorso file non valido." },
      { status: 400 }
    );
  }

  if (fileSizeBytes <= 0) {
    return NextResponse.json(
      { error: "Dimensione file non valida." },
      { status: 400 }
    );
  }

  if (!isAllowedImageContentType(fileType)) {
    return NextResponse.json(
      { error: "Formato immagine non supportato. Usa JPG, PNG o WEBP." },
      { status: 400 }
    );
  }

  const imagePixelSize = getImagePixelSizeFromBody(body);
const imagePixelCheck = validateImagePixelSize(
  imagePixelSize.width,
  imagePixelSize.height
);

if (!imagePixelCheck.ok) {
  await admin.storage.from("artworks").remove([storagePath]);

  return NextResponse.json(
    { error: imagePixelCheck.error },
    { status: 400 }
  );
}

  const limitCheck = await checkUploadLimits({
    admin,
    userId,
    plan,
    fileSizeBytes,
  });

  if (!limitCheck.ok) {
    await admin.storage.from("artworks").remove([storagePath]);

    return NextResponse.json(
      {
        error: limitCheck.error,
        details: limitCheck.details,
        current: limitCheck.uploadCheck?.current,
        limit: limitCheck.uploadCheck?.limit,
        upgradeTo: limitCheck.uploadCheck?.upgradeTo,
      },
      { status: limitCheck.status }
    );
  }

  const { data: publicUrlData } = admin.storage
    .from("artworks")
    .getPublicUrl(storagePath);

  const imageUrl = publicUrlData.publicUrl;

  const { data: artwork, error: insertError } = await admin
    .from("artworks")
    .insert({
      owner_id: userId,
      title: fields.title,
      artist_name: fields.artistName,
      year: fields.year,
      technique: fields.technique,
      dimensions: fields.dimensions,
      width_cm: fields.widthCm,
      height_cm: fields.heightCm,
      depth_cm: fields.depthCm,
      description: fields.description,
      image_url: imageUrl,
      thumbnail_url: imageUrl,
      webgl_url: imageUrl,
      optimized_url: imageUrl,
      storage_path: storagePath,
      file_size_bytes: fileSizeBytes,
      price: fields.price,
      currency: fields.currency,
      is_for_sale: fields.isForSale,
      is_public: fields.isPublic,
    })
    .select(
      "id, title, artist_name, year, dimensions, width_cm, height_cm, depth_cm, image_url, file_size_bytes, created_at"
    )
    .single();

  if (insertError || !artwork) {
    await admin.storage.from("artworks").remove([storagePath]);

    return NextResponse.json(
      {
        error: "Errore salvataggio opera.",
        details: insertError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    artwork,
    usage: {
      plan,
      artworksCurrent: limitCheck.usage.currentArtworkCount + 1,
      artworksLimit: limitCheck.limits.maxArtworksTotal,
      storageUsedMb: bytesToMb(
        limitCheck.usage.currentStorageUsedBytes + fileSizeBytes
      ),
      storageLimitMb: limitCheck.limits.maxStorageMb,
      fileSizeMb: bytesToMb(fileSizeBytes),
      fileLimitMb: limitCheck.limits.maxArtworkFileMb,
    },
  });
}

async function handleLegacyFormUpload({
  request,
  admin,
  userId,
  plan,
}: {
  request: Request;
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  plan: ReturnType<typeof normalizePlanName>;
}) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Form non valido." },
      { status: 400 }
    );
  }

  const fields = parseArtworkFields(formData);
  const fileValue = formData.get("image_file");

  if (!fields.title) {
    return NextResponse.json(
      { error: "Il titolo dell opera e obbligatorio." },
      { status: 400 }
    );
  }

  if (!(fileValue instanceof File)) {
    return NextResponse.json(
      { error: "Devi caricare un file immagine." },
      { status: 400 }
    );
  }

  if (fileValue.size <= 0) {
    return NextResponse.json(
      { error: "Il file immagine e vuoto." },
      { status: 400 }
    );
  }

  if (!isAllowedImageFile(fileValue)) {
    return NextResponse.json(
      { error: "Formato immagine non supportato. Usa JPG, PNG o WEBP." },
      { status: 400 }
    );
  }

  const limitCheck = await checkUploadLimits({
    admin,
    userId,
    plan,
    fileSizeBytes: fileValue.size,
  });

  if (!limitCheck.ok) {
    return NextResponse.json(
      {
        error: limitCheck.error,
        details: limitCheck.details,
        current: limitCheck.uploadCheck?.current,
        limit: limitCheck.uploadCheck?.limit,
        upgradeTo: limitCheck.uploadCheck?.upgradeTo,
      },
      { status: limitCheck.status }
    );
  }

  const extension = getFileExtension(fileValue.name);
  const safeFileName = `${crypto.randomUUID()}.${extension}`;
  const storagePath = `${userId}/${safeFileName}`;

  const arrayBuffer = await fileValue.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await admin.storage
    .from("artworks")
    .upload(storagePath, fileBuffer, {
      contentType: fileValue.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        error: "Errore upload immagine.",
        details: uploadError.message,
      },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = admin.storage
    .from("artworks")
    .getPublicUrl(storagePath);

  const imageUrl = publicUrlData.publicUrl;

  const { data: artwork, error: insertError } = await admin
    .from("artworks")
    .insert({
      owner_id: userId,
      title: fields.title,
      artist_name: fields.artistName,
      year: fields.year,
      technique: fields.technique,
      dimensions: fields.dimensions,
      width_cm: fields.widthCm,
      height_cm: fields.heightCm,
      depth_cm: fields.depthCm,
      description: fields.description,
      image_url: imageUrl,
      thumbnail_url: imageUrl,
      webgl_url: imageUrl,
      optimized_url: imageUrl,
      storage_path: storagePath,
      file_size_bytes: fileValue.size,
      price: fields.price,
      currency: fields.currency,
      is_for_sale: fields.isForSale,
      is_public: fields.isPublic,
    })
    .select(
      "id, title, artist_name, year, dimensions, width_cm, height_cm, depth_cm, image_url, file_size_bytes, created_at"
    )
    .single();

  if (insertError || !artwork) {
    await admin.storage.from("artworks").remove([storagePath]);

    return NextResponse.json(
      {
        error: "Errore salvataggio opera.",
        details: insertError?.message || null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    artwork,
    usage: {
      plan,
      artworksCurrent: limitCheck.usage.currentArtworkCount + 1,
      artworksLimit: limitCheck.limits.maxArtworksTotal,
      storageUsedMb: bytesToMb(
        limitCheck.usage.currentStorageUsedBytes + fileValue.size
      ),
      storageLimitMb: limitCheck.limits.maxStorageMb,
      fileSizeMb: bytesToMb(fileValue.size),
      fileLimitMb: limitCheck.limits.maxArtworkFileMb,
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, plan")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    return NextResponse.json(
      {
        error: "Profilo non trovato.",
        details: profileError?.message || null,
      },
      { status: 404 }
    );
  }

  const canManage = profile.role === "gallerist" || profile.role === "admin";

  if (!canManage) {
    return NextResponse.json(
      { error: "Solo i galleristi possono caricare opere." },
      { status: 403 }
    );
  }

  const plan = normalizePlanName(profile.plan);
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    let body: JsonArtworkPayload;

    try {
      body = (await request.json()) as JsonArtworkPayload;
    } catch {
      return NextResponse.json(
        { error: "Body JSON non valido." },
        { status: 400 }
      );
    }

    const action = cleanText(body.action);

    if (action === "prepare-upload") {
      return handlePrepareUpload({
        body,
        admin,
        userId: user.id,
        plan,
      });
    }

    if (action === "create-artwork") {
      return handleCreateArtworkFromUploadedFile({
        body,
        admin,
        userId: user.id,
        plan,
      });
    }

    return NextResponse.json(
      { error: "Azione upload non valida." },
      { status: 400 }
    );
  }

  return handleLegacyFormUpload({
    request,
    admin,
    userId: user.id,
    plan,
  });
}
