"use client";

import { useEffect, useRef, useState } from "react";

type UnityMode = "visitor" | "editor";

type UnityGalleryViewerProps = {
  galleryId: string;
  mode: UnityMode;
};

type MovementKey = "KeyW" | "KeyA" | "KeyS" | "KeyD";

const movementKeyMap: Record<
  MovementKey,
  {
    key: string;
    code: MovementKey;
    keyCode: number;
  }
> = {
  KeyW: {
    key: "w",
    code: "KeyW",
    keyCode: 87,
  },
  KeyA: {
    key: "a",
    code: "KeyA",
    keyCode: 65,
  },
  KeyS: {
    key: "s",
    code: "KeyS",
    keyCode: 83,
  },
  KeyD: {
    key: "d",
    code: "KeyD",
    keyCode: 68,
  },
};

function getViewerTitle(mode: UnityMode) {
  return mode === "editor" ? "Editor spazio 3D" : "Spazio immersivo";
}

function getViewerDescription(mode: UnityMode) {
  if (mode === "editor") {
    return "Allestisci la galleria, trascina le opere sulle pareti, modifica dimensioni e cornici, poi salva le modifiche.";
  }

  return "Entra nello spazio virtuale, muoviti tra le opere e apri le schede informative direttamente dal viewer.";
}

function getDesktopControls(mode: UnityMode) {
  if (mode === "editor") {
    return "WASD movimento · Q/E rotazione · R/F quota · mouse libero per UI e drag";
  }

  return "Click per entrare · WASD movimento · mouse visuale · Shift corsa · ESC libera mouse · SPACE comandi";
}

function getMobileControls(mode: UnityMode) {
  if (mode === "editor") {
    return "Per l’editor consigliamo desktop. Da smartphone o tablet puoi visualizzare, ma l’allestimento è più preciso da computer.";
  }

  return "Usa le frecce touch per muoverti. Trascina il dito dentro lo spazio 3D per orientare la visuale. Per una visita migliore ruota il dispositivo in orizzontale.";
}

function createKeyboardEvent(type: "keydown" | "keyup", movementKey: MovementKey) {
  const config = movementKeyMap[movementKey];

  const event = new KeyboardEvent(type, {
    key: config.key,
    code: config.code,
    bubbles: true,
    cancelable: true,
  });

  try {
    Object.defineProperty(event, "keyCode", {
      get: () => config.keyCode,
    });

    Object.defineProperty(event, "which", {
      get: () => config.keyCode,
    });
  } catch {
    // Alcuni browser non permettono override di keyCode/which.
  }

  return event;
}

function createEscapeKeyboardEvent(type: "keydown" | "keyup") {
  const event = new KeyboardEvent(type, {
    key: "Escape",
    code: "Escape",
    bubbles: true,
    cancelable: true,
  });

  try {
    Object.defineProperty(event, "keyCode", {
      get: () => 27,
    });

    Object.defineProperty(event, "which", {
      get: () => 27,
    });
  } catch {
    // Alcuni browser non permettono override di keyCode/which.
  }

  return event;
}

