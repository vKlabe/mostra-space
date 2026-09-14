import "server-only";
import { NextResponse } from "next/server";
export function premioJson(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}
export function premioError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = message.match(/PREMIO_[A-Z_]+/)?.[0] || "PREMIO_REQUEST_FAILED";
  return premioJson({ success: false, code }, code === "PREMIO_UNAUTHORIZED" ? 401 : code === "PREMIO_ADMIN_REQUIRED" ? 403 : code === "PREMIO_DATA_UNAVAILABLE" ? 503 : 400);
}
export async function premioBody(request: Request): Promise<Record<string, unknown>> {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new Error("PREMIO_INVALID_ORIGIN");
  if (origin) {
    // Next can normalize the internal URL (including 127.0.0.1 to localhost).
    // Compare the browser origin with the external host/protocol preserved by the proxy.
    const url = new URL(request.url);
    const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host).split(",")[0].trim();
    const protocol = (request.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1)).split(",")[0].trim();
    let source: URL;
    try { source = new URL(origin); } catch { throw new Error("PREMIO_INVALID_ORIGIN"); }
    if (!["http:", "https:"].includes(source.protocol) || source.host !== host || source.protocol !== `${protocol}:`) throw new Error("PREMIO_INVALID_ORIGIN");
  }
  if (!request.headers.get("content-type")?.includes("application/json")) throw new Error("PREMIO_INVALID_REQUEST");
  const body = await request.text();
  if (body.length > 80000) throw new Error("PREMIO_INVALID_REQUEST");
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("PREMIO_INVALID_REQUEST");
  return parsed as Record<string, unknown>;
}
export function assertNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
