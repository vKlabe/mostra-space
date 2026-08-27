"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import T from "@/components/i18n/T";

const SHOW_AFTER_MS = 150 * 1000;
const CLOSED_SUPPRESSION_MS = 7 * 24 * 60 * 60 * 1000;

const CLOSED_STORAGE_KEY = "mostra-space:guest-signup-nudge:closed-at";
const SESSION_SHOWN_KEY = "mostra-space:guest-signup-nudge:shown-this-session";

const EXCLUDED_PATH_PREFIXES = [
  "/dashboard",
  "/admin",
  "/auth",
  "/account",
  "/api",
  "/legal",
  "/unity-frame",
  "/checkout",
  "/billing",
];

function isBrowserStorageAvailable(storage: Storage | undefined) {
  if (!storage) {
    return false;
  }

  try {
    const testKey = "mostra-space:storage-test";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function getStoredNumber(storage: Storage, key: string) {
  const rawValue = storage.getItem(key);

  if (!rawValue) {
    return 0;
  }

  const numericValue = Number(rawValue);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

export default function GuestSignupNudge() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isExcludedPath = useMemo(() => {
    const currentPath = pathname || "/";

    return EXCLUDED_PATH_PREFIXES.some((prefix) => {
      return currentPath === prefix || currentPath.startsWith(`${prefix}/`);
    });
  }, [pathname]);

  useEffect(() => {
    if (isExcludedPath) {
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function prepareNudge() {
      const localStorageAvailable = isBrowserStorageAvailable(window.localStorage);
      const sessionStorageAvailable = isBrowserStorageAvailable(
        window.sessionStorage
      );

      if (localStorageAvailable) {
        const closedAt = getStoredNumber(window.localStorage, CLOSED_STORAGE_KEY);

        if (closedAt && Date.now() - closedAt < CLOSED_SUPPRESSION_MS) {
          return;
        }
      }

      if (
        sessionStorageAvailable &&
        window.sessionStorage.getItem(SESSION_SHOWN_KEY) === "1"
      ) {
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled || user) {
          return;
        }
      } catch {
        return;
      }

      timer = setTimeout(() => {
        if (cancelled) {
          return;
        }

        if (sessionStorageAvailable) {
          window.sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
        }

        setIsOpen(true);
      }, SHOW_AFTER_MS);
    }

    void prepareNudge();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isExcludedPath]);

  function closeForAWeek() {
    if (isBrowserStorageAvailable(window.localStorage)) {
      window.localStorage.setItem(CLOSED_STORAGE_KEY, String(Date.now()));
    }

    setIsOpen(false);
  }

  function markAsHandledThisSession() {
    if (isBrowserStorageAvailable(window.sessionStorage)) {
      window.sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
    }
  }

  if (!isOpen || isExcludedPath) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[999] flex justify-center sm:inset-x-auto sm:right-5 sm:justify-end">
      <section className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-[var(--museum-border)] bg-[rgba(18,16,13,0.96)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <button
          type="button"
          onClick={closeForAWeek}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--museum-border)] text-sm text-[var(--museum-stone-muted)] transition hover:border-[var(--museum-bronze)] hover:text-[var(--museum-ivory)]"
          aria-label="Chiudi"
        >
          ×
        </button>

        <p className="museum-label pr-10">
          <T
            textKey="guestSignupNudge.label"
            fallback="Community mostra.space"
          />
        </p>

        <h2 className="mt-4 pr-8 font-editorial text-3xl font-medium leading-tight text-[var(--museum-ivory)]">
          <T
            textKey="guestSignupNudge.title"
            fallback="Entra a far parte della nostra community!"
          />
        </h2>

        <p className="mt-4 text-sm leading-7 text-[var(--museum-stone)]">
          <T
            textKey="guestSignupNudge.description"
            fallback="Stai visitando mostra.space. Con un account gratuito puoi caricare le tue opere, scegliere uno spazio espositivo digitale e pubblicare la tua prima galleria online."
          />
        </p>

        <ul className="mt-5 grid gap-2 text-sm text-[var(--museum-ivory-soft)]">
          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[rgba(127,175,123,0.45)] text-xs text-[var(--museum-success)]">
              ✓
            </span>
            <T
              textKey="guestSignupNudge.bullets.freeSignup"
              fallback="Iscrizione gratuita"
            />
          </li>

          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[rgba(127,175,123,0.45)] text-xs text-[var(--museum-success)]">
              ✓
            </span>
            <T
              textKey="guestSignupNudge.bullets.firstGallery"
              fallback="Prima galleria inclusa"
            />
          </li>

          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[rgba(127,175,123,0.45)] text-xs text-[var(--museum-success)]">
              ✓
            </span>
            <T
              textKey="guestSignupNudge.bullets.publicLink"
              fallback="Link pubblico condivisibile"
            />
          </li>
        </ul>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/register"
            onClick={markAsHandledThisSession}
            className="museum-button-primary justify-center px-5 py-3 text-center"
          >
            <T
              textKey="guestSignupNudge.actions.register"
              fallback="Registrati gratis"
            />
          </Link>

          <button
            type="button"
            onClick={closeForAWeek}
            className="museum-button-secondary px-5 py-3"
          >
            <T
              textKey="guestSignupNudge.actions.continue"
              fallback="Continua la visita"
            />
          </button>
        </div>
      </section>
    </div>
  );
}
