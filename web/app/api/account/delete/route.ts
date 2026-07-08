import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deleteUserAccount } from "@/lib/account/deleteAccount";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DeleteAccountPayload = {
  currentPassword?: unknown;
  confirmation?: unknown;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        success: false,
        error: "Utente non autenticato.",
      },
      { status: 401 }
    );
  }

  if (!user.email) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Non riesco a verificare la password perché l'account non ha una email associata.",
      },
      { status: 400 }
    );
  }

  let body: DeleteAccountPayload;

  try {
    body = (await request.json()) as DeleteAccountPayload;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Payload non valido.",
      },
      { status: 400 }
    );
  }

  const currentPassword = cleanText(body.currentPassword);
  const confirmation = cleanText(body.confirmation);

  if (!currentPassword) {
    return NextResponse.json(
      {
        success: false,
        error: "Inserisci la password attuale per cancellare l'account.",
      },
      { status: 400 }
    );
  }

  if (confirmation !== "CANCELLA") {
    return NextResponse.json(
      {
        success: false,
        error: "Per confermare devi scrivere CANCELLA.",
      },
      { status: 400 }
    );
  }

  const { error: passwordError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (passwordError) {
    return NextResponse.json(
      {
        success: false,
        error: "Password non corretta. Account non cancellato.",
      },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  try {
    const result = await deleteUserAccount({
      admin,
      userId: user.id,
      deleteAuthUser: true,
    });

    return NextResponse.json({
      success: true,
      deletedUserId: user.id,
      cleanup: {
        galleries: result.galleryIds.length,
        artworks: result.artworkIds.length,
        events: result.eventIds.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Errore eliminazione account.",
        details: error instanceof Error ? error.message : null,
      },
      { status: 500 }
    );
  }
}
