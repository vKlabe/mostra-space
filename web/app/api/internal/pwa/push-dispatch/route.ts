import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  dispatchDuePushNotifications,
  PushDeliveryConfigurationError,
} from "@/lib/pwa/pushDelivery.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function authorized(request: Request, secret: string) {
  const authorization = request.headers.get("authorization") || "";
  const candidate = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const expectedHash = createHash("sha256").update(secret).digest();
  const candidateHash = createHash("sha256").update(candidate).digest();
  return Boolean(candidate) && timingSafeEqual(expectedHash, candidateHash);
}

export async function POST(request: Request) {
  const secret = process.env.PWA_PUSH_DISPATCH_SECRET?.trim();

  if (!secret || secret.length < 32) {
    return json({ success: false, code: "PUSH_DELIVERY_NOT_CONFIGURED" }, 503);
  }

  if (!authorized(request, secret)) {
    return json({ success: false, code: "UNAUTHORIZED" }, 401);
  }

  try {
    const summary = await dispatchDuePushNotifications();
    return json({ success: true, ...summary });
  } catch (error) {
    if (error instanceof PushDeliveryConfigurationError) {
      return json({ success: false, code: "PUSH_DELIVERY_NOT_CONFIGURED" }, 503);
    }

    console.error("PWA push dispatch failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ success: false, code: "PUSH_DELIVERY_FAILED" }, 500);
  }
}
