"use client";

import { useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { usePwaInstall } from "@/components/pwa/PwaInstallProvider";
import type { Messages } from "@/lib/i18n/dictionaries";

type PanelMessage = "idle" | "accepted" | "dismissed" | "error";

export default function PwaInstallPanel() {
  const { t } = useLanguage();
  const {
    canPromptInstall,
    isInstalled,
    isIos,
    isReady,
    promptInstall,
  } = usePwaInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [panelMessage, setPanelMessage] = useState<PanelMessage>("idle");

  const translate = (key: keyof Messages, fallback: string) =>
    t(key, fallback);

  async function handleInstall() {
    setIsInstalling(true);
    setPanelMessage("idle");

    const outcome = await promptInstall();

    setIsInstalling(false);

    if (outcome === "accepted") {
      setPanelMessage("accepted");
      return;
    }

    if (outcome === "dismissed") {
      setPanelMessage("dismissed");
      return;
    }

    setPanelMessage("error");
  }

  return (
    <article className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 md:col-span-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="font-medium text-neutral-200">
            {translate(
              "pwa.install.title",
              "Mostra.Space sul tuo dispositivo"
            )}
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {isInstalled
              ? translate(
                  "pwa.install.installedDescription",
                  "Mostra.Space è installata su questo dispositivo."
                )
              : translate(
                  "pwa.install.description",
                  "Puoi aggiungere Mostra.Space alla schermata Home. L’installazione è facoltativa e non modifica il sito nel browser."
                )}
          </p>
        </div>

        {isReady && isInstalled && (
          <span className="inline-flex w-fit rounded-full border border-green-900 bg-green-950/40 px-4 py-2 text-sm text-green-300">
            {translate("pwa.install.installed", "Installata")}
          </span>
        )}

        {isReady && !isInstalled && canPromptInstall && (
          <button
            type="button"
            onClick={handleInstall}
            disabled={isInstalling}
            className="inline-flex w-fit rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:cursor-wait disabled:opacity-60"
          >
            {isInstalling
              ? translate("pwa.install.installing", "Apro installazione...")
              : translate("pwa.install.action", "Installa Mostra.Space")}
          </button>
        )}

        {isReady && !isInstalled && isIos && (
          <button
            type="button"
            onClick={() => setShowIosInstructions((current) => !current)}
            aria-expanded={showIosInstructions}
            className="inline-flex w-fit rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            {showIosInstructions
              ? translate("pwa.install.ios.hide", "Nascondi istruzioni")
              : translate("pwa.install.ios.show", "Come installarla")}
          </button>
        )}
      </div>

      {isReady && !isInstalled && isIos && showIosInstructions && (
        <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm leading-6 text-neutral-300">
          <p className="font-medium text-neutral-100">
            {translate(
              "pwa.install.ios.title",
              "Installazione su iPhone e iPad"
            )}
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-neutral-400">
            <li>
              {translate(
                "pwa.install.ios.step1",
                "Apri Mostra.Space con Safari."
              )}
            </li>
            <li>
              {translate(
                "pwa.install.ios.step2",
                "Tocca il pulsante Condividi."
              )}
            </li>
            <li>
              {translate(
                "pwa.install.ios.step3",
                "Scegli Aggiungi alla schermata Home e conferma."
              )}
            </li>
          </ol>
        </div>
      )}

      {panelMessage !== "idle" && (
        <p
          className={`mt-4 text-sm ${
            panelMessage === "error" ? "text-red-300" : "text-neutral-400"
          }`}
          role="status"
        >
          {panelMessage === "accepted" &&
            translate(
              "pwa.install.feedback.accepted",
              "Installazione avviata."
            )}
          {panelMessage === "dismissed" &&
            translate(
              "pwa.install.feedback.dismissed",
              "Installazione annullata. Potrai riprovare dal menu del browser."
            )}
          {panelMessage === "error" &&
            translate(
              "pwa.install.feedback.error",
              "Il comando di installazione non è disponibile in questo momento."
            )}
        </p>
      )}
    </article>
  );
}
