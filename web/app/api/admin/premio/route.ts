import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { assertNoError, premioBody, premioError, premioJson } from "@/lib/premio/api";
import { getPremioEdition } from "@/lib/premio/server";
import { isUuid, safeWebUrl, textValue, type Edition } from "@/lib/premio/config";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await premioBody(request);
    const current = await requireAdminApi();
    if (!current.ok) throw new Error(current.status === 401 ? "PREMIO_UNAUTHORIZED" : "PREMIO_ADMIN_REQUIRED");
    const admin = current.admin;
    const edition = await getPremioEdition();
    if (!edition) throw new Error("PREMIO_DATA_UNAVAILABLE");
    const action = textValue(body.action, 40);
    if (action === "settings") {
      const changes: Partial<Edition> = {
        title: textValue(body.title, 150), organizer: textValue(body.organizer, 300), jury_text: textValue(body.juryText, 5000),
        rules_text: textValue(body.rulesText, 50000), rules_version: textValue(body.rulesVersion, 80),
        event_url: safeWebUrl(body.eventUrl), published: body.published === true,
        paused: body.paused === true, rules_approved: body.rulesApproved === true,
      };
      const dates = ["applications_open_at", "applications_close_at", "social_campaign_at", "social_close_at", "ceremony_at"] as const;
      for (const key of dates) {
        if (typeof body[key] !== "string" || !Number.isFinite(Date.parse(body[key]))) throw new Error("PREMIO_INVALID_DATES");
        changes[key] = new Date(body[key]).toISOString();
      }
      if (!changes.title || !changes.organizer || !changes.rules_version) throw new Error("PREMIO_INVALID_DETAILS");
      const result = await admin.from("premio_editions").update(changes).eq("id", edition.id);
      assertNoError(result.error);
    } else if (action === "finalize") {
      if (!isUuid(body.mainId) || !isUuid(body.criticId)) throw new Error("PREMIO_INVALID_WINNER");
      const result = await admin.rpc("premio_finalize", { p_actor: current.user.id, p_edition: edition.id,
        p_main: body.mainId, p_critic: body.criticId, p_main_reason: textValue(body.mainReason, 5000),
        p_critic_reason: textValue(body.criticReason, 5000), p_social_reason: textValue(body.socialReason, 5000) });
      assertNoError(result.error);
    } else if (action === "publishResults") {
      const result = await admin.from("premio_editions").update({ results_published_at: new Date().toISOString() }).eq("id", edition.id);
      assertNoError(result.error);
    } else if (action === "maintenance") {
      const result = await admin.rpc("premio_maintenance"); assertNoError(result.error);
      return premioJson({ success: true, summary: result.data });
    } else if (["moderate", "review", "excludeFollower", "restoreFollower", "deliver"].includes(action)) {
      const result = await admin.rpc("premio_admin_update", { p_actor: current.user.id, p_edition: edition.id, p_action: action, p_body: body });
      assertNoError(result.error);
    } else throw new Error("PREMIO_INVALID_REQUEST");
    const audit = await admin.from("premio_audit_log").insert({ edition_id: edition.id, actor_id: current.user.id,
      action, details: { entry_id: isUuid(body.entryId) ? body.entryId : undefined } });
    assertNoError(audit.error);
    return premioJson({ success: true });
  } catch (error) { return premioError(error); }
}
