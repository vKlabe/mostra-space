import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { getEntrySnapshot } from "@/lib/premio/server";
import { isUuid } from "@/lib/premio/config";
import type { Entry } from "@/lib/premio/types";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const current = await requireAdminApi();
  if (!current.ok) return new Response(null, { status: current.status });
  const id = new URL(request.url).searchParams.get("entryId");
  if (!isUuid(id)) return new Response(null, { status: 404 });
  const { data, error } = await current.admin.from("premio_entries").select("*").eq("id", id).maybeSingle();
  if (error || !data) return new Response(null, { status: 404 });
  const snapshot = await getEntrySnapshot(data as Entry);
  if (!snapshot) return new Response(null, { status: 404 });
  return new Response(JSON.stringify({ artist: data.artist_name, statement: data.statement, accepted_rules_version: data.accepted_rules_version, ...snapshot }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="premio-${id}-v${snapshot.version}.json"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
