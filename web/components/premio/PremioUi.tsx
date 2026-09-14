"use client";
import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Messages } from "@/lib/i18n/dictionaries";
import FollowProfileButton from "@/components/profiles/FollowProfileButton";
import { entryPath, PREMIO_PATH } from "@/lib/premio/config";
import type { EntryCard } from "@/lib/premio/types";
export function usePremioText() {
  const { t } = useLanguage();
  return (key: string) => t(`premio.${key}` as keyof Messages, key);
}
export function PremioDate({ value, dateOnly = false }: { value: string; dateOnly?: boolean }) {
  const { locale } = useLanguage();
  return <time dateTime={value}>{new Intl.DateTimeFormat(locale, { timeZone: "Europe/Rome", dateStyle: "long", ...(dateOnly ? {} : { timeStyle: "short" }) }).format(new Date(value))}</time>;
}
export function PremioShare({ path, title }: { path: string; title: string }) {
  const t = usePremioText(); const [copied, setCopied] = useState(false); const [error, setError] = useState(false);
  const url = `https://mostra.space${path}`;
  async function share() {
    setError(false);
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); }
    } catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setError(true); }
  }
  return <div className="flex flex-wrap items-center gap-3">
    <button className="museum-button-secondary" type="button" onClick={share}>{copied ? t("copied") : t("share")}</button>
    <a className="premio-text-link" href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
    {error && <p role="status">{t("shareError")} <span className="break-all">{url}</span></p>}
  </div>;
}
export function PremioFollow({ entry, year, viewerId }: { entry: EntryCard; year: number; viewerId: string | null }) {
  const t = usePremioText();
  if (!viewerId) return <Link className="museum-button-primary" href={`${PREMIO_PATH}/iscriviti?intent=support&next=${encodeURIComponent(entryPath(year, entry.slug))}`}>{t("followSupport")}</Link>;
  return <FollowProfileButton key={`${entry.id}-${entry.is_following}`} profileId={entry.artist_id} initialIsFollowing={entry.is_following}
    initialFollowerCount={entry.follower_count} canFollow isOwnProfile={viewerId === entry.artist_id}
    showCount={false} label={t("followSupport")} followingLabel={t("following")} ownLabel={t("yourEntry")} />;
}
export function PremioCard({ entry, year }: { entry: EntryCard; year: number }) {
  const t = usePremioText();
  const image = entry.cover_image_url || entry.avatar_url;
  return <Link className="premio-entry-card" href={entryPath(year, entry.slug)}>
    <div className="premio-entry-image">{image ?
      // Images are existing public gallery covers; no additional provider configuration is required.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={entry.gallery_title} loading="lazy" width={640} height={480} /> : <span aria-hidden="true">{entry.artist_name.slice(0, 1)}</span>}</div>
    <div className="p-5"><p className="museum-label">{t("artist")}</p><h3 className="mt-2 font-editorial text-3xl">{entry.artist_name}</h3>
      <p className="mt-2 text-sm text-[var(--museum-stone)]">{entry.gallery_title}</p>
      <span className="mt-5 inline-block text-xs uppercase tracking-widest text-[var(--museum-bronze-light)]">{t("discoverEntry")} →</span></div>
  </Link>;
}
