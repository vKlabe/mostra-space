import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function isValidPublicKey(value: string) {
  try {
    const decoded = Buffer.from(value, "base64url");

    return decoded.length === 65 && decoded[0] === 0x04;
  } catch {
    return false;
  }
}

export async function GET() {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();

  if (!publicKey || !isValidPublicKey(publicKey)) {
    return NextResponse.json(
      { success: false, code: "PUSH_NOT_CONFIGURED" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    { success: true, publicKey },
    { headers: NO_STORE_HEADERS }
  );
}
