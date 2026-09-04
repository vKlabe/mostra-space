import sharp, { type Metadata } from "sharp";
import type { createAdminClient } from "@/lib/supabase/admin";

const ARTWORKS_BUCKET = "artworks";

export const ARTWORK_IMAGE_PIPELINE_VERSION = 1;
export const ARTWORK_IMAGE_CACHE_CONTROL = "31536000";

type AdminClient = ReturnType<typeof createAdminClient>;

type ArtworkImageVariantName = "thumbnail" | "card" | "detail";

type ArtworkImageVariantDefinition = {
  name: ArtworkImageVariantName;
  maxLongSidePx: number;
  quality: number;
};

const VARIANT_DEFINITIONS: ArtworkImageVariantDefinition[] = [
  {
    name: "thumbnail",
    maxLongSidePx: 480,
    quality: 84,
  },
  {
    name: "card",
    maxLongSidePx: 960,
    quality: 86,
  },
  {
    name: "detail",
    maxLongSidePx: 1600,
    quality: 88,
  },
];

export type InspectedArtworkImage = {
  width: number;
  height: number;
  format: "jpeg" | "png" | "webp";
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
};

function normalizeArtworkFormat(
  format: string | undefined
): Pick<InspectedArtworkImage, "format" | "contentType"> | null {
  if (format === "jpeg") {
    return {
      format: "jpeg" as const,
      contentType: "image/jpeg" as const,
    };
  }

  if (format === "png") {
    return {
      format: "png" as const,
      contentType: "image/png" as const,
    };
  }

  if (format === "webp") {
    return {
      format: "webp" as const,
      contentType: "image/webp" as const,
    };
  }

  return null;
}

export type ArtworkVariantPaths = {
  thumbnail: string;
  card: string;
  detail: string;
};

export type GeneratedArtworkVariants = {
  paths: ArtworkVariantPaths;
  thumbnailUrl: string;
  cardUrl: string;
  detailUrl: string;
  generatedAt: string;
};

export class ArtworkImageProcessingError extends Error {
  public readonly publicMessage: string;

  constructor(publicMessage: string, details?: string) {
    super(details || publicMessage);
    this.name = "ArtworkImageProcessingError";
    this.publicMessage = publicMessage;
  }
}

export function getArtworkVariantPaths(
  storagePath: string
): ArtworkVariantPaths {
  const lastSlashIndex = storagePath.lastIndexOf("/");
  const lastDotIndex = storagePath.lastIndexOf(".");
  const hasExtension = lastDotIndex > lastSlashIndex;
  const basePath = hasExtension
    ? storagePath.slice(0, lastDotIndex)
    : storagePath;

  return {
    thumbnail: `${basePath}.thumbnail.webp`,
    card: `${basePath}.card.webp`,
    detail: `${basePath}.detail.webp`,
  };
}

function isRotatedOrientation(orientation: number | undefined) {
  return orientation !== undefined && orientation >= 5 && orientation <= 8;
}

export async function inspectArtworkImage(
  sourceBuffer: Buffer,
  declaredContentType?: string
): Promise<InspectedArtworkImage> {
  if (sourceBuffer.length <= 0) {
    throw new ArtworkImageProcessingError("Il file immagine e vuoto.");
  }

  let metadata: Metadata;

  try {
    metadata = await sharp(sourceBuffer, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    }).metadata();
  } catch (error) {
    throw new ArtworkImageProcessingError(
      "Il file caricato non e un'immagine valida o risulta danneggiato.",
      error instanceof Error ? error.message : undefined
    );
  }

  const normalizedFormat = normalizeArtworkFormat(metadata.format);

  if (!normalizedFormat) {
    throw new ArtworkImageProcessingError(
      "Formato immagine non supportato. Usa JPG, PNG o WEBP."
    );
  }

  if (metadata.pages && metadata.pages > 1) {
    throw new ArtworkImageProcessingError(
      "Le immagini animate non sono supportate. Usa un'immagine statica JPG, PNG o WEBP."
    );
  }

  if (
    declaredContentType &&
    declaredContentType !== normalizedFormat.contentType
  ) {
    throw new ArtworkImageProcessingError(
      "Il formato reale dell'immagine non corrisponde al tipo di file dichiarato."
    );
  }

  const rawWidth = metadata.width || 0;
  const rawHeight = metadata.height || 0;

  if (rawWidth <= 0 || rawHeight <= 0) {
    throw new ArtworkImageProcessingError(
      "Non e stato possibile leggere le dimensioni dell'immagine."
    );
  }

  const shouldSwapDimensions = isRotatedOrientation(metadata.orientation);

  return {
    width: shouldSwapDimensions ? rawHeight : rawWidth,
    height: shouldSwapDimensions ? rawWidth : rawHeight,
    format: normalizedFormat.format,
    contentType: normalizedFormat.contentType,
    sizeBytes: sourceBuffer.length,
  };
}

