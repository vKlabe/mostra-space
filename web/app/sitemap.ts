import type { MetadataRoute } from "next";
import { legalPages } from "@/lib/legal/legal-pages";
import { absoluteUrl, resolvePublicUrl } from "@/lib/seo/site";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SitemapGallery = {
  slug: string;
  cover_image_url: string | null;
  updated_at: string;
};

type SitemapProfile = {
  profile_slug: string | null;
  avatar_url: string | null;
  updated_at: string;
};

function createStaticEntries(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    {
      url: absoluteUrl("/gallerie"),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/eventi"),
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/profili"),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/marketplace"),
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/pricing"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/launch"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/legal"),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/privacy"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...legalPages.map((page) => ({
      url: absoluteUrl(`/legal/${page.slug}`),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = createStaticEntries();

  try {
    const admin = createAdminClient();
    const [galleriesResult, profilesResult] = await Promise.all([
      admin
        .from("galleries")
        .select("slug, cover_image_url, updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false }),
      admin
        .from("profiles")
        .select("profile_slug, avatar_url, updated_at")
        .eq("public_profile_enabled", true)
        .not("profile_slug", "is", null)
        .order("updated_at", { ascending: false }),
    ]);

    const galleries = (galleriesResult.data || []) as SitemapGallery[];
    const profiles = (profilesResult.data || []) as SitemapProfile[];

    const galleryEntries: MetadataRoute.Sitemap = galleries
      .filter((gallery) => gallery.slug.trim().length > 0)
      .map((gallery) => {
        const coverImageUrl = resolvePublicUrl(gallery.cover_image_url);

        return {
          url: absoluteUrl(`/gallerie/${encodeURIComponent(gallery.slug)}`),
          lastModified: gallery.updated_at,
          changeFrequency: "weekly" as const,
          priority: 0.8,
          images: coverImageUrl ? [coverImageUrl] : undefined,
        };
      });

    const profileEntries: MetadataRoute.Sitemap = profiles
      .filter(
        (profile): profile is SitemapProfile & { profile_slug: string } =>
          Boolean(profile.profile_slug?.trim())
      )
      .map((profile) => {
        const avatarUrl = resolvePublicUrl(profile.avatar_url);

        return {
          url: absoluteUrl(
            `/profili/${encodeURIComponent(profile.profile_slug)}`
          ),
          lastModified: profile.updated_at,
          changeFrequency: "weekly" as const,
          priority: 0.7,
          images: avatarUrl ? [avatarUrl] : undefined,
        };
      });

    return [...staticEntries, ...galleryEntries, ...profileEntries];
  } catch {
    return staticEntries;
  }
}
