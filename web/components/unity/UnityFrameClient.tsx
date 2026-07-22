"use client";

import { useEffect, useRef, useState } from "react";
import T from "@/components/i18n/T";
import GallerySoundtrackPlayer, {
  type GallerySoundtrack,
} from "@/components/gallery/GallerySoundtrackPlayer";

type UnityMode = "visitor" | "editor";

type UnityFrameClientProps = {
  galleryId: string;
  mode: UnityMode;
  soundtrack?: GallerySoundtrack | null;
  buildPath?: string;
  buildName?: string;
};

type UnityConfig = {
  dataUrl: string;
  frameworkUrl: string;
  codeUrl: string;
  streamingAssetsUrl: string;
  companyName: string;
  productName: string;
  productVersion: string;
};

type UnityInstance = {
  SendMessage: (
    gameObjectName: string,
    methodName: string,
    value?: string
  ) => void;
  Quit: () => Promise<void>;
};

declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: UnityConfig,
      onProgress?: (progress: number) => void
    ) => Promise<UnityInstance>;

    WebGLInput?: {
      captureAllKeyboardInput: boolean;
    };
  }
}

function getModeLabel(mode: UnityMode) {
  return mode === "editor" ? (
    <T textKey="gallery.unityFrame.mode.editorLabel" fallback="Editor 3D" />
  ) : (
    <T textKey="gallery.unityFrame.mode.visitorLabel" fallback="Visita 3D" />
  );
}

function getModeDescription(mode: UnityMode) {
  if (mode === "editor") {
    return (
      <T
        textKey="gallery.unityFrame.mode.editorDescription"
        fallback="Caricamento dell’editor di allestimento. Potrai trascinare opere, modificare cornici, dimensioni e salvare le modifiche."
      />
    );
  }

  return (
    <T
      textKey="gallery.unityFrame.mode.visitorDescription"
      fallback="Caricamento della galleria virtuale. Potrai muoverti nello spazio, osservare le opere e aprire le schede informative."
    />
  );
}

function getModeControls(mode: UnityMode) {
  if (mode === "editor") {
    return (
      <T
        textKey="gallery.unityFrame.mode.editorControls"
        fallback="Editor: WASD movimento · Q/E rotazione · R/F quota · mouse libero per UI e drag"
      />
    );
  }

  return (
    <T
      textKey="gallery.unityFrame.mode.visitorControls"
      fallback="Visitor: click per entrare · WASD movimento · mouse visuale · Shift corsa · ESC libera mouse · SPACE menu"
    />
  );
}

