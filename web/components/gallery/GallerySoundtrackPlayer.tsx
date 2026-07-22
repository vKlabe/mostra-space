"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import T from "@/components/i18n/T";

export type GallerySoundtrack = {
  id: string;
  title: string;
  mood: string | null;
  loopDurationSeconds: number | null;
  audioUrl: string;
};

type GallerySoundtrackPlayerProps = {
  soundtrack: GallerySoundtrack | null;
  className?: string;
};

const VOLUME_STORAGE_KEY = "mostraspace.gallerySoundtrack.volume";
const MUTED_STORAGE_KEY = "mostraspace.gallerySoundtrack.muted";

function clampVolume(value: number) {
  if (!Number.isFinite(value)) {
    return 0.35;
  }

  return Math.max(0, Math.min(1, value));
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes <= 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")} min`;
}

export default function GallerySoundtrackPlayer({
  soundtrack,
  className = "",
}: GallerySoundtrackPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [requiresGesture, setRequiresGesture] = useState(false);
  const [hasAudioError, setHasAudioError] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [isMuted, setIsMuted] = useState(false);

  const durationLabel = useMemo(
    () => formatDuration(soundtrack?.loopDurationSeconds || null),
    [soundtrack?.loopDurationSeconds]
  );

  useEffect(() => {
    try {
      const savedVolume = window.localStorage.getItem(VOLUME_STORAGE_KEY);
      const savedMuted = window.localStorage.getItem(MUTED_STORAGE_KEY);

      if (savedVolume !== null) {
        setVolume(clampVolume(Number(savedVolume)));
      }

      if (savedMuted !== null) {
        setIsMuted(savedMuted === "true");
      }
    } catch {
      // localStorage può non essere disponibile in alcuni contesti browser.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    } catch {
      // Ignora localStorage non disponibile.
    }

    const audio = audioRef.current;

    if (audio) {
      audio.volume = clampVolume(volume);
    }
  }, [volume]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MUTED_STORAGE_KEY, String(isMuted));
    } catch {
      // Ignora localStorage non disponibile.
    }

    const audio = audioRef.current;

    if (audio) {
      audio.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !soundtrack?.audioUrl) {
      return;
    }

    let disposed = false;

    setIsPlaying(false);
    setRequiresGesture(false);
    setHasAudioError(false);

    audio.loop = true;
    audio.preload = "auto";
    audio.volume = clampVolume(volume);
    audio.muted = isMuted;

    const handlePlay = () => {
      if (!disposed) {
        setIsPlaying(true);
        setRequiresGesture(false);
      }
    };

    const handlePause = () => {
      if (!disposed) {
        setIsPlaying(false);
      }
    };

    const handleError = () => {
      if (!disposed) {
        setHasAudioError(true);
        setIsPlaying(false);
        setRequiresGesture(false);
      }
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);

    const playPromise = audio.play();

    if (playPromise) {
      playPromise
        .then(() => {
          if (!disposed) {
            setIsPlaying(true);
            setRequiresGesture(false);
          }
        })
        .catch(() => {
          if (!disposed) {
            setIsPlaying(false);
            setRequiresGesture(true);
          }
        });
    }

    return () => {
      disposed = true;
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
    };
  }, [soundtrack?.audioUrl]);

  if (!soundtrack?.audioUrl) {
    return null;
  }

  async function playAudio() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    try {
      setHasAudioError(false);
      audio.volume = clampVolume(volume);
      audio.muted = isMuted;
      await audio.play();
      setIsPlaying(true);
      setRequiresGesture(false);
    } catch {
      setIsPlaying(false);
      setRequiresGesture(true);
    }
  }

  function pauseAudio() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();
    setIsPlaying(false);
  }

  function togglePlayback() {
    if (isPlaying) {
      pauseAudio();
      return;
    }

    void playAudio();
  }

  function handleVolumeChange(value: string) {
    const nextVolume = clampVolume(Number(value));

    setVolume(nextVolume);

    if (nextVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  }

  const statusLabel = hasAudioError ? (
    <T
      textKey="gallery.soundtrackPlayer.status.error"
      fallback="Audio non disponibile"
    />
  ) : requiresGesture ? (
    <T
      textKey="gallery.soundtrackPlayer.status.ready"
      fallback="Soundtrack disponibile"
    />
  ) : isPlaying ? (
    <T
      textKey="gallery.soundtrackPlayer.status.playing"
      fallback="In riproduzione"
    />
  ) : (
    <T
      textKey="gallery.soundtrackPlayer.status.paused"
      fallback="In pausa"
    />
  );

  return (
    <div
      className={`pointer-events-auto ${className}`}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <audio ref={audioRef} src={soundtrack.audioUrl} loop preload="auto" />

      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="group flex max-w-[min(22rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl border border-[rgba(197,151,94,0.5)] bg-[rgba(8,7,5,0.82)] px-4 py-3 text-left text-xs text-[var(--museum-ivory-soft)] shadow-2xl backdrop-blur-md transition hover:border-[rgba(197,151,94,0.85)] hover:bg-[rgba(8,7,5,0.92)]"
          aria-label="Apri controlli soundtrack"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(197,151,94,0.45)] bg-[rgba(168,121,69,0.18)] text-base text-[var(--museum-bronze-light)]">
            {isPlaying ? "♫" : "♪"}
          </span>

          <span className="min-w-0">
            <span className="block truncate font-medium text-[var(--museum-ivory)]">
              {requiresGesture ? (
                <T
                  textKey="gallery.soundtrackPlayer.collapsed.playSoundtrack"
                  fallback="Play soundtrack"
                />
              ) : (
                soundtrack.title
              )}
            </span>

            <span className="mt-0.5 block truncate text-[11px] text-[var(--museum-stone-muted)]">
              {statusLabel}
            </span>
          </span>
        </button>
      ) : (
        <div className="w-[min(24rem,calc(100vw-2rem))] rounded-3xl border border-[rgba(197,151,94,0.52)] bg-[rgba(8,7,5,0.9)] p-4 text-[var(--museum-ivory-soft)] shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="museum-label">
                <T
                  textKey="gallery.soundtrackPlayer.label"
                  fallback="Soundtrack"
                />
              </p>

              <h3 className="mt-2 truncate text-base font-semibold text-[var(--museum-ivory)]">
                {soundtrack.title}
              </h3>

              <p className="mt-1 truncate text-xs text-[var(--museum-stone-muted)]">
                {soundtrack.mood || (
                  <T
                    textKey="gallery.soundtrackPlayer.moodFallback"
                    fallback="Atmosfera galleria"
                  />
                )}
                {durationLabel ? ` · ${durationLabel}` : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-[var(--museum-stone)] transition hover:border-white/30 hover:text-[var(--museum-ivory)]"
              aria-label="Chiudi controlli soundtrack"
            >
              ×
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {requiresGesture && !hasAudioError && (
              <button
                type="button"
                onClick={playAudio}
                className="rounded-2xl border border-[rgba(197,151,94,0.68)] bg-[rgba(168,121,69,0.22)] px-4 py-3 text-sm font-medium text-[var(--museum-bronze-light)] transition hover:bg-[rgba(168,121,69,0.32)]"
              >
                <T
                  textKey="gallery.soundtrackPlayer.actions.playSoundtrack"
                  fallback="Play soundtrack"
                />
              </button>
            )}

            {hasAudioError && (
              <p className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-xs leading-5 text-red-100">
                <T
                  textKey="gallery.soundtrackPlayer.error.description"
                  fallback="Non riesco a riprodurre questa soundtrack. Controlla il file audio o riprova più tardi."
                />
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                className="rounded-full bg-white px-4 py-2 text-xs font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                {isPlaying ? (
                  <T
                    textKey="gallery.soundtrackPlayer.actions.pause"
                    fallback="Pausa"
                  />
                ) : (
                  <T
                    textKey="gallery.soundtrackPlayer.actions.play"
                    fallback="Play"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsMuted((current) => !current)}
                className="rounded-full border border-white/15 px-4 py-2 text-xs text-[var(--museum-ivory-soft)] transition hover:border-white/35"
              >
                {isMuted ? (
                  <T
                    textKey="gallery.soundtrackPlayer.actions.unmute"
                    fallback="Riattiva audio"
                  />
                ) : (
                  <T
                    textKey="gallery.soundtrackPlayer.actions.mute"
                    fallback="Mute"
                  />
                )}
              </button>

              <span className="rounded-full border border-white/10 px-3 py-2 text-[11px] text-[var(--museum-stone-muted)]">
                {statusLabel}
              </span>
            </div>

            <label className="grid gap-2 text-xs text-[var(--museum-stone-muted)]">
              <span>
                <T
                  textKey="gallery.soundtrackPlayer.volume"
                  fallback="Volume"
                />{" "}
                {Math.round(volume * 100)}%
              </span>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(event) => handleVolumeChange(event.target.value)}
                className="w-full accent-[var(--museum-bronze-light)]"
              />
            </label>

            <p className="text-[11px] leading-5 text-[var(--museum-stone-muted)]">
              <T
                textKey="gallery.soundtrackPlayer.note"
                fallback="Puoi disattivare la musica o regolare il volume in qualsiasi momento durante la visita."
              />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
