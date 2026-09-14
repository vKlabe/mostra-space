"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PremioDate, PremioShare, usePremioText } from "./PremioUi";
import { entryPath, premioPhase, PREMIO_PATH, type Edition } from "@/lib/premio/config";
import type { Entry, PrizeGrant } from "@/lib/premio/types";
type GalleryOption = { id: string; title: string; status: string };
export default function PremioApplication({ edition, entry, galleries, artistName, grants, serverNow }: {
  edition: Edition; entry: Entry | null; galleries: GalleryOption[]; artistName: string; grants: PrizeGrant[]; serverNow: number;
}) {
  const t = usePremioText(); const router = useRouter(); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [success, setSuccess] = useState(false); const [withdraw, setWithdraw] = useState(false);
  const [now, setNow] = useState(serverNow);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const open = premioPhase(edition, now) === "applications";
  async function act(body: Record<string, unknown>) {
    if (busy) return; setBusy(true); setError(""); setSuccess(false);
    try {
      const response = await fetch("/api/premio/entry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { const key = `error.${result.code || "PREMIO_REQUEST_FAILED"}`; const message = t(key); throw new Error(message === key ? t("genericError") : message); }
      setSuccess(true); setWithdraw(false); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : t("genericError")); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void act({ action: "submit", galleryId: form.get("galleryId"), artistName: form.get("artistName"), statement: form.get("statement"),
      declarations: form.get("declarations") === "on", rulesVersion: edition.rules_version });
  }
  return <div className="space-y-6">
    <div className="premio-status"><p>{t(`phase.${premioPhase(edition, now)}`)}</p>{entry && <p className="mt-2 font-medium">{t(`status.${entry.status}`)}</p>}
      {entry?.public_note && <p className="mt-2">{entry.public_note}</p>}</div>
    {error && <p role="alert" className="rounded-xl border border-red-800 p-4 text-red-200">{error}</p>}
    {success && <p role="status" className="rounded-xl border border-emerald-800 p-4 text-emerald-200">{t("saved")}</p>}
    {!entry && open && <div className="premio-panel"><p className="premio-note">{t("enrollDescription")}</p><button type="button" onClick={() => void act({ action: "enroll" })} disabled={busy} className="museum-button-primary mt-5">{t("startEntry")}</button></div>}
    {entry && open && entry.status !== "excluded" && <form className="premio-panel premio-form" onSubmit={submit}>
      <label>{t("artistName")}<input name="artistName" defaultValue={entry.artist_name || artistName} required minLength={2} maxLength={120} disabled={busy} /></label>
      <label>{t("chooseGallery")}<select name="galleryId" defaultValue={entry.gallery_id || ""} required disabled={busy}>
        <option value="">{t("selectGallery")}</option>{galleries.map(g => <option value={g.id} key={g.id}>{g.title}</option>)}
      </select></label>
      {!galleries.length && <p className="premio-note">{t("publishFirst")} <Link className="premio-text-link" href="/dashboard/gallerie">{t("manageGalleries")}</Link></p>}
      <label>{t("statement")}<textarea name="statement" defaultValue={entry.statement} minLength={20} maxLength={3000} required disabled={busy} /></label>
      <p className="premio-note">{t("snapshotExplanation")}</p>
      <label><input type="checkbox" name="declarations" required disabled={busy} />{t("declarations")} <Link className="premio-text-link" target="_blank" href={`${PREMIO_PATH}/regolamento`}>{t("rules")}</Link>.</label>
      <button type="submit" className="museum-button-primary" disabled={busy || !galleries.length}>{busy ? t("archiving") : entry.version ? t("resubmit") : t("submitEntry")}</button>
    </form>}
    {entry && entry.version > 0 && <div className="premio-panel"><p className="museum-label">{t("submittedVersion")} {entry.version}</p>
      {entry.submitted_at && <p className="premio-note mt-2"><PremioDate value={entry.submitted_at} /></p>}
      <Link className="museum-button-secondary mt-5" href={`${entryPath(edition.year, entry.slug)}/archivio`}>{t("viewSnapshot")}</Link>
      {entry.status === "admitted" && <div className="mt-5 space-y-4"><Link className="premio-text-link" href={entryPath(edition.year, entry.slug)}>{t("publicEntry")}</Link><PremioShare path={entryPath(edition.year, entry.slug)} title={`${entry.artist_name} · ${edition.title}`} /></div>}
      {now < Date.parse(edition.social_close_at) && ["submitted", "admitted"].includes(entry.status) && <div className="mt-6 border-t border-[var(--museum-border)] pt-4">
        {withdraw ? <div><p className="premio-note">{t("withdrawConfirm")}</p><button disabled={busy} className="museum-button-secondary mt-3" onClick={() => void act({ action: "withdraw" })}>{t("confirmWithdrawal")}</button><button className="ml-4 premio-text-link" onClick={() => setWithdraw(false)}>{t("cancel")}</button></div>
          : <button className="premio-text-link" onClick={() => setWithdraw(true)}>{t("withdraw")}</button>}
      </div>}
    </div>}
    {grants.map(grant => <div className="premio-panel" key={grant.id}><h2 className="font-editorial text-4xl">{t("yourPrize")}: {grant.plan.toUpperCase()} · {grant.months} {t("months")}</h2>
      {grant.status === "available" && <><p className="premio-note mt-4">{t("claimExplanation")}</p><button className="museum-button-primary mt-5" disabled={busy} onClick={() => void act({ action: "claim", grantId: grant.id })}>{t("claim")}</button><p className="premio-note mt-4"><a href="mailto:billing@mostra.space" className="premio-text-link">billing@mostra.space</a></p></>}
      {grant.status === "active" && grant.ends_at && <p className="premio-note mt-4">{t("activeUntil")} <PremioDate value={grant.ends_at} /></p>}
      {grant.status === "expired" && <p className="premio-note mt-4">{t("prizeExpired")}</p>}
      {grant.status === "delivered" && <p className="premio-note mt-4">{grant.delivery_note}</p>}
    </div>)}
  </div>;
}
