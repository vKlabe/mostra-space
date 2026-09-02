import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Payload = {
  password?: unknown;
};

export async function POST(request: Request) {
  let body: Payload;

  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";

  if (password.length < 6) {
    return NextResponse.json(
      { error: "La password deve avere almeno 6 caratteri." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, has_local_password")
    .eq("id", user.id)
    .maybeSingle<{ id: string; has_local_password: boolean | null }>();

  if (profileError) {
    return NextResponse.json(
      {
        error: "Non riesco a leggere lo stato dell’account.",
        details: profileError.message,
      },
      { status: 500 }
    );
  }

  // Se l'account risulta già completato, non proviamo a reimpostare la password.
  // Questo evita anche l'errore Supabase sul riutilizzo della stessa password.
  if (profile?.has_local_password === true) {
    return NextResponse.json({
      success: true,
      alreadyConfigured: true,
      hasLocalPassword: true,
    });
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password });

  if (passwordError) {
    return NextResponse.json(
      {
        error: passwordError.message || "Non riesco a impostare la password.",
      },
      { status: 400 }
    );
  }

  const { error: updateProfileError } = await admin
    .from("profiles")
    .update({
      has_local_password: true,
    })
    .eq("id", user.id);

  if (updateProfileError) {
    return NextResponse.json(
      {
        error:
          "La password è stata impostata, ma non riesco a salvare lo stato dell’account.",
        details: updateProfileError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    alreadyConfigured: false,
    hasLocalPassword: true,
  });
}
