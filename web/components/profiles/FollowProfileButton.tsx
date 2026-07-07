"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type FollowProfileButtonProps = {
  profileId: string;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
  canFollow: boolean;
  isOwnProfile: boolean;
  label?: string;
  followingLabel?: string;
  ownLabel?: string;
  showCount?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
};

export default function FollowProfileButton({
  profileId,
  initialIsFollowing,
  initialFollowerCount,
  canFollow,
  isOwnProfile,
  label = "Segui",
  followingLabel = "Segui già",
  ownLabel = "Il tuo profilo",
  showCount = true,
  compact = false,
  fullWidth = false,
}: FollowProfileButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isMutating, setIsMutating] = useState(false);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [message, setMessage] = useState<string | null>(null);

  const isBusy = isPending || isMutating;

  async function toggleFollow() {
    setMessage(null);

    if (isOwnProfile) {
      return;
    }

    if (!canFollow) {
      setMessage("Accedi per seguire questo profilo.");
      return;
    }

    const nextIsFollowing = !isFollowing;
    const previousIsFollowing = isFollowing;
    const previousFollowerCount = followerCount;

    setIsMutating(true);
    setIsFollowing(nextIsFollowing);
    setFollowerCount((current) =>
      nextIsFollowing ? current + 1 : Math.max(0, current - 1)
    );

    try {
      const response = await fetch(`/api/profiles/${profileId}/follow`, {
        method: nextIsFollowing ? "POST" : "DELETE",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || "Non riesco ad aggiornare il follow."
        );
      }

      if (typeof result?.isFollowing === "boolean") {
        setIsFollowing(result.isFollowing);
      }

      if (typeof result?.followerCount === "number") {
        setFollowerCount(result.followerCount);
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setIsFollowing(previousIsFollowing);
      setFollowerCount(previousFollowerCount);
      setMessage(
        error instanceof Error
          ? error.message
          : "Non riesco ad aggiornare il follow."
      );
    } finally {
      setIsMutating(false);
    }
  }

  function getButtonText() {
    if (isBusy) {
      return "Aggiorno...";
    }

    if (isOwnProfile) {
      return showCount ? `${ownLabel} · ${followerCount}` : ownLabel;
    }

    const baseLabel = isFollowing ? followingLabel : label;

    return showCount ? `${baseLabel} · ${followerCount}` : baseLabel;
  }

  const sizeClass = compact
    ? "px-4 py-2 text-xs uppercase tracking-[0.16em]"
    : "px-5 py-2 text-sm";

  const widthClass = fullWidth ? "w-full justify-center" : "";

  if (isOwnProfile) {
    return (
      <div
        className={`inline-flex rounded-full border border-neutral-700 ${sizeClass} ${widthClass} text-neutral-300`}
      >
        {getButtonText()}
      </div>
    );
  }

  return (
    <div className={fullWidth ? "w-full space-y-2" : "flex flex-col items-start gap-2"}>
      <button
        type="button"
        disabled={isBusy}
        onClick={toggleFollow}
        className={
          isFollowing
            ? `inline-flex ${widthClass} rounded-full border border-neutral-700 bg-neutral-950/80 ${sizeClass} text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60`
            : `inline-flex ${widthClass} rounded-full bg-white ${sizeClass} font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60`
        }
      >
        {getButtonText()}
      </button>

      {message && <p className="text-xs text-red-300">{message}</p>}
    </div>
  );
}
