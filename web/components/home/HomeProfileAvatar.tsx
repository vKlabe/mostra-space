"use client";

import { useState } from "react";

type HomeProfileAvatarProps = {
  src: string | null;
  name: string;
};

function getInitials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "M"
  );
}

export default function HomeProfileAvatar({
  src,
  name,
}: HomeProfileAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const canShowImage = Boolean(src && failedSrc !== src);

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--museum-border)] bg-black/60">
      {canShowImage && src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-label={name}
          className="text-sm font-semibold text-[var(--museum-ivory-soft)]"
        >
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}
