"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type InstallOutcome = "accepted" | "dismissed" | "unavailable" | "error";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const INSTALLED_STORAGE_KEY = "mostra-space:pwa-installed";
const INSTALLED_STATE_EVENT = "mostra-space:pwa-install-state";

type PwaInstallContextValue = {
  canPromptInstall: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isReady: boolean;
  promptInstall: () => Promise<InstallOutcome>;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function getIsStandalone() {
  const navigatorWithStandalone = navigator as NavigatorWithStandalone;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function getIsIos() {
  const classicIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const ipadWithDesktopUserAgent =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return classicIosDevice || ipadWithDesktopUserAgent;
}

function subscribeToStandaloneMode(onStoreChange: () => void) {
  const displayModeQuery = window.matchMedia("(display-mode: standalone)");

  displayModeQuery.addEventListener("change", onStoreChange);

  return () => {
    displayModeQuery.removeEventListener("change", onStoreChange);
  };
}

function subscribeToHydration() {
  return () => undefined;
}

function getStoredInstallState() {
  try {
    return window.localStorage.getItem(INSTALLED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeToStoredInstallState(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(INSTALLED_STATE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(INSTALLED_STATE_EVENT, onStoreChange);
  };
}

function storeInstalledState() {
  try {
    window.localStorage.setItem(INSTALLED_STORAGE_KEY, "1");
    window.dispatchEvent(new Event(INSTALLED_STATE_EVENT));
  } catch {
    // Installation still works when private storage is unavailable.
  }
}

export default function PwaInstallProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const isStandalone = useSyncExternalStore(
    subscribeToStandaloneMode,
    getIsStandalone,
    () => false
  );
  const isReady = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  );
  const installedFromStoredState = useSyncExternalStore(
    subscribeToStoredInstallState,
    getStoredInstallState,
    () => false
  );
  const isInstalled = isStandalone || installedFromStoredState;
  const isIos = isReady ? getIsIos() : false;

  useEffect(() => {
    if (isStandalone) {
      storeInstalledState();
    }
  }, [isStandalone]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      if (!getIsStandalone()) {
        setDeferredPrompt(event as BeforeInstallPromptEvent);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      storeInstalledState();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferredPrompt || isInstalled) {
      return "unavailable";
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      setDeferredPrompt(null);

      return choice.outcome;
    } catch {
      setDeferredPrompt(null);
      return "error";
    }
  }, [deferredPrompt, isInstalled]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      canPromptInstall: Boolean(deferredPrompt) && !isInstalled,
      isInstalled,
      isIos,
      isReady,
      promptInstall,
    }),
    [deferredPrompt, isInstalled, isIos, isReady, promptInstall]
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);

  if (!context) {
    throw new Error("usePwaInstall must be used inside PwaInstallProvider");
  }

  return context;
}
