export const PREMIO_YEAR = 2026;
export const PREMIO_PATH = "/premiomostraspace";
export const PREMIO_DASHBOARD = "/dashboard/premiomostraspace";
export const PREMIO_BUCKET = "premio-archives";
export const AWARD_KEYS = ["mostraspace", "critica", "social"] as const;
export type AwardKey = (typeof AWARD_KEYS)[number];
export type EntryStatus = "draft" | "submitted" | "admitted" | "excluded" | "withdrawn";
export type Edition = {
  id: string; year: number; title: string; published: boolean; paused: boolean;
  applications_open_at: string; applications_close_at: string;
  social_campaign_at: string; social_close_at: string; ceremony_at: string;
  rules_text: string; rules_version: string; rules_approved: boolean;
  organizer: string; jury_text: string; event_url: string; results_published_at: string | null;
  created_at: string; updated_at: string;
};
export const DEFAULT_EDITION: Edition = {
  id: "", year: PREMIO_YEAR, title: "Premio Mostra.Space 2026", published: false, paused: false,
  applications_open_at: "2026-10-06T16:00:00Z",
  applications_close_at: "2026-11-15T23:00:00Z",
  social_campaign_at: "2026-11-19T08:00:00Z",
  social_close_at: "2026-11-29T23:00:00Z", ceremony_at: "2026-12-03T18:00:00Z",
  rules_text: "", rules_version: "2026-v1", rules_approved: false,
  organizer: "Barattolo XR Lab", jury_text: "", event_url: "",
  results_published_at: null, created_at: "", updated_at: "",
};
export function premioPhase(edition: Edition, now = Date.now()) {
  if (!edition.published) return "preparation";
  if (edition.paused) return "paused";
  if (edition.results_published_at && now >= Date.parse(edition.ceremony_at)) return "results";
  if (now < Date.parse(edition.applications_open_at)) return "upcoming";
  if (now < Date.parse(edition.applications_close_at)) return "applications";
  if (now < Date.parse(edition.social_campaign_at)) return "review";
  if (now < Date.parse(edition.social_close_at)) return "social";
  return "judging";
}
export function entryPath(year: number, slug: string) {
  return `${PREMIO_PATH}/${year}/${encodeURIComponent(slug)}`;
}
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function textValue(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
export function safeWebUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; }
  catch { return ""; }
}
export function awardPlan(key: AwardKey) {
  return { plan: key === "mostraspace" ? "business" : "pro", months: key === "social" ? 6 : 12 };
}
