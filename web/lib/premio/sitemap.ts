import "server-only";
import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPremioEdition } from "./server";
import { PREMIO_PATH, entryPath } from "./config";
import { absoluteUrl } from "@/lib/seo/site";
export async function premioSitemap(): Promise<MetadataRoute.Sitemap> {
  const edition = await getPremioEdition();
  if (!edition?.published) return [];
  const pages = [PREMIO_PATH, `${PREMIO_PATH}/regolamento`, `${PREMIO_PATH}/evento`];
  if (edition.results_published_at && Date.now() >= Date.parse(edition.ceremony_at)) pages.push(`${PREMIO_PATH}/vincitori`);
  const rows: MetadataRoute.Sitemap = pages.map(p => ({ url: absoluteUrl(p), lastModified: edition.updated_at, changeFrequency: "weekly" }));
  const admin = createAdminClient();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from("premio_entries").select("slug,updated_at,gallery:galleries!inner(status),artist:profiles!inner(public_profile_enabled,role)")
      .eq("edition_id", edition.id).eq("status", "admitted").eq("gallery.status", "published").eq("artist.public_profile_enabled", true).neq("artist.role", "admin")
      .order("id").range(offset, offset + 999);
    if (error) throw new Error("PREMIO_DATA_UNAVAILABLE");
    for (const entry of data || []) rows.push({ url: absoluteUrl(entryPath(edition.year, entry.slug)), lastModified: entry.updated_at, changeFrequency: "weekly" });
    if (!data || data.length < 1000) break;
  }
  return rows;
}