async function createVariantBuffer(
  sourceBuffer: Buffer,
  definition: ArtworkImageVariantDefinition
) {
  return sharp(sourceBuffer, {
    failOn: "error",
    limitInputPixels: 40_000_000,
  })
    .rotate()
    .resize({
      width: definition.maxLongSidePx,
      height: definition.maxLongSidePx,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: definition.quality,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer();
}

function getPublicArtworkUrl(admin: AdminClient, storagePath: string) {
  const { data } = admin.storage
    .from(ARTWORKS_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

export async function removeArtworkStorageFiles(
  admin: AdminClient,
  storagePaths: Array<string | null | undefined>
) {
  const uniquePaths = Array.from(
    new Set(storagePaths.filter((path): path is string => Boolean(path)))
  );

  if (uniquePaths.length === 0) {
    return;
  }

  await admin.storage.from(ARTWORKS_BUCKET).remove(uniquePaths);
}

export async function downloadArtworkSource(
  admin: AdminClient,
  storagePath: string
) {
  const { data, error } = await admin.storage
    .from(ARTWORKS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new ArtworkImageProcessingError(
      "Non e stato possibile recuperare l'immagine appena caricata.",
      error?.message
    );
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function generateAndUploadArtworkVariants({
  admin,
  storagePath,
  sourceBuffer,
}: {
  admin: AdminClient;
  storagePath: string;
  sourceBuffer: Buffer;
}): Promise<GeneratedArtworkVariants> {
  const paths = getArtworkVariantPaths(storagePath);

  let generatedBuffers: Record<ArtworkImageVariantName, Buffer>;

  try {
    const buffers = await Promise.all(
      VARIANT_DEFINITIONS.map((definition) =>
        createVariantBuffer(sourceBuffer, definition)
      )
    );

    generatedBuffers = {
      thumbnail: buffers[0],
      card: buffers[1],
      detail: buffers[2],
    };
  } catch (error) {
    throw new ArtworkImageProcessingError(
      "Non e stato possibile ottimizzare l'immagine.",
      error instanceof Error ? error.message : undefined
    );
  }

  const uploads = await Promise.all(
    VARIANT_DEFINITIONS.map(async (definition) => {
      const path = paths[definition.name];
      const { error } = await admin.storage
        .from(ARTWORKS_BUCKET)
        .upload(path, generatedBuffers[definition.name], {
          contentType: "image/webp",
          cacheControl: ARTWORK_IMAGE_CACHE_CONTROL,
          upsert: false,
        });

      return {
        name: definition.name,
        path,
        error,
      };
    })
  );

  const failedUpload = uploads.find((upload) => upload.error);

  if (failedUpload) {
    await removeArtworkStorageFiles(admin, Object.values(paths));

    throw new ArtworkImageProcessingError(
      "Non e stato possibile salvare le versioni ottimizzate dell'immagine.",
      failedUpload.error?.message
    );
  }

  return {
    paths,
    thumbnailUrl: getPublicArtworkUrl(admin, paths.thumbnail),
    cardUrl: getPublicArtworkUrl(admin, paths.card),
    detailUrl: getPublicArtworkUrl(admin, paths.detail),
    generatedAt: new Date().toISOString(),
  };
}
