export type ArtworkImageUrls = {
  image_url?: string | null;
  thumbnail_url?: string | null;
  card_url?: string | null;
  optimized_url?: string | null;
  webgl_url?: string | null;
};

function firstValidUrl(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return "";
}

export function getArtworkThumbnailUrl(artwork: ArtworkImageUrls) {
  return firstValidUrl(
    artwork.thumbnail_url,
    artwork.card_url,
    artwork.optimized_url,
    artwork.image_url
  );
}

export function getArtworkCardUrl(artwork: ArtworkImageUrls) {
  return firstValidUrl(
    artwork.card_url,
    artwork.optimized_url,
    artwork.thumbnail_url,
    artwork.image_url
  );
}

export function getArtworkDetailUrl(artwork: ArtworkImageUrls) {
  return firstValidUrl(
    artwork.optimized_url,
    artwork.card_url,
    artwork.thumbnail_url,
    artwork.image_url
  );
}

/**
 * Unity must receive only the viewer asset.
 * Never fall back to web-only thumbnail, card or detail variants.
 */
export function getArtworkViewerUrl(artwork: ArtworkImageUrls) {
  return firstValidUrl(artwork.webgl_url, artwork.image_url);
}
