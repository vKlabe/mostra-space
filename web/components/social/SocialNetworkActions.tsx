"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import T from "@/components/i18n/T";

type SocialNetworkActionsProps = {
  profileId: string;
  initialIsFollowing: boolean;
  initialIsMuted: boolean;
};

export default function SocialNetworkActions({
  profileId,
  initialIsFollowing,
  initialIsMuted,
}: SocialNetworkActionsProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isMuted, setIsMuted] = useState(initialIsMuted);
  const [followPending, setFollowPending] = useState(false);
  const [mutePending, setMutePending] = useState(false);
  const [errorKind, setErrorKind] = useState<"follow" | "mute" | null>(null);

  async function toggleFollow() {
    if (followPending) {
      return;
    }

    const previous = isFollowing;
    const next = !previous;

    setErrorKind(null);
    setFollowPending(true);
    setIsFollowing(next);

    try {
      const response = await fetch(`/api/profiles/${profileId}/follow`, {
        method: next ? "POST" : "DELETE",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error("follow-update-failed");
      }

      if (typeof result?.isFollowing === "boolean") {
        setIsFollowing(result.isFollowing);
      }

      router.refresh();
    } catch {
      setIsFollowing(previous);
      setErrorKind("follow");
    } finally {
      setFollowPending(false);
    }
  }

  async function toggleMute() {
    if (mutePending || !isFollowing) {
      return;
    }

    const previous = isMuted;
    const next = !previous;

    setErrorKind(null);
    setMutePending(true);
    setIsMuted(next);

    try {
      const response = await fetch(
        `/api/account/notification-mutes/${profileId}`,
        { method: next ? "POST" : "DELETE" }
      );
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error("notification-mute-update-failed");
      }

      if (typeof result?.isMuted === "boolean") {
        setIsMuted(result.isMuted);
      }

      router.refresh();
    } catch {
      setIsMuted(previous);
      setErrorKind("mute");
    } finally {
      setMutePending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleFollow}
          disabled={followPending}
          aria-busy={followPending}
          className={
            isFollowing
              ? "museum-button-secondary min-h-11 px-4 py-2 text-xs hover:border-red-800 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              : "museum-button-primary min-h-11 px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          }
        >
          {followPending ? (
            <T textKey="dashboard.social.network.actions.updating" fallback="Aggiorno..." />
          ) : isFollowing ? (
            <T textKey="dashboard.social.network.actions.unfollow" fallback="Non seguire più" />
          ) : (
            <T textKey="dashboard.social.network.actions.follow" fallback="Segui" />
          )}
        </button>

        {isFollowing && (
          <button
            type="button"
            onClick={toggleMute}
            disabled={mutePending}
            aria-pressed={isMuted}
            aria-busy={mutePending}
            className={
              isMuted
                ? "museum-button-secondary min-h-11 border-amber-800 bg-amber-950/20 px-4 py-2 text-xs text-amber-200 hover:border-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                : "museum-button-secondary min-h-11 px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {mutePending ? (
              <T textKey="dashboard.social.network.actions.updating" fallback="Aggiorno..." />
            ) : isMuted ? (
              <T textKey="dashboard.social.network.actions.unmute" fallback="Riattiva notifiche" />
            ) : (
              <T textKey="dashboard.social.network.actions.mute" fallback="Silenzia notifiche" />
            )}
          </button>
        )}
      </div>

      {errorKind && (
        <p role="status" className="text-xs text-red-300">
          {errorKind === "follow" ? (
            <T
              textKey="dashboard.social.network.errors.follow"
              fallback="Non riesco ad aggiornare il follow."
            />
          ) : (
            <T
              textKey="dashboard.social.network.errors.notifications"
              fallback="Non riesco ad aggiornare le notifiche."
            />
          )}
        </p>
      )}
    </div>
  );
}
