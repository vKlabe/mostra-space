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

export type GalleryCuratorialAudio = {
  title: string;
  audioUrl: string;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
};

type GallerySoundtrackPlayerProps = {
  soundtrack: GallerySoundtrack | null;
  curatorialAudio?: GalleryCuratorialAudio | null;
  className?: string;
};

type AudioKind = "soundtrack" | "curatorial";

const SOUNDTRACK_VOLUME_STORAGE_KEY = "mostraspace.gallerySoundtrack.volume";
const SOUNDTRACK_MUTED_STORAGE_KEY = "mostraspace.gallerySoundtrack.muted";
const CURATORIAL_VOLUME_STORAGE_KEY = "mostraspace.galleryCuratorialAudio.volume";
const CURATORIAL_MUTED_STORAGE_KEY = "mostraspace.galleryCuratorialAudio.muted";

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

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getAudioStorageKeys(kind: AudioKind) {
  if (kind === "curatorial") {
    return {
      volume: CURATORIAL_VOLUME_STORAGE_KEY,
      muted: CURATORIAL_MUTED_STORAGE_KEY,
    };
  }

  return {
    volume: SOUNDTRACK_VOLUME_STORAGE_KEY,
    muted: SOUNDTRACK_MUTED_STORAGE_KEY,
  };
}

