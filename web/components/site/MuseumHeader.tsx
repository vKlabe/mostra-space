"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import T from "@/components/i18n/T";
import { usePublicUxCopy } from "@/components/public/PublicUxText";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/premiomostraspace", labelKey: "premio.navMenu", labelFallback: "Premio Mostra.Space" },
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
    href: "/profili",
    labelKey: "profiles.hero.title",
    labelFallback: "Profili pubblici",
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
  const pathname = usePathname();
  const { menu, navigation, profiles } = usePublicUxCopy();
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  function renderNavigation(mobile: boolean) {
    return navLinks.map((item) => {
      const isCurrent = pathname === item.href || pathname.startsWith(item.href + "/");
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isCurrent ? (pathname === item.href ? "page" : "location") : undefined}
          onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
          className={
            (mobile
              ? "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium "
              : "inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-wide ") +
            (isCurrent
              ? "text-[var(--museum-bronze-light)] underline underline-offset-4"
              : "text-[var(--museum-ivory-soft)] transition hover:text-[var(--museum-bronze-light)]")
          }
        >
          {item.href === "/profili" ? profiles : (
            <T textKey={item.labelKey} fallback={item.labelFallback} />
          )}
        </Link>
      );
    });
  }

  const header = (
    <header
      className="sticky top-0 z-50 border-b border-[var(--museum-border)] bg-[rgba(8,7,5,0.88)] px-4 backdrop-blur-xl md:px-8"
      onKeyDown={(event) => {
        if (event.key === "Escape" && mobileMenuOpen) {
          setMobileMenuOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 py-2 xl:min-h-20 xl:gap-4">
        <Link
          href="/"
          className="museum-logo shrink-0 text-2xl leading-none text-[var(--museum-ivory)] transition hover:text-[var(--museum-bronze-light)] sm:text-3xl"
          aria-current={pathname === "/" ? "page" : undefined}
        >
          mostra<span className="text-[var(--museum-bronze-light)]">.</span>
          <span className="text-[var(--museum-ivory-soft)]">space</span>
        </Link>

        <nav aria-label={navigation} className="hidden items-center gap-3 xl:flex 2xl:gap-5">
          {renderNavigation(false)}
        </nav>

        <div className="flex min-w-0 items-center gap-2 xl:gap-3">
          <div className="hidden xl:block">
            <LanguageSwitcher />
          </div>

          {accountName === undefined ? (
            <div aria-hidden="true" className="hidden h-10 w-24 xl:block" />
          ) : accountName ? (
            <Link
              href="/dashboard"
              title={accountName}
              className="museum-button-secondary inline-flex min-h-11 min-w-0 max-w-36 items-center px-3 py-2 sm:max-w-48"
            >
              <span className="truncate">{accountName}</span>
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden min-h-11 items-center text-xs font-semibold uppercase tracking-wide text-[var(--museum-ivory-soft)] transition hover:text-[var(--museum-bronze-light)] xl:inline-flex"
              >
                <T textKey="site.header.actions.login" fallback="Accedi" />
              </Link>

              <Link
                href="/auth/register"
                className="museum-button-secondary min-h-11 px-3 py-2"
              >
                <T textKey="site.header.actions.register" fallback="Registrati" />
              </Link>
            </>
          )}
          <div className="shrink-0 xl:hidden">
            <button
              ref={menuButton}
              type="button"
              aria-expanded={mobileMenuOpen}
              aria-controls={menuId}
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="museum-button-secondary min-h-11 gap-2 px-3 py-2"
            >
              <span aria-hidden="true">{mobileMenuOpen ? "×" : "☰"}</span>
              {menu}
            </button>
          </div>
        </div>
      </div>
      <div id={menuId} hidden={!mobileMenuOpen} className="mx-auto max-h-[70dvh] max-w-7xl overflow-y-auto overscroll-contain border-t border-[var(--museum-border)] pb-4 xl:hidden">
        <nav aria-label={navigation} className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-2">
          {renderNavigation(true)}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--museum-border)] pt-3">
          <LanguageSwitcher />
          {accountName === null && (
            <Link
              href="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className="museum-button-secondary min-h-11 px-4 py-2"
            >
              <T textKey="site.header.actions.login" fallback="Accedi" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );

  return (
    <>
      {header}
      <div id="main-content" tabIndex={-1} className="scroll-mt-20" />
    </>
  );
}
