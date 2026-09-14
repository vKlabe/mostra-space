import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { getPremioEdition } from "@/lib/premio/server";
import { premioError } from "@/lib/premio/api";
export const dynamic = "force-dynamic";
// Prevent spreadsheet formula injection from artist names, notes and gallery titles.
function cell(value: unknown) { const s = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value); return `"${(/^[\s]*[=+@-]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`; }
export async function GET(request: Request) {
  try {
    const current = await requireAdminApi();
    if (!current.ok) return new Response(null, { status: current.status });
    const edition = await getPremioEdition(); if (!edition) return new Response(null, { status: 404 });
    const kind = new URL(request.url).searchParams.get("kind") === "followers" ? "followers" : "entries";
    const admin = current.admin;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({ async start(controller) {
      try {
        controller.enqueue(encoder.encode("\uFEFF")); let offset = 0; let header = false;
        // Database RPC scopes follow history to participating artists, never the entire social graph.
        while (true) {
          const result = kind === "entries" ? await admin.from("premio_entries").select("id,artist_id,artist_name,slug,status,gallery_id,statement,version,submitted_at,social_count,accepted_rules_version,public_note").eq("edition_id", edition.id).order("id").range(offset, offset + 499)
            : await admin.rpc("premio_export_follows", { p_edition: edition.id }).order("id").range(offset, offset + 499);
          if (result.error) throw new Error("PREMIO_DATA_UNAVAILABLE");
          const rows = (result.data || []) as Record<string, unknown>[];
          if (!header && rows[0]) { controller.enqueue(encoder.encode(Object.keys(rows[0]).map(cell).join(",") + "\r\n")); header = true; }
          for (const row of rows) controller.enqueue(encoder.encode(Object.values(row).map(cell).join(",") + "\r\n"));
          if (rows.length < 500) break; offset += 500;
        }
        controller.close();
      } catch (error) { controller.error(error); }
    } });
    return new Response(stream, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="premio-${edition.year}-${kind}.csv"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return premioError(error); }
}