export default function GallerySoundtrackPlayer({
  soundtrack,
  curatorialAudio = null,
  className = "",
}: GallerySoundtrackPlayerProps) {
  const soundtrackAudioRef = useRef<HTMLAudioElement | null>(null);
  const curatorialAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isExpanded, setIsExpanded] = useState(false);

  const [isSoundtrackPlaying, setIsSoundtrackPlaying] = useState(false);
  const [soundtrackRequiresGesture, setSoundtrackRequiresGesture] = useState(false);
  const [hasSoundtrackError, setHasSoundtrackError] = useState(false);
  const [soundtrackVolume, setSoundtrackVolume] = useState(0.35);
  const [isSoundtrackMuted, setIsSoundtrackMuted] = useState(false);

  const [isCuratorialPlaying, setIsCuratorialPlaying] = useState(false);
  const [curatorialRequiresGesture, setCuratorialRequiresGesture] = useState(false);
  const [hasCuratorialError, setHasCuratorialError] = useState(false);
  const [curatorialVolume, setCuratorialVolume] = useState(0.75);
  const [isCuratorialMuted, setIsCuratorialMuted] = useState(false);
  const [curatorialCurrentTime, setCuratorialCurrentTime] = useState(0);
  const [curatorialDuration, setCuratorialDuration] = useState(
    curatorialAudio?.durationSeconds || 0
  );

  const soundtrackDurationLabel = useMemo(
    () => formatDuration(soundtrack?.loopDurationSeconds || null),
    [soundtrack?.loopDurationSeconds]
  );

  const curatorialDurationLabel = useMemo(
    () =>
      formatDuration(
        curatorialDuration || curatorialAudio?.durationSeconds || null
      ),
    [curatorialAudio?.durationSeconds, curatorialDuration]
  );

  useEffect(() => {
    try {
      const soundtrackKeys = getAudioStorageKeys("soundtrack");
      const curatorialKeys = getAudioStorageKeys("curatorial");

      const savedSoundtrackVolume = window.localStorage.getItem(
        soundtrackKeys.volume
      );
      const savedSoundtrackMuted = window.localStorage.getItem(
        soundtrackKeys.muted
      );
      const savedCuratorialVolume = window.localStorage.getItem(
        curatorialKeys.volume
      );
      const savedCuratorialMuted = window.localStorage.getItem(
        curatorialKeys.muted
      );

      if (savedSoundtrackVolume !== null) {
        setSoundtrackVolume(clampVolume(Number(savedSoundtrackVolume)));
      }

      if (savedSoundtrackMuted !== null) {
        setIsSoundtrackMuted(savedSoundtrackMuted === "true");
      }

      if (savedCuratorialVolume !== null) {
        setCuratorialVolume(clampVolume(Number(savedCuratorialVolume)));
      }

      if (savedCuratorialMuted !== null) {
        setIsCuratorialMuted(savedCuratorialMuted === "true");
      }
    } catch {
      // localStorage può non essere disponibile in alcuni contesti browser.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SOUNDTRACK_VOLUME_STORAGE_KEY,
        String(soundtrackVolume)
      );
    } catch {
      // Ignora localStorage non disponibile.
    }

    const audio = soundtrackAudioRef.current;

    if (audio) {
      audio.volume = clampVolume(soundtrackVolume);
    }
  }, [soundtrackVolume]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SOUNDTRACK_MUTED_STORAGE_KEY,
        String(isSoundtrackMuted)
      );
    } catch {
      // Ignora localStorage non disponibile.
    }

    const audio = soundtrackAudioRef.current;

    if (audio) {
      audio.muted = isSoundtrackMuted;
    }
  }, [isSoundtrackMuted]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CURATORIAL_VOLUME_STORAGE_KEY,
        String(curatorialVolume)
      );
    } catch {
      // Ignora localStorage non disponibile.
    }

    const audio = curatorialAudioRef.current;

    if (audio) {
      audio.volume = clampVolume(curatorialVolume);
    }
  }, [curatorialVolume]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CURATORIAL_MUTED_STORAGE_KEY,
        String(isCuratorialMuted)
      );
    } catch {
      // Ignora localStorage non disponibile.
    }

    const audio = curatorialAudioRef.current;

    if (audio) {
      audio.muted = isCuratorialMuted;
    }
  }, [isCuratorialMuted]);

  useEffect(() => {
    const audio = soundtrackAudioRef.current;

    if (!audio || !soundtrack?.audioUrl) {
      return;
    }

    let disposed = false;

    setIsSoundtrackPlaying(false);
    setSoundtrackRequiresGesture(false);
    setHasSoundtrackError(false);

    audio.loop = true;
    audio.preload = "auto";
    audio.volume = clampVolume(soundtrackVolume);
    audio.muted = isSoundtrackMuted;

    const handlePlay = () => {
      if (!disposed) {
        setIsSoundtrackPlaying(true);
        setSoundtrackRequiresGesture(false);
      }
    };

    const handlePause = () => {
      if (!disposed) {
        setIsSoundtrackPlaying(false);
      }
    };

    const handleError = () => {
      if (!disposed) {
        setHasSoundtrackError(true);
        setIsSoundtrackPlaying(false);
        setSoundtrackRequiresGesture(false);
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
            setIsSoundtrackPlaying(true);
            setSoundtrackRequiresGesture(false);
          }
        })
        .catch(() => {
          if (!disposed) {
            setIsSoundtrackPlaying(false);
            setSoundtrackRequiresGesture(true);
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

  useEffect(() => {
    const audio = curatorialAudioRef.current;

    if (!audio || !curatorialAudio?.audioUrl) {
      return;
    }

    let disposed = false;

    setIsCuratorialPlaying(false);
    setCuratorialRequiresGesture(false);
    setHasCuratorialError(false);
    setCuratorialCurrentTime(0);
    setCuratorialDuration(curatorialAudio.durationSeconds || 0);

    audio.loop = false;
    audio.preload = "auto";
    audio.currentTime = 0;
    audio.volume = clampVolume(curatorialVolume);
    audio.muted = isCuratorialMuted;

    const handlePlay = () => {
      if (!disposed) {
        setIsCuratorialPlaying(true);
        setCuratorialRequiresGesture(false);
      }
    };

    const handlePause = () => {
      if (!disposed) {
        setIsCuratorialPlaying(false);
      }
    };

    const handleError = () => {
      if (!disposed) {
        setHasCuratorialError(true);
        setIsCuratorialPlaying(false);
        setCuratorialRequiresGesture(false);
      }
    };

    const handleTimeUpdate = () => {
      if (!disposed) {
        setCuratorialCurrentTime(audio.currentTime || 0);
      }
    };

    const handleDurationChange = () => {
      if (!disposed && Number.isFinite(audio.duration)) {
        setCuratorialDuration(audio.duration);
      }
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("loadedmetadata", handleDurationChange);

    const playPromise = audio.play();

    if (playPromise) {
      playPromise
        .then(() => {
          if (!disposed) {
            setIsCuratorialPlaying(true);
            setCuratorialRequiresGesture(false);
          }
        })
        .catch(() => {
          if (!disposed) {
            setIsCuratorialPlaying(false);
            setCuratorialRequiresGesture(true);
          }
        });
    }

    return () => {
      disposed = true;
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("loadedmetadata", handleDurationChange);
    };
  }, [curatorialAudio?.audioUrl]);

  if (!soundtrack?.audioUrl && !curatorialAudio?.audioUrl) {
    return null;
  }

  async function playAudio(kind: AudioKind) {
    const audio =
      kind === "curatorial" ? curatorialAudioRef.current : soundtrackAudioRef.current;

    if (!audio) {
      return;
    }

    try {
      if (kind === "curatorial") {
        setHasCuratorialError(false);
        audio.volume = clampVolume(curatorialVolume);
        audio.muted = isCuratorialMuted;
      } else {
        setHasSoundtrackError(false);
        audio.volume = clampVolume(soundtrackVolume);
        audio.muted = isSoundtrackMuted;
      }

      await audio.play();

      if (kind === "curatorial") {
        setIsCuratorialPlaying(true);
        setCuratorialRequiresGesture(false);
      } else {
        setIsSoundtrackPlaying(true);
        setSoundtrackRequiresGesture(false);
      }
    } catch {
      if (kind === "curatorial") {
        setIsCuratorialPlaying(false);
        setCuratorialRequiresGesture(true);
      } else {
        setIsSoundtrackPlaying(false);
        setSoundtrackRequiresGesture(true);
      }
    }
  }

  function pauseAudio(kind: AudioKind) {
    const audio =
      kind === "curatorial" ? curatorialAudioRef.current : soundtrackAudioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();

    if (kind === "curatorial") {
      setIsCuratorialPlaying(false);
    } else {
      setIsSoundtrackPlaying(false);
    }
  }

  function togglePlayback(kind: AudioKind) {
    if (kind === "curatorial") {
      if (isCuratorialPlaying) {
        pauseAudio("curatorial");
        return;
      }

      void playAudio("curatorial");
      return;
    }

    if (isSoundtrackPlaying) {
      pauseAudio("soundtrack");
      return;
    }

    void playAudio("soundtrack");
  }

  function seekCuratorialAudio(seconds: number) {
    const audio = curatorialAudioRef.current;

    if (!audio) {
      return;
    }

    const duration =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : curatorialDuration || curatorialAudio?.durationSeconds || 0;

    const nextTime = Math.max(
      0,
      Math.min(duration || Number.MAX_SAFE_INTEGER, audio.currentTime + seconds)
    );

    audio.currentTime = nextTime;
    setCuratorialCurrentTime(nextTime);
  }

  function handleCuratorialProgressChange(value: string) {
    const audio = curatorialAudioRef.current;
    const nextTime = Number(value);

    if (!Number.isFinite(nextTime)) {
      return;
    }

    if (audio) {
      audio.currentTime = nextTime;
    }

    setCuratorialCurrentTime(nextTime);
  }

  function handleVolumeChange(kind: AudioKind, value: string) {
    const nextVolume = clampVolume(Number(value));

    if (kind === "curatorial") {
      setCuratorialVolume(nextVolume);

      if (nextVolume > 0 && isCuratorialMuted) {
        setIsCuratorialMuted(false);
      }

      return;
    }

    setSoundtrackVolume(nextVolume);

    if (nextVolume > 0 && isSoundtrackMuted) {
      setIsSoundtrackMuted(false);
    }
  }

  const soundtrackStatusLabel = hasSoundtrackError ? (
    <T
      textKey="gallery.soundtrackPlayer.status.error"
      fallback="Audio non disponibile"
    />
  ) : soundtrackRequiresGesture ? (
    <T
      textKey="gallery.soundtrackPlayer.status.ready"
      fallback="Soundtrack disponibile"
    />
  ) : isSoundtrackPlaying ? (
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

  const curatorialStatusLabel = hasCuratorialError ? (
    <T
      textKey="gallery.soundtrackPlayer.curatorial.status.error"
      fallback="Audio guida non disponibile"
    />
  ) : curatorialRequiresGesture ? (
    <T
      textKey="gallery.soundtrackPlayer.curatorial.status.ready"
      fallback="Audio guida disponibile"
    />
  ) : isCuratorialPlaying ? (
    <T
      textKey="gallery.soundtrackPlayer.curatorial.status.playing"
      fallback="Audio guida in riproduzione"
    />
  ) : (
    <T
      textKey="gallery.soundtrackPlayer.curatorial.status.paused"
      fallback="Audio guida in pausa"
    />
  );

  const collapsedTitle = curatorialAudio?.audioUrl
    ? curatorialAudio.title
    : soundtrack?.title || "Audio galleria";

  const collapsedStatus = curatorialAudio?.audioUrl
    ? curatorialStatusLabel
    : soundtrackStatusLabel;

  return (
    <div
      className={`pointer-events-auto ${className}`}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {soundtrack?.audioUrl && (
        <audio
          ref={soundtrackAudioRef}
          src={soundtrack.audioUrl}
          loop
          preload="auto"
        />
      )}

      {curatorialAudio?.audioUrl && (
        <audio
          ref={curatorialAudioRef}
          src={curatorialAudio.audioUrl}
          preload="auto"
        />
      )}

      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="group flex max-w-[min(22rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl border border-[rgba(197,151,94,0.5)] bg-[rgba(8,7,5,0.82)] px-4 py-3 text-left text-xs text-[var(--museum-ivory-soft)] shadow-2xl backdrop-blur-md transition hover:border-[rgba(197,151,94,0.85)] hover:bg-[rgba(8,7,5,0.92)]"
          aria-label="Apri controlli audio galleria"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(197,151,94,0.45)] bg-[rgba(168,121,69,0.18)] text-base text-[var(--museum-bronze-light)]">
            {isSoundtrackPlaying || isCuratorialPlaying ? "♫" : "♪"}
          </span>

          <span className="min-w-0">
            <span className="block truncate font-medium text-[var(--museum-ivory)]">
              {soundtrackRequiresGesture || curatorialRequiresGesture ? (
                <T
                  textKey="gallery.soundtrackPlayer.collapsed.playAudio"
                  fallback="Play audio galleria"
                />
              ) : (
                collapsedTitle
              )}
            </span>

            <span className="mt-0.5 block truncate text-[11px] text-[var(--museum-stone-muted)]">
              {collapsedStatus}
            </span>
          </span>
        </button>
      ) : (
        <div className="max-h-[calc(100vh-2rem)] w-[min(25rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-[rgba(197,151,94,0.52)] bg-[rgba(8,7,5,0.9)] p-4 text-[var(--museum-ivory-soft)] shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="museum-label">
                <T
                  textKey="gallery.soundtrackPlayer.combinedLabel"
                  fallback="Audio galleria"
                />
              </p>

              <h3 className="mt-2 truncate text-base font-semibold text-[var(--museum-ivory)]">
                {collapsedTitle}
              </h3>

              <p className="mt-1 truncate text-xs text-[var(--museum-stone-muted)]">
                {curatorialAudio?.audioUrl ? (
                  <T
                    textKey="gallery.soundtrackPlayer.combinedDescription"
                    fallback="Soundtrack e audio guida"
                  />
                ) : (
                  <T
                    textKey="gallery.soundtrackPlayer.label"
                    fallback="Soundtrack"
                  />
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-[var(--museum-stone)] transition hover:border-white/30 hover:text-[var(--museum-ivory)]"
              aria-label="Riduci controlli audio"
            >
              ×
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            {soundtrack?.audioUrl && (
              <section className="rounded-2xl border border-[rgba(197,151,94,0.2)] bg-black/25 p-3">
                <p className="museum-label">
                  <T
                    textKey="gallery.soundtrackPlayer.label"
                    fallback="Soundtrack"
                  />
                </p>

                <h4 className="mt-2 truncate text-sm font-semibold text-[var(--museum-ivory)]">
                  {soundtrack.title}
                </h4>

                <p className="mt-1 truncate text-xs text-[var(--museum-stone-muted)]">
                  {soundtrack.mood || (
                    <T
                      textKey="gallery.soundtrackPlayer.moodFallback"
                      fallback="Atmosfera galleria"
                    />
                  )}
                  {soundtrackDurationLabel ? ` · ${soundtrackDurationLabel}` : ""}
                </p>

                {soundtrackRequiresGesture && !hasSoundtrackError && (
                  <button
                    type="button"
                    onClick={() => void playAudio("soundtrack")}
                    className="mt-3 rounded-2xl border border-[rgba(197,151,94,0.68)] bg-[rgba(168,121,69,0.22)] px-4 py-3 text-sm font-medium text-[var(--museum-bronze-light)] transition hover:bg-[rgba(168,121,69,0.32)]"
                  >
                    <T
                      textKey="gallery.soundtrackPlayer.actions.playSoundtrack"
                      fallback="Play soundtrack"
                    />
                  </button>
                )}

                {hasSoundtrackError && (
                  <p className="mt-3 rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-xs leading-5 text-red-100">
                    <T
                      textKey="gallery.soundtrackPlayer.error.description"
                      fallback="Non riesco a riprodurre questa soundtrack. Controlla il file audio o riprova più tardi."
                    />
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => togglePlayback("soundtrack")}
                    className="rounded-full bg-white px-4 py-2 text-xs font-medium text-neutral-950 transition hover:bg-neutral-200"
                  >
                    {isSoundtrackPlaying ? (
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
                    onClick={() => setIsSoundtrackMuted((current) => !current)}
                    className="rounded-full border border-white/15 px-4 py-2 text-xs text-[var(--museum-ivory-soft)] transition hover:border-white/35"
                  >
                    {isSoundtrackMuted ? (
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
                    {soundtrackStatusLabel}
                  </span>
                </div>

                <label className="mt-3 grid gap-2 text-xs text-[var(--museum-stone-muted)]">
                  <span>
                    <T
                      textKey="gallery.soundtrackPlayer.volume"
                      fallback="Volume"
                    />{" "}
                    {Math.round(soundtrackVolume * 100)}%
                  </span>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={soundtrackVolume}
                    onChange={(event) =>
                      handleVolumeChange("soundtrack", event.target.value)
                    }
                    className="w-full accent-[var(--museum-bronze-light)]"
                  />
                </label>
              </section>
            )}

            {curatorialAudio?.audioUrl && (
              <section className="rounded-2xl border border-[rgba(197,151,94,0.34)] bg-[rgba(168,121,69,0.08)] p-3">
                <p className="museum-label">
                  <T
                    textKey="gallery.soundtrackPlayer.curatorial.label"
                    fallback="Audio guida"
                  />
                </p>

                <h4 className="mt-2 truncate text-sm font-semibold text-[var(--museum-ivory)]">
                  {curatorialAudio.title}
                </h4>

                <p className="mt-1 truncate text-xs text-[var(--museum-stone-muted)]">
                  {curatorialDurationLabel || (
                    <T
                      textKey="gallery.soundtrackPlayer.curatorial.durationFallback"
                      fallback="Durata non disponibile"
                    />
                  )}
                </p>

                {curatorialRequiresGesture && !hasCuratorialError && (
                  <button
                    type="button"
                    onClick={() => void playAudio("curatorial")}
                    className="mt-3 rounded-2xl border border-[rgba(197,151,94,0.68)] bg-[rgba(168,121,69,0.22)] px-4 py-3 text-sm font-medium text-[var(--museum-bronze-light)] transition hover:bg-[rgba(168,121,69,0.32)]"
                  >
                    <T
                      textKey="gallery.soundtrackPlayer.curatorial.actions.playGuide"
                      fallback="Play audio guida"
                    />
                  </button>
                )}

                {hasCuratorialError && (
                  <p className="mt-3 rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-xs leading-5 text-red-100">
                    <T
                      textKey="gallery.soundtrackPlayer.curatorial.error.description"
                      fallback="Non riesco a riprodurre l’audio guida. Controlla il file audio o riprova più tardi."
                    />
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => togglePlayback("curatorial")}
                    className="rounded-full bg-white px-4 py-2 text-xs font-medium text-neutral-950 transition hover:bg-neutral-200"
                  >
                    {isCuratorialPlaying ? (
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
                    onClick={() => setIsCuratorialMuted((current) => !current)}
                    className="rounded-full border border-white/15 px-4 py-2 text-xs text-[var(--museum-ivory-soft)] transition hover:border-white/35"
                  >
                    {isCuratorialMuted ? (
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

                  <button
                    type="button"
                    onClick={() => seekCuratorialAudio(-10)}
                    className="rounded-full border border-white/15 px-4 py-2 text-xs text-[var(--museum-ivory-soft)] transition hover:border-white/35"
                  >
                    -10s
                  </button>

                  <button
                    type="button"
                    onClick={() => seekCuratorialAudio(10)}
                    className="rounded-full border border-white/15 px-4 py-2 text-xs text-[var(--museum-ivory-soft)] transition hover:border-white/35"
                  >
                    +10s
                  </button>
                </div>

                <label className="mt-3 grid gap-2 text-xs text-[var(--museum-stone-muted)]">
                  <span>
                    {formatTime(curatorialCurrentTime)} /{" "}
                    {formatTime(
                      curatorialDuration ||
                        curatorialAudio.durationSeconds ||
                        curatorialCurrentTime
                    )}
                  </span>

                  <input
                    type="range"
                    min="0"
                    max={Math.max(
                      1,
                      Math.round(
                        curatorialDuration ||
                          curatorialAudio.durationSeconds ||
                          curatorialCurrentTime ||
                          1
                      )
                    )}
                    step="0.1"
                    value={Math.min(
                      curatorialCurrentTime,
                      Math.max(
                        1,
                        curatorialDuration || curatorialAudio.durationSeconds || 1
                      )
                    )}
                    onChange={(event) =>
                      handleCuratorialProgressChange(event.target.value)
                    }
                    className="w-full accent-[var(--museum-bronze-light)]"
                  />
                </label>

                <label className="mt-3 grid gap-2 text-xs text-[var(--museum-stone-muted)]">
                  <span>
                    <T
                      textKey="gallery.soundtrackPlayer.volume"
                      fallback="Volume"
                    />{" "}
                    {Math.round(curatorialVolume * 100)}%
                  </span>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={curatorialVolume}
                    onChange={(event) =>
                      handleVolumeChange("curatorial", event.target.value)
                    }
                    className="w-full accent-[var(--museum-bronze-light)]"
                  />
                </label>

                <p className="mt-3 text-[11px] leading-5 text-[var(--museum-stone-muted)]">
                  <T
                    textKey="gallery.soundtrackPlayer.curatorial.note"
                    fallback="Puoi mettere in pausa, spostarti avanti o indietro e regolare il volume dell’audio guida in qualsiasi momento."
                  />
                </p>
              </section>
            )}

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
