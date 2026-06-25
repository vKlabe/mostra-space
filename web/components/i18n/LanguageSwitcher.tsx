"use client";

import { locales, type Locale } from "@/lib/i18n/dictionaries";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const labels: Record<Locale, string> = {
  it: "IT",
  en: "EN",
  fr: "FR",
  es: "ES",
};

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="inline-flex rounded-full border border-neutral-800 bg-neutral-950 p-1">
      {locales.map((item) => {
        const isActive = item === locale;

        return (
          <button
            key={item}
            type="button"
            onClick={() => setLocale(item)}
            className={
              isActive
                ? "rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-950"
                : "rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:text-white"
            }
            aria-pressed={isActive}
          >
            {labels[item]}
          </button>
        );
      })}
    </div>
  );
}