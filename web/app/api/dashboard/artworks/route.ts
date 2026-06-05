import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  bytesToMb,
  canUploadArtwork,
  getPlanLimits,
  normalizePlanName,
} from "@/lib/plans";

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

function cleanBoolean(value: FormDataEntryValue | null) {
  return value === "true" || value === "on" || value === "1";
}

function cleanPrice(value: FormDataEntryValue | null) {
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

function isAllowedImageType(file: File) {
  return (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
  );
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

  const canManage =
    profile.role === "gallerist" || profile.role === "admin";

  if (!canManage) {
    return NextResponse.json(
      { error: "Solo i galleristi possono caricare opere." },
      { status: 403 }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Form non valido." },
      { status: 400 }
    );
  }

  const title = cleanText(formData.get("title"));
  const artistName = cleanNullableText(formData.get("artist_name"));
  const year = cleanNullableText(formData.get("year"));
  const technique = cleanNullableText(formData.get("technique"));
  const dimensions = cleanNullableText(formData.get("dimensions"));
  const description = cleanNullableText(formData.get("description"));
  const price = cleanPrice(formData.get("price"));
  const currency = cleanText(formData.get("currency")) || "EUR";
  const isForSale = cleanBoolean(formData.get("is_for_sale"));
  const isPublic = cleanBoolean(formData.get("is_public"));
  const fileValue = formData.get("image_file");

  if (!title) {
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

  if (!isAllowedImageType(fileValue)) {
    return NextResponse.json(
      {
        error: "Formato immagine non supportato. Usa JPG, PNG o WEBP.",
      },
      { status: 400 }
    );
  }

  const plan = normalizePlanName(profile.plan);
  const limits = getPlanLimits(plan);

  const { data: existingArtworks, error: artworksError } = await admin
    .from("artworks")
    .select("id, file_size_bytes")
    .eq("owner_id", user.id);

  if (artworksError) {
    return NextResponse.json(
      {
        error: "Errore controllo opere esistenti.",
        details: artworksError.message,
      },
      { status: 500 }
    );
  }

  const safeExistingArtworks = (existingArtworks || []) as ExistingArtwork[];

  const currentArtworkCount = safeExistingArtworks.length;

  const currentStorageUsedBytes = safeExistingArtworks.reduce(
    (total, artwork) => total + (artwork.file_size_bytes || 0),
    0
  );

  const uploadCheck = canUploadArtwork({
    profilePlan: plan,
    currentArtworkCount,
    currentStorageUsedMb: bytesToMb(currentStorageUsedBytes),
    newFileSizeMb: bytesToMb(fileValue.size),
  });

  if (!uploadCheck.allowed) {
    return NextResponse.json(
      {
        error:
          uploadCheck.reason ||
          `Hai raggiunto un limite del piano ${limits.label}.`,
        current: uploadCheck.current,
        limit: uploadCheck.limit,
        upgradeTo: uploadCheck.upgradeTo,
      },
      { status: 403 }
    );
  }

  const extension = getFileExtension(fileValue.name);
  const safeFileName = `${crypto.randomUUID()}.${extension}`;
  const storagePath = `${user.id}/${safeFileName}`;

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
      owner_id: user.id,
      title,
      artist_name: artistName,
      year,
      technique,
      dimensions,
      description,
      image_url: imageUrl,
      thumbnail_url: imageUrl,
      webgl_url: imageUrl,
      optimized_url: imageUrl,
      storage_path: storagePath,
      file_size_bytes: fileValue.size,
      price,
      currency,
      is_for_sale: isForSale,
      is_public: isPublic,
    })
    .select(
      "id, title, artist_name, year, image_url, file_size_bytes, created_at"
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
      artworksCurrent: currentArtworkCount + 1,
      artworksLimit: limits.maxArtworksTotal,
      storageUsedMb: bytesToMb(currentStorageUsedBytes + fileValue.size),
      storageLimitMb: limits.maxStorageMb,
      fileSizeMb: bytesToMb(fileValue.size),
      fileLimitMb: limits.maxArtworkFileMb,
    },
  });
}