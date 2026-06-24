import LogoutButton from "@/components/auth/LogoutButton";

type AdminShellProps = {
  title: string;
  subtitle?: string;
  activeSection?:
    | "overview"
    | "users"
    | "galleries"
    | "inquiries"
    | "templates"
    | "storage";
  children: React.ReactNode;
};

const navItems = [
  {
    label: "Overview",
    href: "/admin",
    key: "overview",
  },
  {
    label: "Utenti",
    href: "/admin/utenti",
    key: "users",
  },
  {
    label: "Gallerie",
    href: "/admin/gallerie",
    key: "galleries",
  },
  {
    label: "Richieste",
    href: "/admin/richieste",
    key: "inquiries",
  },
  {
    label: "Template",
    href: "/admin/template",
    key: "templates",
  },
  {
    label: "Storage",
    href: "/admin/storage",
    key: "storage",
  },
  {
  label: "Billing",
  href: "/admin/billing",
  key: "billing",
}
] as const;

export default function AdminShell({
  title,
  subtitle,
  activeSection = "overview",
  children,
}: AdminShellProps) {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-neutral-800 bg-neutral-950 px-5 py-5 lg:border-b-0 lg:border-r">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-400">
              Admin
            </p>

            <h1 className="mt-3 text-2xl font-semibold">MOSTRA.SPACE</h1>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Pannello amministratore per gestione piattaforma.
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const isActive = item.key === activeSection;

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={
                    isActive
                      ? "flex rounded-2xl bg-white px-4 py-3 text-sm font-medium text-neutral-950"
                      : "flex rounded-2xl border border-transparent px-4 py-3 text-sm text-neutral-400 transition hover:border-neutral-800 hover:bg-neutral-900 hover:text-neutral-100"
                  }
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="mt-8 space-y-3">
            <a
              href="/dashboard"
              className="flex rounded-2xl border border-neutral-800 px-4 py-3 text-sm text-neutral-300 transition hover:border-neutral-600 hover:text-white"
            >
              Dashboard utente
            </a>

            <a
              href="/gallerie"
              target="_blank"
              rel="noreferrer"
              className="flex rounded-2xl border border-neutral-800 px-4 py-3 text-sm text-neutral-300 transition hover:border-neutral-600 hover:text-white"
            >
              Sito pubblico
            </a>

            <LogoutButton />
          </div>
        </aside>

        <section className="px-5 py-8 lg:px-8">
          <header className="flex flex-col justify-between gap-5 border-b border-neutral-800 pb-8 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.35em] text-neutral-500">
                Control room
              </p>

              <h2 className="text-4xl font-semibold leading-tight">
                {title}
              </h2>

              {subtitle && (
                <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-400">
                  {subtitle}
                </p>
              )}
            </div>

            <a
              href="/pricing"
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Vedi piani
            </a>
          </header>

          <div className="py-8">{children}</div>
        </section>
      </div>
    </main>
  );
}