"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import T from "@/components/i18n/T";
import { createClient } from "@/lib/supabase/client";
import { setAppBadgeCount } from "@/lib/pwa/appBadge.client";
import { deactivateCurrentDevicePush } from "@/lib/pwa/pushLifecycle.client";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    const supabase = createClient();

    // Only this browser endpoint is removed. Other registered devices keep
    // receiving notifications for the same account. Cleanup is best-effort so
    // a browser API failure can never trap the user in the signed-in session.
    await deactivateCurrentDevicePush().catch(() => undefined);
    await supabase.auth.signOut();
    await setAppBadgeCount(0);

    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <T
          textKey="account.logout.actions.loggingOut"
          fallback="Uscita..."
        />
      ) : (
        <T
          textKey="account.logout.actions.logout"
          fallback="Logout"
        />
      )}
    </button>
  );
}
