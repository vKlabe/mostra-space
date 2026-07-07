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
  size?: "sm" | "md";
  compact?: boolean;
  showCount?: boolean;
  align?: "start" | "center";
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
  size = "md",
  compact = false,
  showCount = true,
  align = "start",
}: FollowProfileButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [message, setMessage] = useState<string | null>(null);

  const resolvedSize = compact ? "sm" : size;

  const buttonSizeClass =
    resolvedSize === "sm" ? "px-4 py-2 text-xs" : "px-5 py-2 text-sm";

  const wrapperAlignClass =
    align === "center" ? "items-center text-center" : "items-start";

  function getButtonText() {
    if (isPending) {
      return "Aggiorno...";
    }

    if (isFollowing) {
      return showCount ? `${followingLabel} · ${followerCount}` : followingLabel;
    }

    return showCount ? `${label} · ${followerCount}` : label;
  }

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
    }
  }

  if (isOwnProfile) {
    return (
      <div
        className={`rounded-full border border-neutral-700 ${buttonSizeClass} text-neutral-300`}
      >
        {ownLabel}
        {showCount ? ` · ${followerCount} follower` : ""}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${wrapperAlignClass}`}>
      <button
        type="button"
        disabled={isPending}
        onClick={toggleFollow}
        className={
          isFollowing
            ? `rounded-full border border-neutral-700 bg-neutral-950/80 ${buttonSizeClass} text-neutral-100 transition hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60`
            : `rounded-full bg-white ${buttonSizeClass} font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60`
        }
      >
        {getButtonText()}
      </button>

      {message && <p className="text-xs text-red-300">{message}</p>}
    </div>
  );
}
