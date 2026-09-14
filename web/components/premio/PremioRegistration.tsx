"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GoogleOAuthButton from "@/components/auth/GoogleOAuthButton";
import { usePremioText } from "./PremioUi";
import { getSafePostAuthPath } from "@/lib/auth/safeNavigation";
export default function PremioRegistration({ next, support }: { next: string; support: boolean }) {
  const t = usePremioText(); const router = useRouter(); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [sent, setSent] = useState(false); const [accepted, setAccepted] = useState(false);
  const destination = getSafePostAuthPath(next);
  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    try {
      if (!accepted || name.length < 2) throw new Error(t("requiredFields"));
      const client = createClient(); const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", destination);
      const { data, error: signupError } = await client.auth.signUp({
        email: String(form.get("email") || "").trim(), password: String(form.get("password") || ""),
        options: { emailRedirectTo: callback.href, data: { full_name: name, display_name: name, account_type: "visitor",
          terms_accepted: "true", terms_version: "terms-2026-06-v1", acquisition_source: "premio-2026", premio_intent: support ? "support" : "artist" } },
      });
      if (signupError) throw signupError;
      if (data.session) {
        const sync = await fetch("/api/auth/sync-profile", { method: "POST" });
        if (!sync.ok) throw new Error(t("genericError"));
        router.replace(destination); router.refresh();
      } else setSent(true);
    } catch (e) { setError(e instanceof Error ? e.message : t("genericError")); }
    finally { setBusy(false); }
  }
  if (sent) return <div className="premio-panel"><h2 className="font-editorial text-4xl">{t("checkEmailTitle")}</h2><p className="premio-note mt-5">{t("checkEmail")}</p>
    <Link className="museum-button-primary mt-6" href={`/auth/login?next=${encodeURIComponent(destination)}`}>{t("login")}</Link></div>;
  return <div className="premio-panel"><form className="premio-form" onSubmit={register}>
    <label>{t("name")}<input name="name" required minLength={2} maxLength={120} autoComplete="name" disabled={busy} /></label>
    <label>Email<input name="email" type="email" required autoComplete="email" disabled={busy} /></label>
    <label>Password<input name="password" type="password" required minLength={8} autoComplete="new-password" disabled={busy} /></label>
    <label><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} required disabled={busy} />{t("acceptAccount")} <Link className="premio-text-link" href="/legal/termini" target="_blank">{t("terms")}</Link> · <Link className="premio-text-link" href="/privacy" target="_blank">Privacy</Link></label>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <button className="museum-button-primary" disabled={busy} type="submit">{busy ? t("saving") : t("createAccount")}</button>
    <p className="premio-note">{t("noMarketing")}</p>
  </form><div className="mt-6"><GoogleOAuthButton mode="register" nextPath={destination} disabled={busy || !accepted} compactNotice /></div>
    <p className="premio-note mt-6">{t("alreadyAccount")} <Link className="premio-text-link" href={`/auth/login?next=${encodeURIComponent(destination)}`}>{t("login")}</Link></p>
  </div>;
}
