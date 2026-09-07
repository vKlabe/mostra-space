"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import T from "@/components/i18n/T";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  {
    href: "/eventi",
    labelKey: "site.header.navigation.events",
    labelFallback: "Eventi",
  },
  {
    href: "/gallerie",
    labelKey: "site.header.navigation.galleries",
    labelFallback: "Gallerie",
  },
  {
    href: "/marketplace",
    labelKey: "site.header.navigation.marketplace",
    labelFallback: "Marketplace",
  },
  {
    href: "/pricing",
    labelKey: "site.header.navigation.pricing",
    labelFallback: "Prezzi",
  },
  {
    href: "/legal",
    labelKey: "site.header.navigation.legal",
    labelFallback: "Legal",
  },
];

export default function MuseumHeader() {
  const [accountName, setAccountName] = useState<string | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadAccountName() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (!user) {
        setAccountName(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) {
        return;
      }

      const metadataDisplayName =
        typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name.trim()
          : "";
      const metadataFullName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name.trim()
          : "";

      setAccountName(
        profile?.display_name?.trim() ||
          profile?.full_name?.trim() ||
          metadataDisplayName ||
          metadataFullName ||
          "Dashboard",
      );
    }

    void loadAccountName();

    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--museum-border)] bg-[rgba(8,7,5,0.88)] px-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6">
        <Link
          href="/"
          className="museum-logo text-3xl leading-none text-[var(--museum-ivory)] transition hover:text-[var(--museum-bronze-light)]"
          aria-label="Mostra.space homepage"
        >
          mostra<span className="text-[var(--museum-bronze-light)]">.</span>
          <span className="text-[var(--museum-ivory-soft)]">space</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.href + item.labelFallback}
              href={item.href}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--museum-ivory-soft)] transition hover:text-[var(--museum-bronze-light)]"
            >
              <T
                textKey={item.labelKey}
                fallback={item.labelFallback}
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>

          {accountName === undefined ? (
            <div aria-hidden="true" className="h-10 w-28" />
          ) : accountName ? (
            <Link
              href="/dashboard"
              title={accountName}
              className="museum-button-secondary inline-flex max-w-56 items-center px-5 py-2.5"
            >
              <span className="truncate">{accountName}</span>
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-[var(--museum-ivory-soft)] transition hover:text-[var(--museum-bronze-light)] sm:inline-flex"
              >
                <T textKey="site.header.actions.login" fallback="Accedi" />
              </Link>

              <Link
                href="/auth/register"
                className="museum-button-secondary px-5 py-2.5"
              >
                <T textKey="site.header.actions.register" fallback="Registrati" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}