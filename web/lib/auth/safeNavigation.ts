const NAVIGATION_ORIGIN = "https://mostra.space";

const BLOCKED_PAGE_PREFIXES = [
  "/api",
  "/_next",
  "/sw.js",
  "/manifest.webmanifest",
] as const;

function normalizedInternalPath(value: string | null | undefined) {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    const parsed = new URL(value, NAVIGATION_ORIGIN);

    if (parsed.origin !== NAVIGATION_ORIGIN) {
      return null;
    }

    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (
      BLOCKED_PAGE_PREFIXES.some(
        (prefix) =>
          parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`)
      )
    ) {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}

export function getSafePostAuthPath(
  value: string | null | undefined,
  fallback = "/dashboard"
) {
  const path = normalizedInternalPath(value);

  if (!path) {
    return fallback;
  }

  const pathname = new URL(path, NAVIGATION_ORIGIN).pathname;

  if (pathname === "/auth" || pathname.startsWith("/auth/")) {
    return fallback;
  }

  return path;
}

export function getSafePwaDestination(
  value: string | null | undefined,
  fallback = "/account/notifiche"
) {
  const path = normalizedInternalPath(value);

  if (!path) {
    return fallback;
  }

  const pathname = new URL(path, NAVIGATION_ORIGIN).pathname;

  if (
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname === "/pwa/open" ||
    pathname.startsWith("/pwa/open/")
  ) {
    return fallback;
  }

  return path;
}
