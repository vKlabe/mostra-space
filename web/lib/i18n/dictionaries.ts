import it from "@/messages/it.json";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import es from "@/messages/es.json";

export const locales = ["it", "en", "fr", "es"] as const;

export type Locale = (typeof locales)[number];

export type Messages = typeof it;

export const dictionaries: Record<Locale, Messages> = {
  it,
  en,
  fr,
  es,
};

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && locales.includes(value as Locale));
}

export function getDictionary(locale: string | null | undefined) {
  if (isLocale(locale)) {
    return dictionaries[locale];
  }

  return dictionaries.it;
}

export function translate(
  messages: Messages,
  key: keyof Messages,
  fallback?: string
) {
  return messages[key] || fallback || key;
}