"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  dictionaries,
  getDictionary,
  isLocale,
  Locale,
  Messages,
} from "@/lib/i18n/dictionaries";

type LanguageContextValue = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
  t: (key: keyof Messages, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "mostra-space-locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "it";
  }

  const storedLocale = window.localStorage.getItem(STORAGE_KEY);

  if (isLocale(storedLocale)) {
    return storedLocale;
  }

  const browserLocale = window.navigator.language?.slice(0, 2);

  if (isLocale(browserLocale)) {
    return browserLocale;
  }

  return "it";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("it");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setLocaleState(getInitialLocale());
    setIsReady(true);
  }, []);

  function setLocale(nextLocale: Locale) {
    setLocaleState(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;
  }

  const value = useMemo<LanguageContextValue>(() => {
    const messages = getDictionary(locale);

    return {
      locale,
      messages,
      setLocale,
      t: (key, fallback) => messages[key] || fallback || key,
    };
  }, [locale]);

  useEffect(() => {
    if (isReady) {
      document.documentElement.lang = locale;
    }
  }, [isReady, locale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    return {
      locale: "it" as Locale,
      messages: dictionaries.it,
      setLocale: () => undefined,
      t: (key: keyof Messages, fallback?: string) =>
        dictionaries.it[key] || fallback || key,
    };
  }

  return context;
}