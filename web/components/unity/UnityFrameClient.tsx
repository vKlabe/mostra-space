"use client";

import { useEffect, useRef, useState } from "react";

type UnityMode = "visitor" | "editor";

type UnityFrameClientProps = {
  galleryId: string;
  mode: UnityMode;
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

export default function UnityFrameClient({
  galleryId,
  mode,
  buildPath = "/unity/artportal-viewer/Build",
  buildName = "artportal-viewer",
}: UnityFrameClientProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const unityInstanceRef = useRef<UnityInstance | null>(null);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Preparazione viewer...");
  const [errorMessage, setErrorMessage] = useState("");

  function sendLaunchConfig() {
    if (!unityInstanceRef.current) {
      setStatusMessage("Unity non e ancora pronto.");
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

    setStatusMessage(`Configurazione inviata a Unity: ${mode}`);
  }

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      setErrorMessage("Canvas Unity non disponibile.");
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

    async function startUnity() {
      if (!window.createUnityInstance) {
        setErrorMessage("createUnityInstance non disponibile.");
        return;
      }

      try {
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
        setStatusMessage("Unity pronto.");

        setTimeout(() => {
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
      };

      document.body.appendChild(script);
    }

    return () => {
      disposed = true;

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
    <main className="h-screen w-screen overflow-hidden bg-black text-white">
      <canvas
        ref={canvasRef}
        id="unity-canvas"
        className="block h-full w-full bg-black"
        tabIndex={0}
      />

      <div className="pointer-events-none fixed bottom-4 left-4 z-20 rounded-2xl bg-black/70 px-4 py-3 text-xs leading-5 text-white backdrop-blur">
        <p>{statusMessage}</p>

        {!isReady && !errorMessage && (
          <p className="text-white/60">
            Caricamento: {Math.round(loadingProgress * 100)}%
          </p>
        )}

        {errorMessage && <p className="text-red-300">{errorMessage}</p>}

        <p className="mt-1 text-white/50">Mode: {mode}</p>
      </div>
    </main>
  );
}