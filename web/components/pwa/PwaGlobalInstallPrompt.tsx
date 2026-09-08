"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { usePwaInstall } from "@/components/pwa/PwaInstallProvider";
import type { Messages } from "@/lib/i18n/dictionaries";

const DISMISSED_STORAGE_KEY = "mostra-space:pwa-global-prompt:dismissed-at";
const DISMISSED_FOR_MS = 7 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 800;

function getDismissedAt() {
  try {
    const value = Number(window.localStorage.getItem(DISMISSED_STORAGE_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function rememberDismissal() {
  try {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, String(Date.now()));
  } catch {
    // The prompt can still be dismissed for the current page view.
  }
}

function isInAppBrowser() {
  return /FBAN|FBAV|Instagram|LinkedInApp|Line\/|TikTok|Twitter/i.test(
    navigator.userAgent
  );
}

export default function PwaGlobalInstallPrompt() {
  const { t } = useLanguage();
  const {
    canPromptInstall,
    isInstalled,
    isIos,
    isReady,
    promptInstall,
  } = usePwaInstall();
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [hasInstallError, setHasInstallError] = useState(false);

  const translate = (key: keyof Messages, fallback: string) =>
    t(key, fallback);
  const inAppBrowser = isReady ? isInAppBrowser() : false;

  const dismissForAWeek = useCallback(() => {
    rememberDismissal();
    setIsOpen(false);
    setHasInstallError(false);
  }, []);

  useEffect(() => {
    if (!isReady || isInstalled) {
      return;
    }

    const dismissedAt = getDismissedAt();

    if (dismissedAt && Date.now() - dismissedAt < DISMISSED_FOR_MS) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, SHOW_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isInstalled, isReady]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismissForAWeek();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [dismissForAWeek, isOpen]);

  async function handleInstall() {
    if (!canPromptInstall || isInstalling) {
      return;
    }

    setIsInstalling(true);
    setHasInstallError(false);

    const outcome = await promptInstall();

    setIsInstalling(false);

    if (outcome === "accepted") {
      setIsOpen(false);
      return;
    }

    if (outcome === "dismissed") {
      dismissForAWeek();
      return;
    }

    setHasInstallError(true);
  }

  if (!isOpen || !isReady || isInstalled) {
    return null;
  }

  const canOpenNativePrompt =
    canPromptInstall && !isIos && !inAppBrowser;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          dismissForAWeek();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-global-install-title"
        aria-describedby="pwa-global-install-description"
        className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-[var(--museum-border)] bg-[var(--museum-surface)] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.65)] sm:p-7"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(197,151,94,0.18),transparent_70%)]" />

        <button
          type="button"
          onClick={dismissForAWeek}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--museum-border)] text-xl text-[var(--museum-stone)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)]"
          aria-label={translate(
            "pwa.install.prompt.close",
            "Chiudi l’invito all’installazione"
          )}
        >
          ×
        </button>

        <div className="relative flex items-start gap-4 pr-12">
          <Image
            src="/pwa/icon-192x192.png"
            alt=""
            width={64}
            height={64}
            className="h-14 w-14 shrink-0 rounded-2xl border border-[var(--museum-border)] sm:h-16 sm:w-16"
          />

          <div>
            <p className="museum-label">
              {translate("pwa.install.prompt.label", "App Mostra.Space")}
            </p>
            <h2
              id="pwa-global-install-title"
              className="mt-2 font-editorial text-3xl font-medium leading-tight text-[var(--museum-ivory)] sm:text-4xl"
            >
              {translate(
                "pwa.install.title",
                "Mostra.Space sul tuo dispositivo"
              )}
            </h2>
          </div>
        </div>

        <p
          id="pwa-global-install-description"
          className="relative mt-5 text-sm leading-7 text-[var(--museum-stone)]"
        >
          {translate(
            "pwa.install.prompt.description",
            "Installa Mostra.Space per un accesso più rapido, un’esperienza a schermo intero e la possibilità di ricevere notifiche sul tuo dispositivo."
          )}
        </p>

        <p className="relative mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--museum-bronze-light)]">
          {translate(
            "pwa.install.prompt.benefits",
            "Accesso rapido · Schermo intero · Notifiche facoltative"
          )}
        </p>

        {inAppBrowser && (
          <div className="relative mt-5 rounded-2xl border border-[var(--museum-border)] bg-black/25 p-4">
            <p className="text-sm font-medium text-[var(--museum-ivory-soft)]">
              {translate(
                "pwa.install.prompt.inAppTitle",
                "Apri nel browser del telefono"
              )}
            </p>
            <p className="mt-2 text-xs leading-6 text-[var(--museum-stone)]">
              {translate(
                "pwa.install.prompt.inAppDescription",
                "Il browser interno di questa app non consente l’installazione. Dal menu scegli Apri in Safari o Apri in Chrome, quindi installa Mostra.Space."
              )}
            </p>
          </div>
        )}

        {!inAppBrowser && isIos && (
          <div className="relative mt-5 rounded-2xl border border-[var(--museum-border)] bg-black/25 p-4">
            <p className="text-sm font-medium text-[var(--museum-ivory-soft)]">
              {translate(
                "pwa.install.ios.title",
                "Installazione su iPhone e iPad"
              )}
            </p>
            <ol className="mt-3 space-y-2 text-xs leading-6 text-[var(--museum-stone)]">
              <li>
                <span className="mr-2 text-[var(--museum-bronze-light)]">1.</span>
                {translate(
                  "pwa.install.ios.step1",
                  "Apri Mostra.Space con Safari."
                )}
              </li>
              <li>
                <span className="mr-2 text-[var(--museum-bronze-light)]">2.</span>
                {translate(
                  "pwa.install.ios.step2",
                  "Tocca il pulsante Condividi."
                )}
              </li>
              <li>
                <span className="mr-2 text-[var(--museum-bronze-light)]">3.</span>
                {translate(
                  "pwa.install.ios.step3",
                  "Scegli Aggiungi alla schermata Home e conferma."
                )}
              </li>
            </ol>
          </div>
        )}

        {!inAppBrowser && !isIos && !canPromptInstall && (
          <div className="relative mt-5 rounded-2xl border border-[var(--museum-border)] bg-black/25 p-4">
            <p className="text-sm font-medium text-[var(--museum-ivory-soft)]">
              {translate(
                "pwa.install.prompt.browserTitle",
                "Installa dal menu del browser"
              )}
            </p>
            <p className="mt-2 text-xs leading-6 text-[var(--museum-stone)]">
              {translate(
                "pwa.install.prompt.browserDescription",
                "Apri il menu del browser e scegli Installa app oppure Aggiungi alla schermata Home."
              )}
            </p>
          </div>
        )}

        {hasInstallError && (
          <p className="relative mt-4 text-sm text-[var(--museum-danger)]">
            {translate(
              "pwa.install.feedback.error",
              "Il comando di installazione non è disponibile in questo momento."
            )}
          </p>
        )}

        <div className="relative mt-6 flex flex-col gap-3 sm:flex-row">
          {canOpenNativePrompt && (
            <button
              type="button"
              onClick={() => void handleInstall()}
              disabled={isInstalling}
              className="museum-button-primary flex-1 px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isInstalling
                ? translate(
                    "pwa.install.installing",
                    "Apertura installazione..."
                  )
                : translate(
                    "pwa.install.action",
                    "Installa Mostra.Space"
                  )}
            </button>
          )}

          <button
            type="button"
            onClick={dismissForAWeek}
            className="museum-button-secondary flex-1 px-6 py-3"
          >
            {translate("pwa.install.prompt.notNow", "Non ora")}
          </button>
        </div>
      </section>
    </div>
  );
}
