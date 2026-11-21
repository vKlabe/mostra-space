"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import T from "@/components/i18n/T";
import Link from "next/link";
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

type NavItem = {
  labelKey: string;
  labelFallback: string;
  href: string;
  section: DashboardShellProps["activeSection"];
  descriptionKey: string;
  descriptionFallback: string;
};

const SIDEBAR_STORAGE_KEY = "mostraspace:dashboard-sidebar-collapsed";

const purchaseNav: NavItem = { labelKey: "commerce.purchases", labelFallback: "I miei acquisti", href: "/account/acquisti", section: "acquisti", descriptionKey: "commerce.purchasesDescription", descriptionFallback: "Ordini e consegne" };

const communityNavItems: NavItem[] = [
  purchaseNav,
  { labelKey: "premio.navMenu", labelFallback: "Premio Mostra.Space", href: "/dashboard/premiomostraspace", section: "premio", descriptionKey: "premio.navDescription", descriptionFallback: "La tua candidatura" },
  {
    labelKey: "dashboard.shell.communityNav.dashboard.label",
    labelFallback: "Dashboard",
    href: "/dashboard",
    section: "dashboard",
    descriptionKey: "dashboard.shell.communityNav.dashboard.description",
    descriptionFallback: "Spazio community",
  },
  {
    labelKey: "dashboard.shell.communityNav.social.label",
    labelFallback: "Social",
    href: "/dashboard/social",
    section: "social",
    descriptionKey: "dashboard.shell.communityNav.social.description",
    descriptionFallback: "Follow, preferiti, eventi",
  },
  {
    labelKey: "dashboard.shell.communityNav.help.label",
    labelFallback: "Guida & FAQ",
    href: "/dashboard/help",
    section: "help",
    descriptionKey: "dashboard.shell.communityNav.help.description",
    descriptionFallback: "Tutorial e risposte rapide",
  },
  {
    labelKey: "dashboard.shell.communityNav.account.label",
    labelFallback: "Account",
    href: "/account",
    section: "account",
    descriptionKey: "dashboard.shell.communityNav.account.description",
    descriptionFallback: "Profilo e impostazioni",
  },
];

const navItems: NavItem[] = [
  { labelKey: "commerce.sales", labelFallback: "Vendita opere", href: "/dashboard/vendite", section: "vendite", descriptionKey: "commerce.salesDescription", descriptionFallback: "Vendite e rimborsi" },
  purchaseNav,
  { labelKey: "premio.navMenu", labelFallback: "Premio Mostra.Space", href: "/dashboard/premiomostraspace", section: "premio", descriptionKey: "premio.navDescription", descriptionFallback: "La tua candidatura" },
  {
    labelKey: "dashboard.shell.creatorNav.dashboard.label",
    labelFallback: "Dashboard",
    href: "/dashboard",
    section: "dashboard",
    descriptionKey: "dashboard.shell.creatorNav.dashboard.description",
    descriptionFallback: "Panoramica generale",
  },
  {
    labelKey: "dashboard.shell.creatorNav.social.label",
    labelFallback: "Social",
    href: "/dashboard/social",
    section: "social",
    descriptionKey: "dashboard.shell.creatorNav.social.description",
    descriptionFallback: "Community e attività",
  },
  {
    labelKey: "dashboard.shell.creatorNav.galleries.label",
    labelFallback: "Gallerie",
    href: "/dashboard/gallerie",
    section: "gallerie",
    descriptionKey: "dashboard.shell.creatorNav.galleries.description",
    descriptionFallback: "Spazi espositivi",
  },
  {
    labelKey: "dashboard.shell.creatorNav.artworks.label",
    labelFallback: "Opere",
    href: "/dashboard/opere",
    section: "opere",
    descriptionKey: "dashboard.shell.creatorNav.artworks.description",
    descriptionFallback: "Archivio opere",
  },
  {
    labelKey: "dashboard.events.shell.title",
    labelFallback: "Eventi",
    href: "/dashboard/eventi",
    section: "eventi",
    descriptionKey: "dashboard.events.active.title",
    descriptionFallback: "Prossimi eventi",
  },
  {
    labelKey: "dashboard.shell.creatorNav.analytics.label",
    labelFallback: "Analytics",
    href: "/dashboard/analytics",
    section: "analytics",
    descriptionKey: "dashboard.shell.creatorNav.analytics.description",
    descriptionFallback: "Visite, salvataggi, richieste",
  },
  {
    labelKey: "dashboard.shell.creatorNav.inquiries.label",
    labelFallback: "Richieste",
    href: "/dashboard/richieste",
    section: "richieste",
    descriptionKey: "dashboard.shell.creatorNav.inquiries.description",
    descriptionFallback: "Richieste e contatti",
  },
  {
    labelKey: "dashboard.shell.creatorNav.help.label",
    labelFallback: "Guida & FAQ",
    href: "/dashboard/help",
    section: "help",
    descriptionKey: "dashboard.shell.creatorNav.help.description",
    descriptionFallback: "Tutorial e risposte rapide",
  },
  {
    labelKey: "dashboard.shell.creatorNav.account.label",
    labelFallback: "Account",
    href: "/account",
    section: "account",
    descriptionKey: "dashboard.shell.creatorNav.account.description",
    descriptionFallback: "Profilo e piano",
  },
];

