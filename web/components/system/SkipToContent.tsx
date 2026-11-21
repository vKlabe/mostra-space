"use client";

import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const labels = {
  it: "Vai al contenuto principale",
  en: "Skip to main content",
  fr: "Aller au contenu principal",
  es: "Ir al contenido principal",
};

export default function SkipToContent() {
  const pathname = usePathname();
  const { locale } = useLanguage();
  if (pathname === "/unity-frame") return null;

  return (
    <a
      href="#main-content"
      className="museum-skip-link"
      onClick={(event) => {
        const content = document.querySelector<HTMLElement>("#main-content") ??
          document.querySelector<HTMLElement>("main, [role='main']");
        if (!content) return;
        event.preventDefault();
        if (!content.hasAttribute("tabindex")) content.tabIndex = -1;
        content.focus({ preventScroll: true });
        content.scrollIntoView({ block: "start" });
      }}
    >
      {labels[locale]}
    </a>
  );
}
