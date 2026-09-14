import { createAdminClient } from "@/lib/supabase/admin";
import { getPremioEdition, getPremioSession } from "@/lib/premio/server";
import { isUuid, premioPhase, textValue } from "@/lib/premio/config";
import { assertNoError, premioBody, premioError, premioJson } from "@/lib/premio/api";
import { archivePremioImages, removePremioImages } from "@/lib/premio/archive.server";
import type { Entry, GallerySnapshot } from "@/lib/premio/types";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  let archived: string[] = [];
  try {
    const body = await premioBody(request);
    const { user, profile } = await getPremioSession();
    if (!user || !profile) throw new Error("PREMIO_UNAUTHORIZED");
    const admin = createAdminClient();
    if (body.action === "claim") {
      if (!isUuid(body.grantId)) throw new Error("PREMIO_INVALID_REQUEST");
      const result = await admin.rpc("premio_claim", { p_artist: user.id, p_grant: body.grantId });
      assertNoError(result.error); return premioJson({ success: true });
    }
    const edition = await getPremioEdition();
    if (!edition) throw new Error("PREMIO_DATA_UNAVAILABLE");
    if (body.action === "withdraw") {
      const result = await admin.rpc("premio_withdraw", { p_artist: user.id, p_edition: edition.id });
      assertNoError(result.error); return premioJson({ success: true });
    }
    if (premioPhase(edition) !== "applications") throw new Error("PREMIO_APPLICATIONS_CLOSED");
    if (!["enroll", "submit"].includes(String(body.action))) throw new Error("PREMIO_INVALID_REQUEST");
    const enrolled = await admin.rpc("premio_enroll", { p_artist: user.id, p_edition: edition.id });
    assertNoError(enrolled.error);
    const entry = enrolled.data as Entry;
    if (body.action === "enroll") return premioJson({ success: true, entry });
    if (!isUuid(body.galleryId) || body.declarations !== true || body.rulesVersion !== edition.rules_version) throw new Error("PREMIO_RULES_REQUIRED");
    if (profile.role !== "gallerist" || !profile.public_profile_enabled) throw new Error("PREMIO_PUBLIC_CREATOR_REQUIRED");
    if (entry.status === "excluded") throw new Error("PREMIO_ENTRY_EXCLUDED");
    const name = textValue(body.artistName, 120); const statement = textValue(body.statement, 3000);
    if (name.length < 2 || statement.length < 20) throw new Error("PREMIO_INVALID_DETAILS");
    const reserved = await admin.rpc("premio_reserve_archive", { p_artist: user.id, p_entry: entry.id });
    assertNoError(reserved.error);
    const prepared = await admin.rpc("premio_prepare_snapshot", { p_artist: user.id, p_gallery: body.galleryId });
    assertNoError(prepared.error);
    const { manifest, digest } = prepared.data as { manifest: GallerySnapshot; digest: string };
    if (manifest.artworks.length > 500) throw new Error("PREMIO_ARCHIVE_TOO_LARGE");
    archived = await archivePremioImages(entry.id, manifest);
    const submitted = await admin.rpc("premio_submit", { p_artist: user.id, p_entry: entry.id, p_gallery: body.galleryId,
      p_artist_name: name, p_statement: statement, p_rules_version: edition.rules_version, p_digest: digest,
      p_assets: archived, p_declarations: true });
    assertNoError(submitted.error);
    archived = [];
    return premioJson({ success: true, entry: submitted.data });
  } catch (error) {
    if (archived.length) await removePremioImages(archived);
    return premioError(error);
  }
}