const navGroups = [
  { label: "workspace", sections: ["dashboard", "gallerie", "opere", "eventi", "richieste", "analytics"] },
  { label: "connections", sections: ["social", "premio", "vendite", "acquisti"] },
  { label: "account", sections: ["account", "help"] },
] as const satisfies ReadonlyArray<{
  label: ComponentProps<typeof WorkspaceText>["label"];
  sections: ReadonlyArray<NonNullable<NavItem["section"]>>;
}>;

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
  const visibleNavItems =
    navMode === "community" ? communityNavItems : navItems;

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
          'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => element.getClientRects().length > 0);
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
        className={`museum-sidebar fixed inset-y-0 left-0 z-40 flex w-72 max-w-[calc(100vw-3rem)] shrink-0 flex-col overflow-y-auto overscroll-contain px-5 py-6 shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none lg:shadow-none ${
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
            href="/dashboard"
            onClick={closeMobileSidebar}
            className="museum-logo text-3xl leading-none text-[var(--museum-ivory)] transition hover:text-[var(--museum-bronze-light)]"
          >
            mostra
            <span className="text-[var(--museum-bronze-light)]">.</span>
            <span className="text-[var(--museum-ivory-soft)]">space</span>
          </Link>

          <p id="dashboard-sidebar-title" className="sr-only">
            <T textKey="dashboard.shell.sidebar.account" fallback="Account" />
          </p>

          <p className="mt-3 text-sm leading-6 text-[var(--museum-stone)]">
            <T
              textKey="dashboard.shell.sidebar.description"
              fallback="Gestisci community, profilo, strumenti creator e contenuti del tuo spazio."
            />
          </p>
        </div>

        <nav aria-labelledby="dashboard-sidebar-title" className="mt-7 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 pb-1 text-xs font-medium text-[var(--museum-stone)]">
                <WorkspaceText label={group.label} />
              </p>
              {group.sections.map((section) => {
                const item = visibleNavItems.find((link) => link.section === section);
                if (!item) return null;
                const isActive = activeSection === item.section;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileSidebar}
                    aria-current={isActive ? "page" : undefined}
                    className={`museum-sidebar-link min-h-11 rounded-xl px-3 py-2.5 text-sm ${isActive ? "museum-sidebar-link-active" : ""}`}
                  >
                    <span className="block text-sm font-medium">
                      <T textKey={item.labelKey} fallback={item.labelFallback} />
                    </span>
                    <span className={`mt-1 block text-xs ${isActive ? "text-[var(--museum-bronze-light)]" : "text-[var(--museum-stone)]"}`}>
                      <T textKey={item.descriptionKey} fallback={item.descriptionFallback} />
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-8 flex justify-center">
          <LanguageSwitcher />
        </div>

        <div className="museum-dashboard-card mt-4 rounded-[1.5rem] p-5">
          <p className="museum-label">
            <T textKey="dashboard.shell.public.label" fallback="Pubblico" />
          </p>

          <p className="mt-3 text-sm leading-6 text-[var(--museum-stone)]">
            <T
              textKey="dashboard.shell.public.description"
              fallback="Controlla come appaiono gallerie, profili ed eventi ai visitatori."
            />
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/gallerie"
              target="_blank"
              rel="noreferrer"
              onClick={closeMobileSidebar}
              className="museum-button-secondary px-4 py-2"
            >
              <T
                textKey="dashboard.shell.public.galleries"
                fallback="Gallerie"
              />
            </Link>

            <Link
              href="/eventi"
              target="_blank"
              rel="noreferrer"
              onClick={closeMobileSidebar}
              className="museum-button-secondary px-4 py-2"
            >
              <T textKey="dashboard.shell.public.events" fallback="Eventi" />
            </Link>
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
