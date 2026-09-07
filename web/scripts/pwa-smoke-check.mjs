import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const root = process.cwd();
const baseUrl = process.argv[2] ? new URL(process.argv[2]) : null;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function verifyIcon(relativePath, width, height) {
  const metadata = await sharp(path.join(root, relativePath)).metadata();

  assert(
    metadata.width === width && metadata.height === height,
    `${relativePath} must be ${width}x${height}px`
  );
}

async function verifyStaticContract() {
  const [worker, manifestSource, registration, safeNavigation] =
    await Promise.all([
      read("public/sw.js"),
      read("app/manifest.ts"),
      read("components/pwa/ServiceWorkerRegistration.tsx"),
      read("lib/auth/safeNavigation.ts"),
    ]);

  assert(worker.includes('PWA_WORKER_VERSION = "pwa-9"'), "PWA 9 worker version missing");
  assert(worker.includes('new URL("/pwa/open"'), "Safe notification gateway missing");
  assert(worker.includes("notificationId"), "Notification read synchronization missing");
  assert(
    !/addEventListener\s*\(\s*["']fetch["']/.test(worker),
    "The service worker must not intercept fetch requests"
  );
  assert(!/\bcaches\s*\./.test(worker), "The service worker must not cache application data");
  assert(manifestSource.includes('display: "standalone"'), "Standalone manifest mode missing");
  assert(manifestSource.includes('start_url: "/"'), "Manifest start URL missing");
  assert(registration.includes('updateViaCache: "none"'), "Service worker update policy missing");
  assert(registration.includes("reconcileCurrentPushLifecycle"), "Permission reconciliation missing");
  assert(safeNavigation.includes("parsed.origin !== NAVIGATION_ORIGIN"), "Same-origin navigation guard missing");

  await Promise.all([
    verifyIcon("public/pwa/icon-192x192.png", 192, 192),
    verifyIcon("public/pwa/icon-512x512.png", 512, 512),
    verifyIcon("public/pwa/icon-maskable-512x512.png", 512, 512),
    verifyIcon("public/pwa/apple-touch-icon.png", 180, 180),
  ]);
}

async function request(relativePath, options) {
  const response = await fetch(new URL(relativePath, baseUrl), {
    redirect: "manual",
    ...options,
  });

  return response;
}

async function verifyLiveContract() {
  if (!baseUrl) {
    return;
  }

  const manifestResponse = await request("/manifest.webmanifest");
  assert(manifestResponse.status === 200, "Manifest is not publicly reachable");
  const manifest = await manifestResponse.json();
  assert(manifest.display === "standalone", "Live manifest is not standalone");
  assert(manifest.start_url === "/", "Live manifest start URL is invalid");
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 3, "Live manifest icons are incomplete");

  const workerResponse = await request("/sw.js");
  assert(workerResponse.status === 200, "Service worker is not publicly reachable");
  const worker = await workerResponse.text();
  assert(worker.includes('PWA_WORKER_VERSION = "pwa-9"'), "Production is not serving the PWA 9 worker");
  assert(!/addEventListener\s*\(\s*["']fetch["']/.test(worker), "Live worker intercepts fetch requests");

  for (const icon of [
    "/pwa/icon-192x192.png",
    "/pwa/icon-512x512.png",
    "/pwa/icon-maskable-512x512.png",
    "/pwa/apple-touch-icon.png",
  ]) {
    const iconResponse = await request(icon);
    assert(iconResponse.status === 200, `${icon} is not publicly reachable`);
    assert((await iconResponse.arrayBuffer()).byteLength > 0, `${icon} is empty`);
  }

  const keyResponse = await request("/api/pwa/push-public-key");
  assert(keyResponse.status === 200, "Public VAPID key route failed");
  const keyPayload = await keyResponse.json();
  assert(keyPayload.success === true && keyPayload.publicKey, "Public VAPID key is not configured");

  const dispatchResponse = await request("/api/internal/pwa/push-dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert(dispatchResponse.status === 401, "Push dispatcher is not protected");

  const badgeResponse = await request("/api/account/pwa-badge");
  assert(badgeResponse.status === 401, "Badge endpoint must reject anonymous requests");

  const gatewayResponse = await request(
    "/pwa/open?next=https%3A%2F%2Fexample.com%2Foutside"
  );
  assert(
    gatewayResponse.status >= 300 && gatewayResponse.status < 400,
    "Anonymous PWA gateway did not redirect to authentication"
  );
  const location = gatewayResponse.headers.get("location");
  assert(location, "PWA gateway redirect location is missing");
  const redirect = new URL(location, baseUrl);
  assert(redirect.origin === baseUrl.origin, "PWA gateway allowed an external redirect");
  assert(redirect.pathname === "/auth/login", "PWA gateway did not preserve authentication");
}

try {
  await verifyStaticContract();
  await verifyLiveContract();
  console.log(
    baseUrl
      ? `PWA 9 checks passed for ${baseUrl.origin}`
      : "PWA 9 static checks passed"
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
