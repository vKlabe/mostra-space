import LogoutButton from "@/components/auth/LogoutButton";
import Link from "next/link";

type DashboardShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  activeSection?:
    | "dashboard"
    | "social"
    | "gallerie"
    | "opere"
    | "richieste"
    | "account";
  navMode?: "community" | "creator";
  actions?: React.ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  section: DashboardShellProps["activeSection"];
  description: string;
};

const communityNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    section: "dashboard",
    description: "Spazio community",
  },
  {
    label: "Social",
    href: "/dashboard/social",
    section: "social",
    description: "Follow, preferiti, eventi",
  },
  {
    label: "Account",
    href: "/account",
    section: "account",
    description: "Profilo e impostazioni",
  },
];

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    section: "dashboard",
    description: "Panoramica generale",
  },
  {
    label: "Social",
    href: "/dashboard/social",
    section: "social",
    description: "Community e attività",
  },
  {
    label: "Gallerie",
    href: "/dashboard/gallerie",
    section: "gallerie",
    description: "Spazi espositivi",
  },
  {
    label: "Opere",
    href: "/dashboard/opere",
    section: "opere",
    description: "Archivio opere",
  },
  {
    label: "Richieste",
    href: "/dashboard/richieste",
    section: "richieste",
    description: "Richieste e contatti",
  },
  {
    label: "Account",
    href: "/account",
    section: "account",
    description: "Profilo e piano",
  },
];

export default function DashboardShell({
  children,
  title,
  subtitle,
  eyebrow = "Dashboard account",
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
            Account
          </p>

          <p className="mt-3 text-sm leading-6 text-[var(--museum-stone)]">
            Gestisci community, profilo, strumenti creator e contenuti del tuo
            spazio.
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
                <span className="block text-sm font-medium">{item.label}</span>

                <span
                  className={
                    isActive
                      ? "mt-1 block text-xs text-[var(--museum-bronze-light)]/75"
                      : "mt-1 block text-xs text-[var(--museum-stone-muted)]"
                  }
                >
                  {item.description}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="museum-dashboard-card mt-8 rounded-[1.5rem] p-5">
          <p className="museum-label">Pubblico</p>

          <p className="mt-3 text-sm leading-6 text-[var(--museum-stone)]">
            Controlla come appaiono gallerie, profili ed eventi ai visitatori.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/gallerie"
              target="_blank"
              rel="noreferrer"
              className="museum-button-secondary px-4 py-2"
            >
              Gallerie
            </Link>

            <Link
              href="/eventi"
              target="_blank"
              rel="noreferrer"
              className="museum-button-secondary px-4 py-2"
            >
              Eventi
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
                      {item.label}
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
