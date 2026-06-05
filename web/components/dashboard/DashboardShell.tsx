import LogoutButton from "@/components/auth/LogoutButton";

type DashboardShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  activeSection?:
    | "dashboard"
    | "gallerie"
    | "opere"
    | "richieste"
    | "account";
  actions?: React.ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  section: DashboardShellProps["activeSection"];
  description: string;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    section: "dashboard",
    description: "Panoramica generale",
  },
  {
    label: "Gallerie",
    href: "/dashboard/gallerie",
    section: "gallerie",
    description: "Spazi virtuali",
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
    description: "Lead e contatti",
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
  eyebrow = "Dashboard gallerista",
  activeSection = "dashboard",
  actions,
}: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-neutral-800 bg-neutral-950 px-5 py-6 lg:block">
          <div>
            <a href="/dashboard" className="block">
              <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
                Art Portal
              </p>

              <h1 className="mt-3 text-2xl font-semibold">
                Gallerista
              </h1>
            </a>

            <p className="mt-3 text-sm leading-6 text-neutral-500">
              Gestisci gallerie virtuali, opere, lead e viewer Unity WebGL.
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const isActive = activeSection === item.section;

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={
                    isActive
                      ? "block rounded-2xl border border-neutral-700 bg-white px-4 py-3 text-neutral-950"
                      : "block rounded-2xl border border-transparent px-4 py-3 text-neutral-300 transition hover:border-neutral-800 hover:bg-neutral-900 hover:text-white"
                  }
                >
                  <span className="block text-sm font-medium">
                    {item.label}
                  </span>

                  <span
                    className={
                      isActive
                        ? "mt-1 block text-xs text-neutral-600"
                        : "mt-1 block text-xs text-neutral-600"
                    }
                  >
                    {item.description}
                  </span>
                </a>
              );
            })}
          </nav>

          <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              Pubblico
            </p>

            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Controlla come appaiono le gallerie pubblicate ai visitatori.
            </p>

            <a
              href="/gallerie"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Elenco pubblico
            </a>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/90 px-5 py-4 backdrop-blur lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">
                  {eyebrow}
                </p>

                <h1 className="text-2xl font-semibold md:text-3xl">
                  {title}
                </h1>

                {subtitle && (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap gap-2 lg:hidden">
                  {navItems.map((item) => {
                    const isActive = activeSection === item.section;

                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        className={
                          isActive
                            ? "rounded-full bg-white px-4 py-2 text-xs font-medium text-neutral-950"
                            : "rounded-full border border-neutral-800 px-4 py-2 text-xs text-neutral-300"
                        }
                      >
                        {item.label}
                      </a>
                    );
                  })}
                </div>

                {actions}

                <LogoutButton />
              </div>
            </div>
          </header>

          <section className="flex-1 px-5 py-8 lg:px-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}