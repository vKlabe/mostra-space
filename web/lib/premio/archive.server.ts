import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { PREMIO_BUCKET } from "./config";
import type { GallerySnapshot } from "./types";

function sourceObject(value: string) {
  const url = new URL(value);
  const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin;
  if (url.origin !== origin || !url.pathname.startsWith("/storage/v1/object/public/")) throw new Error("PREMIO_ARCHIVE_SOURCE");
  const [bucket, ...parts] = url.pathname.slice("/storage/v1/object/public/".length).split("/").map(decodeURIComponent);
  if (!bucket || !parts.length || parts.some(p => !p || p === "." || p === ".." || p.includes("\\"))) throw new Error("PREMIO_ARCHIVE_SOURCE");
  return { bucket, path: parts.join("/") };
}
export async function archivePremioImages(entryId: string, manifest: GallerySnapshot) {
  const admin = createAdminClient();
  const folder = `${entryId}/${randomUUID()}`;
  const paths = manifest.artworks.map((_, i) => `${folder}/${i}`);
  const copied: string[] = [];
  const publicBuckets = new Map<string, Promise<boolean>>();
  try {
    for (let start = 0; start < manifest.artworks.length; start += 6) {
      const results = await Promise.allSettled(manifest.artworks.slice(start, start + 6).map(async (artwork, offset) => {
        const source = sourceObject(artwork.image_url);
        if (!publicBuckets.has(source.bucket)) {
          publicBuckets.set(source.bucket, admin.storage.getBucket(source.bucket).then(r => !r.error && r.data.public === true));
        }
        if (!(await publicBuckets.get(source.bucket))) throw new Error("PREMIO_ARCHIVE_SOURCE");
        const path = paths[start + offset];
        const { error } = await admin.storage.from(source.bucket).copy(source.path, path, { destinationBucket: PREMIO_BUCKET });
        if (error) throw new Error("PREMIO_ARCHIVE_FAILED");
        copied.push(path);
      }));
      if (results.some(r => r.status === "rejected")) throw new Error("PREMIO_ARCHIVE_FAILED");
    }
    return paths;
  } catch (error) {
    if (copied.length) await admin.storage.from(PREMIO_BUCKET).remove(copied);
    throw error;
  }
}
export async function removePremioImages(paths: string[]) {
  if (paths.length) await createAdminClient().storage.from(PREMIO_BUCKET).remove(paths);
}
