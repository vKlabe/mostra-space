export type GalleryPublishValidationIssue = {
  code: string;
  label: string;
  message: string;
  severity: "error" | "warning";
};

export type GalleryPublishValidationResult = {
  canPublish: boolean;
  errors: GalleryPublishValidationIssue[];
  warnings: GalleryPublishValidationIssue[];
  summary: {
    totalArtworks: number;
    positionedArtworks: number;
    unpositionedArtworks: number;
    artworksWithoutDimensions: number;
    artworksWithoutImage: number;
  };
};

type GalleryForPublish = {
  id: string;
  title: string | null;
  cover_image_url: string | null;
};

type ArtworkForPublish = {
  id: string;
  title: string | null;
  image_url: string | null;
  thumbnail_url?: string | null;
  width_cm?: number | string | null;
  height_cm?: number | string | null;
};

type GalleryArtworkForPublish = {
  id: string;
  gallery_id: string;
  artwork_id: string;
  wall_key: string | null;
  display_width_cm?: number | string | null;
  display_height_cm?: number | string | null;
  frame_width_cm?: number | string | null;
  frame_depth_cm?: number | string | null;
  artworks: ArtworkForPublish | ArtworkForPublish[] | null;
};

function normalizeArtworkRelation(
  value: ArtworkForPublish | ArtworkForPublish[] | null
) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function hasPositiveNumber(value: number | string | null | undefined) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0;
}

function hasNonNegativeNumber(value: number | string | null | undefined) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0;
}

export function validateGalleryForPublish({
  gallery,
  galleryArtworks,
}: {
  gallery: GalleryForPublish | null;
  galleryArtworks: GalleryArtworkForPublish[];
}): GalleryPublishValidationResult {
  const errors: GalleryPublishValidationIssue[] = [];
  const warnings: GalleryPublishValidationIssue[] = [];

  if (!gallery) {
    errors.push({
      code: "gallery_missing",
      label: "Galleria mancante",
      message: "La galleria non è stata trovata.",
      severity: "error",
    });

    return {
      canPublish: false,
      errors,
      warnings,
      summary: {
        totalArtworks: 0,
        positionedArtworks: 0,
        unpositionedArtworks: 0,
        artworksWithoutDimensions: 0,
        artworksWithoutImage: 0,
      },
    };
  }

  if (!gallery.title || gallery.title.trim().length <= 0) {
    errors.push({
      code: "title_missing",
      label: "Titolo mancante",
      message: "Inserisci un titolo prima di pubblicare la galleria.",
      severity: "error",
    });
  }

  if (!gallery.cover_image_url || gallery.cover_image_url.trim().length <= 0) {
    errors.push({
      code: "cover_missing",
      label: "Cover mancante",
      message: "Aggiungi una cover alla galleria prima della pubblicazione.",
      severity: "error",
    });
  }

  const totalArtworks = galleryArtworks.length;
  let positionedArtworks = 0;
  let unpositionedArtworks = 0;
  let artworksWithoutDimensions = 0;
  let artworksWithoutImage = 0;
  let invalidFrameValues = 0;

  if (totalArtworks <= 0) {
    errors.push({
      code: "no_artworks",
      label: "Nessuna opera associata",
      message: "Associa almeno un’opera alla galleria prima di pubblicarla.",
      severity: "error",
    });
  }

  for (const item of galleryArtworks) {
    const artwork = normalizeArtworkRelation(item.artworks);

    const hasWall = Boolean(item.wall_key && item.wall_key.trim().length > 0);

    if (hasWall) {
      positionedArtworks += 1;
    } else {
      unpositionedArtworks += 1;
    }

    if (!artwork?.image_url || artwork.image_url.trim().length <= 0) {
      artworksWithoutImage += 1;
    }

    const hasDisplayDimensions =
      hasPositiveNumber(item.display_width_cm) &&
      hasPositiveNumber(item.display_height_cm);

    const hasArtworkDimensions =
      hasPositiveNumber(artwork?.width_cm) &&
      hasPositiveNumber(artwork?.height_cm);

    if (!hasDisplayDimensions && !hasArtworkDimensions) {
      artworksWithoutDimensions += 1;
    }

    if (
      item.frame_width_cm !== null &&
      item.frame_width_cm !== undefined &&
      !hasNonNegativeNumber(item.frame_width_cm)
    ) {
      invalidFrameValues += 1;
    }

    if (
      item.frame_depth_cm !== null &&
      item.frame_depth_cm !== undefined &&
      !hasNonNegativeNumber(item.frame_depth_cm)
    ) {
      invalidFrameValues += 1;
    }
  }

  if (totalArtworks > 0 && positionedArtworks <= 0) {
    errors.push({
      code: "no_positioned_artworks",
      label: "Nessuna opera posizionata",
      message:
        "Posiziona almeno un’opera su una parete nell’editor prima di pubblicare la galleria.",
      severity: "error",
    });
  }

  if (artworksWithoutImage > 0) {
    errors.push({
      code: "artworks_without_image",
      label: "Opere senza immagine",
      message:
        artworksWithoutImage === 1
          ? "C’è 1 opera senza immagine. Correggila prima di pubblicare."
          : `Ci sono ${artworksWithoutImage} opere senza immagine. Correggile prima di pubblicare.`,
      severity: "error",
    });
  }

  if (unpositionedArtworks > 0) {
    warnings.push({
      code: "unpositioned_artworks",
      label: "Opere non posizionate",
      message:
        unpositionedArtworks === 1
          ? "C’è 1 opera associata ma non posizionata. Non sarà visibile al visitatore."
          : `Ci sono ${unpositionedArtworks} opere associate ma non posizionate. Non saranno visibili al visitatore.`,
      severity: "warning",
    });
  }

  if (artworksWithoutDimensions > 0) {
    warnings.push({
      code: "fallback_dimensions",
      label: "Dimensioni mancanti",
      message:
        artworksWithoutDimensions === 1
          ? "C’è 1 opera senza dimensioni reali/espositive. Nel viewer useremo il fallback 50 x 50 cm."
          : `Ci sono ${artworksWithoutDimensions} opere senza dimensioni reali/espositive. Nel viewer useremo il fallback 50 x 50 cm.`,
      severity: "warning",
    });
  }

  if (invalidFrameValues > 0) {
    warnings.push({
      code: "invalid_frame_values",
      label: "Valori cornice da controllare",
      message:
        "Alcuni valori di cornice non sono validi. Il viewer proverà a normalizzarli, ma conviene controllarli nell’editor.",
      severity: "warning",
    });
  }

  return {
    canPublish: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalArtworks,
      positionedArtworks,
      unpositionedArtworks,
      artworksWithoutDimensions,
      artworksWithoutImage,
    },
  };
}