import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Applica il middleware a tutte le route tranne:
     * - file statici Next.js
     * - immagini ottimizzate
     * - favicon
     * - manifest PWA
     * - immagini e asset pubblici
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
