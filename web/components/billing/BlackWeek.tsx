"use client";

import Link from "next/link";
import { type ReactNode, useId, useSyncExternalStore } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  BLACK_WEEK_ANNOUNCE_AT,
  BLACK_WEEK_END_AT,
  BLACK_WEEK_MONTHS,
  BLACK_WEEK_OFFERS,
  BLACK_WEEK_START_AT,
  getBlackWeekPhase,
  type BlackWeekPlan,
} from "@/lib/black-week";

const phaseBoundaries = [
  BLACK_WEEK_ANNOUNCE_AT,
  BLACK_WEEK_START_AT,
  BLACK_WEEK_END_AT,
];
const listeners = new Set<() => void>();
let timer: number | undefined;

function refreshPhase() {
  window.clearTimeout(timer);
  const now = Date.now();
  const next = phaseBoundaries.find((boundary) => boundary > now);
  if (next !== undefined) {
    timer = window.setTimeout(refreshPhase, Math.min(next - now, 2_147_483_647));
  }
  for (const listener of listeners) {
    listener();
  }
}

function subscribeToPhase(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("focus", refreshPhase);
    window.addEventListener("pageshow", refreshPhase);
    document.addEventListener("visibilitychange", refreshPhase);
    refreshPhase();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refreshPhase);
      window.removeEventListener("pageshow", refreshPhase);
      document.removeEventListener("visibilitychange", refreshPhase);
    }
  };
}

function getServerPhase() {
  // Keep cached HTML independent of the promotion's current phase.
  return "inactive" as const;
}

function useBlackWeekPhase() {
  return useSyncExternalStore(subscribeToPhase, getBlackWeekPhase, getServerPhase);
}

function formatPrice(locale: string, cents: number) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function BlackWeekBanner({
  className = "mx-auto max-w-7xl px-4 pt-4 md:px-8",
  plansHref = "/pricing",
}: {
  className?: string;
  plansHref?: string;
}) {
  const headingId = useId();
  const phase = useBlackWeekPhase();
  const { locale, t } = useLanguage();
  if (phase === "inactive") return null;

  return (
    <div className={className}>
      <section
        aria-labelledby={headingId}
        className="rounded-2xl border border-[var(--museum-bronze-dark)] bg-[linear-gradient(120deg,var(--museum-panel),var(--museum-black))] p-5 shadow-[var(--museum-shadow-soft)] sm:px-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div>
            <h2 id={headingId} className="museum-label">
              Black Week Mostra.Space
            </h2>
            <p className="mt-2 text-sm text-[var(--museum-ivory)]">
              {t(phase === "announcing" ? "blackWeek.announcement" : "blackWeek.active")}
            </p>
          </div>
          <Link href={plansHref} className="museum-button-secondary px-4 py-2">
            {t("blackWeek.cta")}
          </Link>
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["pro", "business"] as const).map((plan) => {
            const offer = BLACK_WEEK_OFFERS[plan];
            return (
              <li key={plan} className="border-l border-[var(--museum-bronze-dark)] pl-3">
                <p className="text-sm text-[var(--museum-ivory)]">
                  <span className="font-semibold uppercase">{plan}</span>{" "}
                  <span className="font-editorial text-2xl text-[var(--museum-bronze-light)]">
                    {formatPrice(locale, offer.offerCents)}
                  </span>{" "}
                  {t("blackWeek.monthlyFor").replace("{months}", String(BLACK_WEEK_MONTHS))}
                </p>
                <p className="text-xs text-[var(--museum-stone)]">
                  {t("blackWeek.thenRegular").replace("{price}", formatPrice(locale, offer.regularCents))}
                </p>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs leading-5 text-[var(--museum-stone)]">
          {t("blackWeek.eligibility")}
        </p>
      </section>
    </div>
  );
}

export function BlackWeekPlanPrice({
  plan,
  children,
}: {
  plan?: BlackWeekPlan;
  children: ReactNode;
}) {
  const phase = useBlackWeekPhase();
  const { locale, t } = useLanguage();
  if (!plan || phase !== "active") return children;

  const offer = BLACK_WEEK_OFFERS[plan];
  return (
    <>
      <span className="text-[var(--museum-bronze-light)]">
        {formatPrice(locale, offer.offerCents)}
      </span>
      <span className="mt-1 block font-ui text-sm leading-normal text-[var(--museum-ivory-soft)]">
        {t("blackWeek.monthlyFor").replace("{months}", String(BLACK_WEEK_MONTHS))}
      </span>
      <span className="mt-1 block font-ui text-xs leading-normal text-[var(--museum-stone)]">
        {t("blackWeek.thenRegular").replace("{price}", formatPrice(locale, offer.regularCents))}
      </span>
    </>
  );
}
