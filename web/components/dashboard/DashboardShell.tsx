"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import T from "@/components/i18n/T";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DashboardNotificationCenter from "@/components/dashboard/DashboardNotificationCenter";
import DashboardMessagesDock from "@/components/dashboard/DashboardMessagesDock";
import WorkspaceText from "@/components/dashboard/WorkspaceText";

type DashboardShellProps = {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  activeSection?:
    | "premio"
    | "dashboard"
    | "social"
    | "analytics"
    | "gallerie"
    | "eventi"
    | "opere"
    | "richieste"
    | "help"
    | "account"
    | "vendite"
    | "acquisti";
  navMode?: "community" | "creator";
  actions?: React.ReactNode;
};

type Section = NonNullable<DashboardShellProps["activeSection"]>;
type NavigationSection = Section | "home";

type NavItem = { href: string; label: ReactNode };

const SIDEBAR_STORAGE_KEY = "mostraspace:dashboard-sidebar-collapsed";

const navItems: Record<NavigationSection, NavItem> = {
  home: { href: "/home", label: <WorkspaceText label="home" /> },
  dashboard: { href: "/dashboard", label: <T textKey="dashboard.shell.creatorNav.dashboard.label" fallback="Dashboard" /> },
  premio: { href: "/dashboard/premiomostraspace", label: <T textKey="premio.navMenu" fallback="Premio Mostra.Space" /> },
  gallerie: { href: "/dashboard/gallerie", label: <T textKey="dashboard.shell.creatorNav.galleries.label" fallback="Gallerie" /> },
  opere: { href: "/dashboard/opere", label: <T textKey="dashboard.shell.creatorNav.artworks.label" fallback="Opere" /> },
  eventi: { href: "/dashboard/eventi", label: <T textKey="dashboard.events.shell.title" fallback="Eventi" /> },
  richieste: { href: "/dashboard/richieste", label: <T textKey="dashboard.shell.creatorNav.inquiries.label" fallback="Richieste" /> },
  analytics: { href: "/dashboard/analytics", label: <T textKey="dashboard.shell.creatorNav.analytics.label" fallback="Analytics" /> },
  vendite: { href: "/dashboard/vendite", label: <T textKey="commerce.sales" fallback="Vendita opere" /> },
  social: { href: "/dashboard/social", label: <T textKey="dashboard.shell.creatorNav.social.label" fallback="Social" /> },
  account: { href: "/account", label: <T textKey="dashboard.shell.communityNav.account.description" fallback="Profilo e impostazioni" /> },
  acquisti: { href: "/account/acquisti", label: <T textKey="commerce.purchases" fallback="I miei acquisti" /> },
  help: { href: "/dashboard/help", label: <T textKey="dashboard.shell.creatorNav.help.label" fallback="Guida & FAQ" /> },
};

const navGroups: ReadonlyArray<{
  label: ComponentProps<typeof WorkspaceText>["label"];
  sections: readonly Section[];
  creatorOnly?: boolean;
}> = [
  { label: "workspace", sections: ["gallerie", "opere", "eventi", "richieste", "analytics", "vendite"], creatorOnly: true },
  { label: "connections", sections: ["social"] },
  { label: "account", sections: ["account", "acquisti", "help"] },
];

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M5 7h14" />
      <path d="M5 12h14" />
      <path d="M5 17h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M14.5 6.5 9 12l5.5 5.5" />
      <path d="M19 5v14" />
    </svg>
  );
}

