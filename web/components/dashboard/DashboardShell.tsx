import LogoutButton from "@/components/auth/LogoutButton";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import T from "@/components/i18n/T";
import Link from "next/link";

type DashboardShellProps = {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  activeSection?:
    | "dashboard"
    | "social"
    | "analytics"
    | "gallerie"
    | "opere"
    | "richieste"
    | "help"
    | "account";
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

const communityNavItems: NavItem[] = [
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

  return (
    <main className="museum-app-layout min-h-screen">
      <aside className="museum-sidebar fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col overflow-y-auto px-5 py-6">
        <div>
          <Link
            href="/dashboard"
            className="museum-logo text-3xl leading-none text-[var(--museum-ivory)] transition hover:text-[var(--museum-bronze-light)]"
          >
            mostra
            <span className="text-[var(--museum-bronze-light)]">.</span>
            <span className="text-[var(--museum-ivory-soft)]">space</span>
          </Link>

          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-[var(--museum-bronze-light)]">
            <T textKey="dashboard.shell.sidebar.account" fallback="Account" />
          </p>

          <p className="mt-3 text-sm leading-6 text-[var(--museum-stone)]">
            <T
              textKey="dashboard.shell.sidebar.description"
              fallback="Gestisci community, profilo, strumenti creator e contenuti del tuo spazio."
            />
          </p>
        </div>

        <nav className="mt-8 space-y-2">
          {visibleNavItems.map((item) => {
            const isActive = activeSection === item.section;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "museum-sidebar-link museum-sidebar-link-active rounded-2xl px-4 py-3 text-sm"
                    : "museum-sidebar-link rounded-2xl px-4 py-3 text-sm"
                }
              >
                <span className="block text-sm font-medium">
                  <T textKey={item.labelKey} fallback={item.labelFallback} />
                </span>

                <span
                  className={
                    isActive
                      ? "mt-1 block text-xs text-[var(--museum-bronze-light)]/75"
                      : "mt-1 block text-xs text-[var(--museum-stone-muted)]"
                  }
                >
                  <T
                    textKey={item.descriptionKey}
                    fallback={item.descriptionFallback}
                  />
                </span>
              </Link>
            );
          })}
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
              className="museum-button-secondary px-4 py-2"
            >
              <T textKey="dashboard.shell.public.events" fallback="Eventi" />
            </Link>
          </div>
        </div>
      </aside>

      <div className="min-h-screen min-w-0 pl-72">
        <header className="museum-topbar sticky top-0 z-30 px-5 py-4 lg:px-8">
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
              <div className="flex flex-wrap gap-2 lg:hidden">
                {visibleNavItems.map((item) => {
                  const isActive = activeSection === item.section;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={
                        isActive
                          ? "rounded-full border border-[var(--museum-bronze-light)] bg-[var(--museum-bronze)] px-4 py-2 text-xs font-medium text-[var(--museum-black)]"
                          : "rounded-full border border-[var(--museum-border)] px-4 py-2 text-xs text-[var(--museum-stone)]"
                      }
                    >
                      <T textKey={item.labelKey} fallback={item.labelFallback} />
                    </Link>
                  );
                })}
              </div>

              {actions}

              <LogoutButton />
            </div>
          </div>
        </header>

        <section className="flex-1 px-5 py-8 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </section>
      </div>
    </main>
  );
}