export default function UnityGalleryViewer({
  galleryId,
  mode,
}: UnityGalleryViewerProps) {
  const [iframeVersion, setIframeVersion] = useState(0);
  const [isMobileViewer, setIsMobileViewer] = useState(false);
  const viewerShellRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const activeKeysRef = useRef<Set<MovementKey>>(new Set());
  const repeatIntervalRef = useRef<number | null>(null);

  /**
   * IMPORTANTISSIMO:
   * L'URL resta identico alla versione stabile.
   * Non aggiungiamo mobile=1, #mobile=1 o altri parametri.
   */
  const iframeSrc = `/unity-frame?galleryId=${encodeURIComponent(
    galleryId
  )}&mode=${encodeURIComponent(mode)}&v=${iframeVersion}`;

  useEffect(() => {
    function updateDeviceMode() {
      const hasTouch =
        typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

      const smallScreen =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 1024px)").matches;

      setIsMobileViewer(Boolean(hasTouch && smallScreen));
    }

    updateDeviceMode();

    window.addEventListener("resize", updateDeviceMode);
    window.addEventListener("orientationchange", updateDeviceMode);

    return () => {
      window.removeEventListener("resize", updateDeviceMode);
      window.removeEventListener("orientationchange", updateDeviceMode);
    };
  }, []);

  useEffect(() => {
    function releaseAllKeys() {
      activeKeysRef.current.forEach((movementKey) => {
        sendMovementKey(movementKey, "keyup");
      });

      activeKeysRef.current.clear();
      stopRepeatMovementKeys();
    }

    window.addEventListener("blur", releaseAllKeys);
    window.addEventListener("visibilitychange", releaseAllKeys);

    return () => {
      releaseAllKeys();
      window.removeEventListener("blur", releaseAllKeys);
      window.removeEventListener("visibilitychange", releaseAllKeys);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reloadIframe() {
    releaseAllMovementKeys();
    setIframeVersion((current) => current + 1);
  }

  async function openFullscreen() {
    const element = viewerShellRef.current;

    if (element?.requestFullscreen) {
      try {
        await element.requestFullscreen();
        return;
      } catch {
        window.open(iframeSrc, "_blank", "noopener,noreferrer");
        return;
      }
    }

    window.open(iframeSrc, "_blank", "noopener,noreferrer");
  }

  function getIframeTargets(options?: { focus?: boolean }) {
    const iframe = iframeRef.current;

    if (!iframe?.contentWindow) {
      return [];
    }

    const targets: EventTarget[] = [iframe.contentWindow];

    try {
      const iframeDocument = iframe.contentWindow.document;

      targets.push(iframeDocument);

      const canvas = iframeDocument.querySelector("canvas");

      if (canvas) {
        targets.push(canvas);
      }

      if (options?.focus !== false) {
  iframe.contentWindow.focus();
  canvas?.focus();
}
    } catch {
      // Same-origin dovrebbe permetterlo, ma se il browser blocca qualcosa evitiamo crash.
    }

    return targets;
  }

  function releaseUnityVisualCapture() {
  const iframe = iframeRef.current;
  const targets = [...getIframeTargets({ focus: false }), window, document];

  targets.forEach((target) => {
    target.dispatchEvent(createEscapeKeyboardEvent("keydown"));
    target.dispatchEvent(createEscapeKeyboardEvent("keyup"));
  });

  try {
    document.exitPointerLock?.();
  } catch {
    // Ignora: non tutti i browser permettono questa chiamata.
  }

  try {
    iframe?.contentWindow?.document.exitPointerLock?.();
  } catch {
    // Ignora: sicurezza iframe/browser.
  }

  try {
    iframe?.blur();
    viewerShellRef.current?.focus();
  } catch {
    // Ignora: fallback silenzioso.
  }
}

  function sendMovementKey(
    movementKey: MovementKey,
    type: "keydown" | "keyup"
  ) {
    const targets = getIframeTargets({ focus: true });

    if (targets.length === 0) {
      return;
    }

    targets.forEach((target) => {
      target.dispatchEvent(createKeyboardEvent(type, movementKey));
    });
  }

  function repeatActiveMovementKeys() {
    activeKeysRef.current.forEach((movementKey) => {
      sendMovementKey(movementKey, "keydown");
    });
  }

  function startRepeatMovementKeys() {
    if (repeatIntervalRef.current !== null) {
      return;
    }

    repeatIntervalRef.current = window.setInterval(() => {
      repeatActiveMovementKeys();
    }, 80);
  }

  function stopRepeatMovementKeys() {
    if (repeatIntervalRef.current === null) {
      return;
    }

    window.clearInterval(repeatIntervalRef.current);
    repeatIntervalRef.current = null;
  }

  function pressMovementKey(movementKey: MovementKey) {
  if (mode !== "visitor") {
    return;
  }

  releaseUnityVisualCapture();

  activeKeysRef.current.add(movementKey);

  window.setTimeout(() => {
    if (!activeKeysRef.current.has(movementKey)) {
      return;
    }

    sendMovementKey(movementKey, "keydown");
    startRepeatMovementKeys();
  }, 40);
}

  function releaseMovementKey(movementKey: MovementKey) {
    if (!activeKeysRef.current.has(movementKey)) {
      return;
    }

    activeKeysRef.current.delete(movementKey);
    sendMovementKey(movementKey, "keyup");

    if (activeKeysRef.current.size === 0) {
      stopRepeatMovementKeys();
    }
  }

  function releaseAllMovementKeys() {
    activeKeysRef.current.forEach((movementKey) => {
      sendMovementKey(movementKey, "keyup");
    });

    activeKeysRef.current.clear();
    stopRepeatMovementKeys();
  }

  function preventTouchDefaults(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function renderMobileMoveButton(
    movementKey: MovementKey,
    label: string,
    className = ""
  ) {
    return (
      <button
        type="button"
        aria-label={label}
        onPointerDown={(event) => {
          preventTouchDefaults(event);
          event.currentTarget.setPointerCapture(event.pointerId);
          pressMovementKey(movementKey);
        }}
        onPointerUp={(event) => {
          preventTouchDefaults(event);
          releaseMovementKey(movementKey);
        }}
        onPointerCancel={(event) => {
          preventTouchDefaults(event);
          releaseMovementKey(movementKey);
        }}
        onPointerLeave={(event) => {
          preventTouchDefaults(event);
          releaseMovementKey(movementKey);
        }}
        className={`pointer-events-auto flex h-14 w-14 touch-none select-none items-center justify-center rounded-2xl border border-[rgba(197,151,94,0.5)] bg-[rgba(8,7,5,0.78)] text-2xl font-semibold text-[var(--museum-ivory)] shadow-2xl backdrop-blur-md active:bg-[rgba(197,151,94,0.78)] active:text-[var(--museum-black)] ${className}`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="w-full">
      {isMobileViewer && mode === "visitor" && (
        <div className="mb-4 rounded-[1.5rem] border border-[rgba(197,151,94,0.42)] bg-[rgba(168,121,69,0.1)] p-4">
          <p className="museum-label">Visita da smartphone</p>

          <h3 className="mt-2 font-editorial text-3xl font-medium text-[var(--museum-ivory)]">
            Ruota il telefono e apri a schermo intero.
          </h3>

          <p className="mt-3 text-sm leading-6 text-[var(--museum-stone)]">
            Usa le frecce touch per muoverti nello spazio. Trascina il dito
            dentro il viewer per orientare la visuale. Per una visita migliore,
            ruota il dispositivo in orizzontale.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openFullscreen}
              className="museum-button-primary px-5 py-2.5"
            >
              Apri a schermo intero
            </button>

            <a href="#catalogo" className="museum-button-secondary px-5 py-2.5">
              Vai al catalogo
            </a>
          </div>
        </div>
      )}

      <div
  ref={viewerShellRef}
  tabIndex={-1}
  className="overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-black shadow-[var(--museum-shadow-soft)]"
>
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--museum-border)] bg-[rgba(8,7,5,0.94)] px-5 py-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-editorial text-2xl font-medium text-[var(--museum-ivory)]">
                {getViewerTitle(mode)}
              </p>

              <span className="museum-pill rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
                3D
              </span>

              {isMobileViewer && mode === "visitor" && (
                <span className="rounded-full border border-[rgba(197,151,94,0.42)] bg-[rgba(168,121,69,0.1)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--museum-bronze-light)]">
                  Touch
                </span>
              )}
            </div>

            <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--museum-stone-muted)]">
              {getViewerDescription(mode)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reloadIframe}
              className="museum-button-secondary h-9 px-4 text-xs"
            >
              Ricarica
            </button>

            <button
              type="button"
              onClick={openFullscreen}
              className="museum-button-primary h-9 px-4 text-xs"
            >
              Schermo intero
            </button>
          </div>
        </div>

        <div className="relative">
          {isMobileViewer && mode === "visitor" && (
            <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-2xl border border-[rgba(8,7,5,0.72)] bg-[rgba(8,7,5,0.78)] px-4 py-3 text-xs leading-5 text-[var(--museum-ivory-soft)] backdrop-blur-md">
              Frecce touch per muoverti · trascina nel viewer per guardarti
              intorno
            </div>
          )}

          <iframe
            ref={iframeRef}
            key={iframeVersion}
            src={iframeSrc}
            title={`3D gallery viewer ${galleryId}`}
            className="block h-[72vh] w-full bg-black"
            allow="fullscreen; gamepad; xr-spatial-tracking; clipboard-read; clipboard-write"
            allowFullScreen
          />

          {isMobileViewer && mode === "visitor" && (
            <div
              className="pointer-events-auto absolute bottom-5 left-5 z-[100] grid touch-none grid-cols-3 gap-2"
              onPointerLeave={releaseAllMovementKeys}
              onPointerCancel={releaseAllMovementKeys}
            >
              <div />
              {renderMobileMoveButton("KeyW", "↑")}
              <div />

              {renderMobileMoveButton("KeyA", "←")}
              {renderMobileMoveButton("KeyS", "↓")}
              {renderMobileMoveButton("KeyD", "→")}
            </div>
          )}
        </div>
      </div>

      <div className="museum-card mt-4 grid gap-3 rounded-[1.75rem] p-4 text-sm md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-[var(--museum-ivory-soft)]">
            {mode === "editor"
              ? "Ambiente editor isolato"
              : "Ambiente visitor isolato"}
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--museum-stone-muted)]">
            {isMobileViewer
              ? getMobileControls(mode)
              : getDesktopControls(mode)}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] px-4 py-3 text-xs leading-5 text-[var(--museum-stone-muted)]">
          {mode === "editor" ? (
            <>
              <p className="text-[var(--museum-ivory-soft)]">
                Promemoria editor
              </p>
              <p>Usa Salva opera, Salva tutto o attendi l’autosave.</p>
            </>
          ) : (
            <>
              <p className="text-[var(--museum-ivory-soft)]">
                Accesso alternativo
              </p>
              <p>Se lo spazio 3D non parte, consulta il catalogo opere sotto.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}