export default function DashboardShell({
  children,
  title,
  subtitle,
  eyebrow = (
    <T
      textKey="dashboard.shell.header.defaultEyebrow"
      fallback="Dashboard account"
    />
  ),
  activeSection = "dashboard",
  navMode = "creator",
  actions,
}: DashboardShellProps) {
  const pathname = usePathname();
  const visibleGroups = navGroups.filter((group) => !group.creatorOnly || navMode === "creator");
  const openGroup = visibleGroups.find((group) => group.sections.includes(activeSection)) ?? visibleGroups[0];

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);
  const [hasLoadedSidebarPreference, setHasLoadedSidebarPreference] =
    useState(false);
  const mobileMenuButton = useRef<HTMLButtonElement>(null);
  const mobileCloseButton = useRef<HTMLButtonElement>(null);
  const desktopMenuButton = useRef<HTMLButtonElement>(null);
  const desktopCollapseButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
    try {
      const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      setIsDesktopSidebarCollapsed(storedValue === "true");
    } catch {
      // Se localStorage non è disponibile, manteniamo la sidebar desktop aperta.
    } finally {
      setHasLoadedSidebarPreference(true);
    }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!hasLoadedSidebarPreference) {
      return;
    }

    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        String(isDesktopSidebarCollapsed)
      );
    } catch {
      // La preferenza non è essenziale: la UI continua a funzionare senza storage.
    }
  }, [hasLoadedSidebarPreference, isDesktopSidebarCollapsed]);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;

    const desktop = window.matchMedia("(min-width: 64rem)");
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileCloseButton.current?.focus();

    function handleViewportChange(event: MediaQueryListEvent) {
      if (!event.matches) return;
      setIsMobileSidebarOpen(false);
      window.requestAnimationFrame(() => {
        (desktopMenuButton.current ?? desktopCollapseButton.current)?.focus();
      });
    }

    function handleMenuKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        setIsMobileSidebarOpen(false);
        window.requestAnimationFrame(() => mobileMenuButton.current?.focus());
      }
      if (event.key !== "Tab" || event.defaultPrevented) return;

      const controls = Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), summary, select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => {
        const closedGroup = element.closest("details:not([open])");
        return element.getClientRects().length > 0 && (!closedGroup || closedGroup.firstElementChild === element);
      });
      const first = controls[0];
      const last = controls.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    desktop.addEventListener("change", handleViewportChange);
    window.addEventListener("keydown", handleMenuKeyboard);

    return () => {
      document.body.style.overflow = originalOverflow;
      desktop.removeEventListener("change", handleViewportChange);
      window.removeEventListener("keydown", handleMenuKeyboard);
    };
  }, [isMobileSidebarOpen]);

  function closeMobileSidebar() {
    if (!isMobileSidebarOpen) return;
    setIsMobileSidebarOpen(false);
    window.requestAnimationFrame(() => mobileMenuButton.current?.focus());
  }

  function changeDesktopSidebar(collapsed: boolean) {
    setIsDesktopSidebarCollapsed(collapsed);
    window.requestAnimationFrame(() => {
      (collapsed ? desktopMenuButton : desktopCollapseButton).current?.focus();
    });
  }

  function renderNavLink(section: NavigationSection) {
    const { href, label } = navItems[section];
    const isActive = section === activeSection;

    return (
      <Link
        href={href}
        prefetch={section === "eventi" ? false : undefined}
        onClick={closeMobileSidebar}
        aria-current={isActive ? (pathname === href ? "page" : "location") : undefined}
        className={`museum-sidebar-link min-h-11 rounded-xl px-3 py-2 text-sm font-medium ${isActive ? "museum-sidebar-link-active" : ""}`}
      >
        {label}
      </Link>
    );
  }

  return (
    <main className="museum-app-layout min-h-screen">
      {isMobileSidebarOpen && (
        <button
          type="button"
          onClick={closeMobileSidebar}
          tabIndex={-1}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/65 backdrop-blur-[1px] lg:hidden"
        >
          <span className="sr-only">
            <T
              textKey="dashboard.shell.sidebar.closeBackdrop"
              fallback="Chiudi menu dashboard"
            />
          </span>
        </button>
      )}

      <button
        ref={mobileMenuButton}
        type="button"
        onClick={() => setIsMobileSidebarOpen(true)}
        aria-controls="dashboard-sidebar"
        aria-expanded={isMobileSidebarOpen}
        className={`fixed left-4 top-4 z-50 h-11 w-11 items-center justify-center rounded-full border border-[var(--museum-border)] bg-[var(--museum-black)] text-[var(--museum-ivory)] shadow-lg transition hover:border-[var(--museum-bronze-light)] hover:text-[var(--museum-bronze-light)] lg:hidden ${isMobileSidebarOpen ? "hidden" : "inline-flex"}`}
      >
        <MenuIcon />
        <span className="sr-only">
          <T
            textKey="dashboard.shell.sidebar.openMobile"
            fallback="Apri menu dashboard"
          />
        </span>
      </button>

      {isDesktopSidebarCollapsed && (
        <button
          ref={desktopMenuButton}
          type="button"
          onClick={() => changeDesktopSidebar(false)}
          aria-controls="dashboard-sidebar"
          aria-expanded="false"
          className="fixed left-4 top-4 z-50 hidden h-11 w-11 items-center justify-center rounded-full border border-[var(--museum-border)] bg-[var(--museum-black)] text-[var(--museum-ivory)] shadow-lg transition hover:border-[var(--museum-bronze-light)] hover:text-[var(--museum-bronze-light)] lg:inline-flex"
        >
          <MenuIcon />
          <span className="sr-only">
            <T
              textKey="dashboard.shell.sidebar.expandDesktop"
              fallback="Mostra menu dashboard"
            />
          </span>
        </button>
      )}

      <aside
        ref={sidebar}
        id="dashboard-sidebar"
        role={isMobileSidebarOpen ? "dialog" : undefined}
        aria-modal={isMobileSidebarOpen ? true : undefined}
        aria-labelledby="dashboard-sidebar-title"
        className={`museum-sidebar fixed inset-y-0 left-0 z-40 flex w-72 max-w-[calc(100vw-3rem)] shrink-0 flex-col overflow-y-auto overscroll-contain px-4 py-6 shadow-2xl transition-transform duration-300 ease-out [scrollbar-color:var(--museum-border)_transparent] [scrollbar-width:thin] motion-reduce:transition-none lg:shadow-none ${
          isMobileSidebarOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        } ${
          isDesktopSidebarCollapsed
            ? "lg:invisible lg:-translate-x-full"
            : "lg:visible lg:translate-x-0"
        }`}
      >
        <button
          ref={mobileCloseButton}
          type="button"
          onClick={closeMobileSidebar}
          className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--museum-border)] text-[var(--museum-stone)] transition hover:border-[var(--museum-bronze-light)] hover:text-[var(--museum-ivory)] lg:hidden"
        >
          <CloseIcon />
          <span className="sr-only">
            <T
              textKey="dashboard.shell.sidebar.closeMobile"
              fallback="Chiudi menu dashboard"
            />
          </span>
        </button>

        <button
          ref={desktopCollapseButton}
          type="button"
          onClick={() => changeDesktopSidebar(true)}
          aria-controls="dashboard-sidebar"
          aria-expanded={true}
          className="absolute right-4 top-4 hidden h-9 w-9 items-center justify-center rounded-full border border-[var(--museum-border)] text-[var(--museum-stone)] transition hover:border-[var(--museum-bronze-light)] hover:text-[var(--museum-ivory)] lg:inline-flex"
        >
          <CollapseIcon />
          <span className="sr-only">
            <T
              textKey="dashboard.shell.sidebar.collapseDesktop"
              fallback="Nascondi menu dashboard"
            />
          </span>
        </button>

        <div className="pr-11">
          <Link
            href="/home"
            onClick={closeMobileSidebar}
            className="museum-logo inline-flex min-h-11 items-center rounded text-3xl leading-none text-[var(--museum-ivory)] transition hover:text-[var(--museum-bronze-light)]"
          >
            mostra
            <span className="text-[var(--museum-bronze-light)]">.</span>
            <span className="text-[var(--museum-ivory-soft)]">space</span>
          </Link>

          <p id="dashboard-sidebar-title" className="sr-only">
            <T textKey="dashboard.shell.creatorNav.dashboard.label" fallback="Dashboard" />
          </p>
        </div>

        <nav aria-labelledby="dashboard-sidebar-title" className="mt-5 space-y-2">
          {renderNavLink("home")}
          {renderNavLink("dashboard")}
          {renderNavLink("premio")}
          {visibleGroups.map((group) => (
            <details
              key={`${activeSection}-${group.label}`}
              open={group === openGroup}
              className="group/dashboard-section rounded-xl border border-[var(--museum-border)] bg-[var(--museum-charcoal)]"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--museum-ivory-soft)] hover:bg-[var(--museum-surface)] hover:text-[var(--museum-ivory)] [&::-webkit-details-marker]:hidden">
                <WorkspaceText label={group.label} />
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-4 shrink-0 text-[var(--museum-bronze-light)] transition-transform group-open/dashboard-section:rotate-180 motion-reduce:transition-none">
                  <path d="m5 8 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <ul className="space-y-0.5 border-t border-[var(--museum-border)] p-1.5">
                {group.sections.map((section) => <li key={section}>{renderNavLink(section)}</li>)}
              </ul>
            </details>
          ))}
        </nav>

        <div className="mt-5 space-y-3 border-t border-[var(--museum-border)] pt-3">
          <div className="space-y-0.5">
            <Link href="/gallerie" onClick={closeMobileSidebar} className="museum-sidebar-link min-h-11 rounded-xl px-3 py-2 text-sm">
              <T textKey="galleries.experience.publicGalleries" fallback="Gallerie pubbliche" />
            </Link>
            <Link href="/eventi" prefetch={false} onClick={closeMobileSidebar} className="museum-sidebar-link min-h-11 rounded-xl px-3 py-2 text-sm">
              <T textKey="account.notifications.actions.publicEvents" fallback="Eventi pubblici" />
            </Link>
          </div>
          <div className="flex justify-center [&_button]:min-h-11 [&_button]:min-w-11">
            <LanguageSwitcher />
          </div>
        </div>
      </aside>

      <div
        inert={isMobileSidebarOpen || undefined}
        className={`min-h-screen min-w-0 transition-[padding] duration-300 ease-out motion-reduce:transition-none ${
          isDesktopSidebarCollapsed ? "lg:pl-0" : "lg:pl-72"
        }`}
      >
        <header
          className={`museum-topbar sticky top-0 z-30 py-4 pr-5 pl-20 transition-[padding] duration-300 motion-reduce:transition-none lg:pr-8 ${
            isDesktopSidebarCollapsed ? "lg:pl-20" : "lg:pl-8"
          }`}
        >
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="museum-label mb-2">{eyebrow}</p>

              <h1 className="font-editorial text-3xl font-medium text-[var(--museum-ivory)] md:text-4xl">
                {title}
              </h1>

              {subtitle && (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--museum-stone)]">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {actions}

              <DashboardNotificationCenter />

              <LogoutButton />
            </div>
          </div>
        </header>

        <section id="main-content" tabIndex={-1} className="flex-1 scroll-mt-36 px-5 py-8 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </section>
      </div>

      {!isMobileSidebarOpen && <DashboardMessagesDock />}
    </main>
  );
}
