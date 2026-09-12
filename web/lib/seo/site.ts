import type { Metadata } from "next";

export const SITE_NAME = "Mostra.Space";
export const SITE_URL = "https://mostra.space";
export const DEFAULT_SOCIAL_IMAGE = "/home/hero-gallery.jpg";

export const DEFAULT_SITE_DESCRIPTION =
  "La piattaforma espositiva digitale per artisti, curatori, gallerie, collezionisti e amanti dell’arte.";

type PublicMetadataOptions = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  imageAlt?: string;
  absoluteTitle?: boolean;
};

export const NO_INDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export function absoluteUrl(value = "/") {
  return resolvePublicUrl(value) || SITE_URL;
}

export function resolvePublicUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, `${SITE_URL}/`);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function createSeoDescription(
  value: string | null | undefined,
  fallback: string,
  maxLength = 158
) {
  const normalizedValue = value?.replace(/\s+/g, " ").trim();
  const normalized = normalizedValue || fallback.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const shortened = normalized.slice(0, maxLength - 1);
  const lastSpace = shortened.lastIndexOf(" ");
  const safeCut =
    lastSpace >= Math.floor(maxLength * 0.65) ? lastSpace : shortened.length;

  return `${shortened.slice(0, safeCut).trimEnd()}…`;
}

export function createPublicMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  absoluteTitle = false,
}: PublicMetadataOptions): Metadata {
  const canonicalUrl = absoluteUrl(path);
  const socialImage =
    resolvePublicUrl(image) || absoluteUrl(DEFAULT_SOCIAL_IMAGE);
  const alt = imageAlt || title;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "it_IT",
      siteName: SITE_NAME,
      title,
      description,
      url: canonicalUrl,
      images: [
        {
          url: socialImage,
          alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}
