"use client";

export const APP_BADGE_SYNC_EVENT = "mostraspace:badge-sync";

type BadgeNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export async function setAppBadgeCount(value: number) {
  if (typeof navigator === "undefined") {
    return;
  }

  const badgeNavigator = navigator as BadgeNavigator;
  const count = Math.max(0, Math.min(999, Math.floor(Number(value) || 0)));

  try {
    if (count === 0 && badgeNavigator.clearAppBadge) {
      await badgeNavigator.clearAppBadge();
      return;
    }

    if (count > 0 && badgeNavigator.setAppBadge) {
      await badgeNavigator.setAppBadge(count);
    }
  } catch {
    // Badging is an optional progressive enhancement. A platform rejection
    // must never affect navigation or the notification center.
  }
}

export function requestAppBadgeSync() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(APP_BADGE_SYNC_EVENT));
  }
}
