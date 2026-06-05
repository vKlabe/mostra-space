import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const checks = {
    app: "ok",
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    resendApiKey: Boolean(process.env.RESEND_API_KEY),
  };

  try {
    const admin = createAdminClient();

    const { error } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        {
          status: "error",
          checks,
          supabase: {
            connected: false,
            error: error.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      checks,
      supabase: {
        connected: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        checks,
        message:
          error instanceof Error ? error.message : "Errore sconosciuto.",
      },
      { status: 500 }
    );
  }
}