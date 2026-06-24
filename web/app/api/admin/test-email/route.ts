import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendTransactionalEmail } from "@/lib/email/send-transactional-email";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  email: string | null;
  role: string | null;
  display_name: string | null;
  full_name: string | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, role, display_name, full_name")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    );
  }

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    to?: string;
  };

  const to = body.to || profile.email;

  if (!to) {
    return NextResponse.json(
      { error: "Nessuna email destinatario disponibile." },
      { status: 400 }
    );
  }

  const displayName =
    profile.display_name || profile.full_name || profile.email || "Admin";

  const result = await sendTransactionalEmail({
    to,
    subject: "Test email Mostra.space",
    templateKey: "admin_test_email",
    userId: profile.id,
    idempotencyKey: `admin-test-${profile.id}-${Date.now()}`,
    metadata: {
      source: "admin_test_email_route",
    },
    html: `
      <div style="font-family: Arial, sans-serif; background:#0a0a0a; color:#f5f5f5; padding:32px;">
        <div style="max-width:560px; margin:0 auto; background:#141414; border:1px solid #2a2a2a; border-radius:20px; padding:28px;">
          <p style="font-size:12px; letter-spacing:0.18em; text-transform:uppercase; color:#999; margin:0 0 16px;">
            Mostra.space
          </p>
          <h1 style="font-size:26px; line-height:1.2; margin:0 0 16px;">
            Email transazionale attiva
          </h1>
          <p style="font-size:15px; line-height:1.7; color:#d4d4d4; margin:0 0 18px;">
            Ciao ${displayName}, questa è una email di test inviata dalla piattaforma Mostra.space tramite Resend.
          </p>
          <p style="font-size:14px; line-height:1.7; color:#a3a3a3; margin:0;">
            Se stai leggendo questo messaggio, il dominio email e l’invio automatico funzionano correttamente.
          </p>
        </div>
      </div>
    `,
    text: `Ciao ${displayName}, questa è una email di test inviata dalla piattaforma Mostra.space tramite Resend.`,
  });

  return NextResponse.json({
    ok: true,
    result,
  });
}