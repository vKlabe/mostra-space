import { createAdminClient } from "@/lib/supabase/admin";
import { getEntrySnapshot, getPremioSession } from "@/lib/premio/server";
import { isUuid, PREMIO_BUCKET } from "@/lib/premio/config";
import { premioError } from "@/lib/premio/api";
import type { Entry } from "@/lib/premio/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ entryId: string; version: string; index: string }> }) {
  try {
    const { entryId, version, index } = await context.params;
    if (!isUuid(entryId) || !/^\d+$/.test(version) || !/^\d+$/.test(index)) return new Response(null, { status: 404 });
    const admin = createAdminClient();
    const { data: entry, error } = await admin.from("premio_entries").select("*").eq("id", entryId).maybeSingle();
    if (error || !entry) return new Response(null, { status: 404 });
    const [d, g, p] = await Promise.all([
      admin.from("premio_editions").select("published").eq("id", entry.edition_id).maybeSingle(),
      admin.from("galleries").select("status").eq("id", entry.gallery_id).maybeSingle(),
      admin.from("profiles").select("public_profile_enabled,role").eq("id", entry.artist_id).maybeSingle(),
    ]);
    const isPublic = d.data?.published && entry.status === "admitted" && g.data?.status === "published"
      && p.data?.public_profile_enabled && p.data?.role !== "admin" && Number(version) === entry.version;
    if (!isPublic) {
      const session = await getPremioSession();
      if (session.user?.id !== entry.artist_id && session.profile?.role !== "admin") return new Response(null, { status: 404 });
    }
    const snapshot = await getEntrySnapshot(entry as Entry, Number(version));
    const path = snapshot?.assets[Number(index)];
    if (!path || !path.startsWith(`${entry.id}/`)) return new Response(null, { status: 404 });
    const file = await admin.storage.from(PREMIO_BUCKET).download(path);
    if (file.error || !file.data) return new Response(null, { status: 404 });
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.data.type)) return new Response(null, { status: 415 });
    return new Response(file.data, { headers: { "Content-Type": file.data.type || "image/jpeg", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=60" } });
  } catch (error) { return premioError(error); }
}
