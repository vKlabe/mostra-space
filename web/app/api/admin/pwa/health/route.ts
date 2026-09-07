import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/requireAdminApi";
import { getPwaReadiness } from "@/lib/pwa/pwaReadiness.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  const current = await requireAdminApi();

  if (!current.ok || !current.admin) {
    return NextResponse.json(
      {
        success: false,
        code: current.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      },
      { status: current.status, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const report = await getPwaReadiness(current.admin);
    return NextResponse.json(
      { success: true, report },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Unable to generate PWA readiness report", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { success: false, code: "READINESS_FAILED" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