function isWebGlAvailable() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");

    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export default function UnityFrameClient({
  galleryId,
  mode,
  soundtrack = null,
  buildPath = "/unity/artportal-viewer/Build",
  buildName = "artportal-viewer",
}: UnityFrameClientProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const unityInstanceRef = useRef<UnityInstance | null>(null);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasStartedLoading, setHasStartedLoading] = useState(false);
  const [isTakingLong, setIsTakingLong] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Preparazione viewer...");
  const [errorMessage, setErrorMessage] = useState("");

  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round(loadingProgress * 100))
  );

  function sendLaunchConfig() {
    if (!unityInstanceRef.current) {
      setStatusMessage("Unity non è ancora pronto.");
      return;
    }

    const origin = window.location.origin;

    const payload = JSON.stringify({
      galleryId,
      mode,
      apiBaseUrl: `${origin}/api/unity/galleries`,
      transformApiBaseUrl: `${origin}/api/unity/gallery-artworks`,
    });

    unityInstanceRef.current.SendMessage(
      "ArtPortal_WebBridge",
      "ConfigureFromJson",
      payload
    );

    setStatusMessage(`Configurazione mostra.space: ${mode}`);
  }

  function reloadFrame() {
    window.location.reload();
  }

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      setErrorMessage("Canvas Unity non disponibile.");
      return;
    }

    if (!isWebGlAvailable()) {
      setErrorMessage(
        "WebGL non sembra disponibile in questo browser. Prova con Chrome o Edge aggiornati."
      );
      setStatusMessage("WebGL non disponibile.");
      return;
    }

    const canvasElement: HTMLCanvasElement = canvas;
    let disposed = false;

    const loaderUrl = `${buildPath}/${buildName}.loader.js`;

    const config: UnityConfig = {
      dataUrl: `${buildPath}/${buildName}.data`,
      frameworkUrl: `${buildPath}/${buildName}.framework.js`,
      codeUrl: `${buildPath}/${buildName}.wasm`,
      streamingAssetsUrl: "StreamingAssets",
      companyName: "Barattolo XR Lab",
      productName: "ArtPortalImmersivo",
      productVersion: "0.1.0",
    };

    const longLoadTimer = window.setTimeout(() => {
      if (!disposed && !isReady) {
        setIsTakingLong(true);
      }
    }, 18000);

    async function startUnity() {
      if (!window.createUnityInstance) {
        setErrorMessage(
          "createUnityInstance non disponibile. Il loader Unity non è stato inizializzato correttamente."
        );
        setStatusMessage("Loader Unity non disponibile.");
        return;
      }

      try {
        setHasStartedLoading(true);
        setStatusMessage("Caricamento Unity WebGL...");

        if (window.WebGLInput) {
          window.WebGLInput.captureAllKeyboardInput = true;
        }

        const instance = await window.createUnityInstance(
          canvasElement,
          config,
          (progress) => {
            setLoadingProgress(progress);
          }
        );

        if (disposed) {
          await instance.Quit();
          return;
        }

        unityInstanceRef.current = instance;
        setIsReady(true);
        setIsTakingLong(false);
        setStatusMessage("Unity pronto.");

        window.setTimeout(() => {
          sendLaunchConfig();
        }, 500);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Errore sconosciuto.";

        setErrorMessage(message);
        setStatusMessage("Errore caricamento Unity.");
      }
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${loaderUrl}"]`
    );

    if (existingScript) {
      startUnity();
    } else {
      const script = document.createElement("script");
      script.src = loaderUrl;
      script.async = true;

      script.onload = () => {
        startUnity();
      };

      script.onerror = () => {
        setErrorMessage(`Impossibile caricare il loader Unity: ${loaderUrl}`);
        setStatusMessage("Errore loader Unity.");
      };

      document.body.appendChild(script);
    }

    return () => {
      disposed = true;
      window.clearTimeout(longLoadTimer);

      const currentInstance = unityInstanceRef.current;
      unityInstanceRef.current = null;

      if (currentInstance) {
        currentInstance.Quit().catch(() => {
          // Evitiamo errori rumorosi in fase di navigazione pagina.
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildPath, buildName]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    sendLaunchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryId, mode, isReady]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white">
      <canvas
        ref={canvasRef}
        id="unity-canvas"
        className={
          isReady
            ? "block h-full w-full bg-black opacity-100 transition-opacity duration-700"
            : "block h-full w-full bg-black opacity-40 transition-opacity duration-700"
        }
        tabIndex={0}
      />

      {isReady && mode === "visitor" && soundtrack && (
  <GallerySoundtrackPlayer
    soundtrack={soundtrack}
    className="fixed left-4 top-4 z-50 max-w-[calc(100vw-2rem)]"
  />
)}

      {!isReady && !errorMessage && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-neutral-800 bg-neutral-950/95 p-7 shadow-2xl">
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-neutral-500">
              {getModeLabel(mode)}
            </p>

            <h1 className="text-2xl font-semibold">
              <T
                textKey="gallery.unityFrame.loading.title"
                fallback="Caricamento esperienza immersiva"
              />
            </h1>

            <p className="mt-3 text-sm leading-6 text-neutral-400">
              {getModeDescription(mode)}
            </p>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
                <span>
                  {hasStartedLoading ? (
                    <T
                      textKey="gallery.unityFrame.loading.webglInitialization"
                      fallback="Download e inizializzazione WebGL"
                    />
                  ) : (
                    <T
                      textKey="gallery.unityFrame.loading.loaderPreparation"
                      fallback="Preparazione loader Unity"
                    />
                  )}
                </span>
                <span>{progressPercent}%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-neutral-500">
              {getModeControls(mode)}
            </p>

            {isTakingLong && (
              <div className="mt-5 rounded-2xl border border-yellow-900 bg-yellow-950/30 p-4 text-sm leading-6 text-yellow-100/90">
                <T
                  textKey="gallery.unityFrame.loading.longWait"
                  fallback="Il primo caricamento può richiedere qualche secondo, soprattutto dopo una nuova build o con connessioni lente. Se resta bloccato, ricarica la pagina."
                />
              </div>
            )}

            <p className="mt-5 break-all text-[11px] leading-5 text-neutral-600">
              GalleryId: {galleryId} · Mode: {mode}
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 px-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-red-900 bg-red-950/30 p-7 shadow-2xl">
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-red-300/70">
              <T
                textKey="gallery.unityFrame.error.label"
                fallback="Errore WebGL"
              />
            </p>

            <h1 className="text-2xl font-semibold text-white">
              <T
                textKey="gallery.unityFrame.error.title"
                fallback="Non riesco a caricare la galleria 3D"
              />
            </h1>

            <p className="mt-3 text-sm leading-6 text-red-100/80">
              {errorMessage}
            </p>

            <div className="mt-5 rounded-2xl border border-neutral-800 bg-black/30 p-4 text-sm leading-6 text-neutral-300">
              <T
                textKey="gallery.unityFrame.error.instructions"
                fallback="Prova a ricaricare la pagina. Se il problema continua, usa Chrome o Edge aggiornati e verifica che WebGL sia attivo nel browser."
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reloadFrame}
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                <T
                  textKey="gallery.unityFrame.actions.reload"
                  fallback="Ricarica viewer"
                />
              </button>

              <a
                href="/gallerie"
                className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
              >
                <T
                  textKey="gallery.unityFrame.actions.backToGalleries"
                  fallback="Torna alle gallerie"
                />
              </a>
            </div>

            <p className="mt-5 break-all text-[11px] leading-5 text-neutral-500">
              GalleryId: {galleryId} · Mode: {mode}
            </p>
          </div>
        </div>
      )}

      {isReady && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-20 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-xs leading-5 text-white shadow-xl backdrop-blur">
          <p>{statusMessage}</p>

          <p className="mt-1 text-white/50">
            {mode === "editor" ? (
              <T
                textKey="gallery.unityFrame.ready.editorStatus"
                fallback="Editor attivo · salva le modifiche prima di uscire"
              />
            ) : (
              <T
                textKey="gallery.unityFrame.ready.visitorStatus"
                fallback="Visitor attivo · click per entrare, ESC per uscire"
              />
            )}
          </p>
        </div>
      )}
    </main>
  );
}