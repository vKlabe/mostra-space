import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AVATAR_BUCKET = "profile-avatars";
const MAX_AVATAR_EDGE = 512;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_OUTPUT_TYPES = new Set(["image/webp", "image/jpeg"]);

function readUint24LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function getWebpDimensions(bytes: Uint8Array) {
  if (bytes.length < 30) {
    return null;
  }

  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));

  if (riff !== "RIFF" || webp !== "WEBP") {
    return null;
  }

  const chunk = String.fromCharCode(...bytes.slice(12, 16));

  if (chunk === "VP8X") {
    return {
      width: 1 + readUint24LE(bytes, 24),
      height: 1 + readUint24LE(bytes, 27),
    };
  }

  if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f) {
      return null;
    }

    const b1 = bytes[21];
    const b2 = bytes[22];
    const b3 = bytes[23];
    const b4 = bytes[24];

    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
    };
  }

  if (chunk === "VP8 ") {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
      return null;
    }

    return {
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff,
    };
  }

  return null;
}

function getJpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;

  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (offset + 1 >= bytes.length) {
      break;
    }

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null;
    }

    const isSofMarker =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;

    if (isSofMarker) {
      if (offset + 7 >= bytes.length) {
        return null;
      }

      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }

    offset += segmentLength;
  }

  return null;
}

function getImageDimensions(bytes: Uint8Array, contentType: string) {
  if (contentType === "image/webp") {
    return getWebpDimensions(bytes);
  }

  if (contentType === "image/jpeg") {
    return getJpegDimensions(bytes);
  }

  return null;
}

function getExtension(contentType: string) {
  return contentType === "image/jpeg" ? "jpg" : "webp";
}

async function removeStoredAvatars(
  userId: string,
  keepPath: string | null = null
) {
  const admin = createAdminClient();
  const { data: files } = await admin.storage
    .from(AVATAR_BUCKET)
    .list(userId, { limit: 100 });

  const paths = (files || [])
    .map((file) => `${userId}/${file.name}`)
    .filter((path) => path !== keepPath);

  if (paths.length > 0) {
    await admin.storage.from(AVATAR_BUCKET).remove(paths);
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { success: false, errorCode: "NOT_AUTHENTICATED" },
      { status: 401 }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, errorCode: "INVALID_PAYLOAD" },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, errorCode: "FILE_REQUIRED" },
      { status: 400 }
    );
  }

  if (!ALLOWED_OUTPUT_TYPES.has(file.type)) {
    return NextResponse.json(
      { success: false, errorCode: "INVALID_FILE_TYPE" },
      { status: 400 }
    );
  }

  if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { success: false, errorCode: "FILE_TOO_LARGE" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dimensions = getImageDimensions(buffer, file.type);

  if (
    !dimensions ||
    dimensions.width <= 0 ||
    dimensions.height <= 0 ||
    dimensions.width > MAX_AVATAR_EDGE ||
    dimensions.height > MAX_AVATAR_EDGE
  ) {
    return NextResponse.json(
      { success: false, errorCode: "INVALID_DIMENSIONS" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const extension = getExtension(file.type);
  const storagePath = `${user.id}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      {
        success: false,
        errorCode: "STORAGE_UPLOAD_FAILED",
        details: uploadError.message,
      },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = admin.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(storagePath);

  const avatarUrl = publicUrlData.publicUrl;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      avatar_url: avatarUrl,
      avatar_customized: true,
    })
    .eq("id", user.id);

  if (profileError) {
    await admin.storage.from(AVATAR_BUCKET).remove([storagePath]);

    return NextResponse.json(
      {
        success: false,
        errorCode: "PROFILE_UPDATE_FAILED",
        details: profileError.message,
      },
      { status: 500 }
    );
  }

  await removeStoredAvatars(user.id, storagePath);

  return NextResponse.json({
    success: true,
    avatarUrl,
    width: dimensions.width,
    height: dimensions.height,
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { success: false, errorCode: "NOT_AUTHENTICATED" },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      avatar_url: null,
      avatar_customized: true,
    })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json(
      {
        success: false,
        errorCode: "PROFILE_UPDATE_FAILED",
        details: profileError.message,
      },
      { status: 500 }
    );
  }

  await removeStoredAvatars(user.id);

  return NextResponse.json({ success: true, avatarUrl: null });
}
