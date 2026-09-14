import type { AwardKey, EntryStatus } from "./config";
export type SnapshotArtwork = {
  id: string; title: string; artist_name: string | null; description: string | null;
  year: string | null; technique: string | null; dimensions: string | null;
  image_url: string; layout: Record<string, unknown>;
};
export type GallerySnapshot = {
  gallery: { id: string; owner_id: string; title: string; slug: string; description: string | null; cover_image_url: string | null; template_id: string | null };
  artworks: SnapshotArtwork[];
};
export type Entry = {
  id: string; edition_id: string; artist_id: string; gallery_id: string | null; slug: string;
  artist_name: string; statement: string; status: EntryStatus; version: number;
  submitted_at: string | null; accepted_rules_version: string | null;
  public_note: string; social_count: number | null; social_snapshot_at: string | null;
  created_at: string; updated_at: string;
};
export type EntryCard = Entry & {
  gallery_title: string; gallery_slug: string; cover_image_url: string | null;
  profile_slug: string | null; avatar_url: string | null;
  follower_count: number; is_following: boolean;
};
export type Award = {
  id: string; edition_id: string; entry_id: string; category: AwardKey; motivation: string;
  created_at: string; plan: "pro" | "business"; months: number;
};
export type PrizeGrant = {
  id: string; award_id: string; artist_id: string; plan: "pro" | "business"; months: number;
  status: "available" | "active" | "expired" | "delivered";
  starts_at: string | null; ends_at: string | null; delivery_note: string;
};
