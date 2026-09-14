import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_EDITION, PREMIO_YEAR, type Edition } from "./config";
import type { Award, Entry, EntryCard, GallerySnapshot, PrizeGrant } from "./types";

export const getPremioEdition = cache(async (year = PREMIO_YEAR): Promise<Edition | null> => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("premio_editions").select("*").eq("year", year).maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new Error("PREMIO_DATA_UNAVAILABLE");
  }
  return data as Edition | null;
});
export async function getPremioSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile, error } = await createAdminClient().from("profiles")
    .select("id,role,plan,display_name,full_name,public_profile_enabled,profile_slug,avatar_url")
    .eq("id", user.id).maybeSingle();
  if (error) throw new Error("PREMIO_DATA_UNAVAILABLE");
  return { user, profile };
}
export async function getOwnEntry(editionId: string, artistId: string) {
  const { data, error } = await createAdminClient().from("premio_entries").select("*")
    .eq("edition_id", editionId).eq("artist_id", artistId).maybeSingle();
  if (error) throw new Error("PREMIO_DATA_UNAVAILABLE");
  return data as Entry | null;
}
type JoinedEntry = Entry & {
  gallery: { title: string; slug: string; cover_image_url: string | null };
  artist: { profile_slug: string | null; avatar_url: string | null };
};
const PUBLIC_ENTRY_SELECT = "*,gallery:galleries!inner(title,slug,cover_image_url,status),artist:profiles!inner(profile_slug,avatar_url,public_profile_enabled,role)";
export async function getPublicEntries(edition: Edition, viewerId: string | null, page = 1, search = "", slug?: string) {
  if (!edition.published) return { entries: [] as EntryCard[], count: 0 };
  const admin = createAdminClient();
  let query = admin.from("premio_entries").select(PUBLIC_ENTRY_SELECT, { count: "exact" })
    .eq("edition_id", edition.id).eq("status", "admitted")
    .eq("gallery.status", "published").eq("artist.public_profile_enabled", true).neq("artist.role", "admin");
  if (slug) query = query.eq("slug", slug);
  if (search.trim()) query = query.ilike("artist_name", `%${search.replace(/[%_\\]/g, "").trim().slice(0, 80)}%`);
  // Stable, non-ranking order: every page remains reachable and counts do not dictate exposure.
  const { data, count, error } = await query.order("artist_name").order("id").range((page - 1) * 24, page * 24 - 1);
  if (error) throw new Error("PREMIO_DATA_UNAVAILABLE");
  const rows = (data || []) as unknown as JoinedEntry[];
  if (!rows.length) return { entries: [], count: count || 0 };
  const [totals, follows] = await Promise.all([
    admin.rpc("premio_counts", { p_edition: edition.id }).in("entry_id", rows.map(r => r.id)),
    viewerId ? admin.from("account_follows").select("following_id").eq("follower_id", viewerId)
      .in("following_id", rows.map(r => r.artist_id)) : Promise.resolve({ data: [], error: null }),
  ]);
  if (totals.error || follows.error) throw new Error("PREMIO_DATA_UNAVAILABLE");
  const counts = new Map<string, number>((totals.data || []).map((r: { entry_id: string; total: number }) => [r.entry_id, r.total]));
  const followed = new Set((follows.data || []).map(r => r.following_id));
  const entries: EntryCard[] = rows.map(row => {
    const { gallery, artist, ...entry } = row;
    return { ...entry, gallery_title: gallery.title, gallery_slug: gallery.slug,
      cover_image_url: gallery.cover_image_url, profile_slug: artist.profile_slug, avatar_url: artist.avatar_url,
      follower_count: entry.social_count ?? counts.get(entry.id) ?? 0, is_following: followed.has(entry.artist_id) };
  });
  return { entries, count: count || 0 };
}
export async function getEntrySnapshot(entry: Entry, version = entry.version) {
  const { data, error } = await createAdminClient().from("premio_snapshots")
    .select("id,version,manifest,assets,created_at,digest").eq("entry_id", entry.id).eq("version", version).maybeSingle();
  if (error) throw new Error("PREMIO_DATA_UNAVAILABLE");
  return data as { id: string; version: number; manifest: GallerySnapshot; assets: string[]; created_at: string; digest: string } | null;
}
export async function getPublicAwards(edition: Edition) {
  if (!edition.published || !edition.results_published_at || Date.now() < Date.parse(edition.ceremony_at)) return [];
  const { data, error } = await createAdminClient().from("premio_awards").select("*").eq("edition_id", edition.id);
  if (error) throw new Error("PREMIO_DATA_UNAVAILABLE");
  return (data || []) as Award[];
}
export async function getOwnGrants(artistId: string, edition: Edition) {
  if (!edition.results_published_at || Date.now() < Date.parse(edition.ceremony_at)) return [];
  const { data, error } = await createAdminClient().from("premio_grants")
    .select("*,award:premio_awards!inner(edition_id)").eq("artist_id", artistId).eq("award.edition_id", edition.id);
  if (error) throw new Error("PREMIO_DATA_UNAVAILABLE");
  return (data || []) as PrizeGrant[];
}
export async function getVisiblePremio(year = PREMIO_YEAR) {
  const [edition, session] = await Promise.all([getPremioEdition(year), getPremioSession()]);
  const visible = edition && (edition.published || session.profile?.role === "admin");
  return { edition: visible ? edition : { ...DEFAULT_EDITION, year }, configured: Boolean(visible), now: Date.now(), ...session,
    preview: Boolean(edition && !edition.published && session.profile?.role === "admin") };
}

// Central access check shared by the candidate, archive and metadata routes.
export async function getAccessibleEntry(year: number, slug: string) {
  if (!Number.isInteger(year) || year < 2026 || year > 2200 || slug.length > 180) return null;
  const { edition, user, profile } = await getVisiblePremio(year);
  if (!edition.id) return null;
  const publicRows = await getPublicEntries(edition, user?.id || null, 1, "", slug);
  if (publicRows.entries[0]) return { edition, entry: publicRows.entries[0], user, isPublic: true };
  if (!user) return null;
  let query = createAdminClient().from("premio_entries").select("*").eq("edition_id", edition.id).eq("slug", slug);
  if (profile?.role !== "admin") query = query.eq("artist_id", user.id);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("PREMIO_DATA_UNAVAILABLE");
  return data ? { edition, entry: data as Entry, user, isPublic: false } : null;
}
