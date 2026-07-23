import LogoutButton from "@/components/auth/LogoutButton";
import type { ReactNode } from "react";
import Link from "next/link";

type AdminShellProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  activeSection?:
    | "overview"
    | "users"
    | "galleries"
    | "inquiries"
    | "templates"
    | "soundtracks"
    | "live-guided-visits"
    | "events"
    | "storage"
    | "billing";
  children: ReactNode;
  actions?: ReactNode;
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
    label: "Musiche",
    href: "/admin/soundtracks",
    key: "soundtracks",
  },
  {
  label: "Live Visits",
  href: "/admin/live-guided-visits",
  key: "live-guided-visits",
},
{
  label: "Eventi",
  href: "/admin/events",
  key: "events",
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
  },
] as const;

export default function AdminShell({
  title,
  subtitle,
  activeSection = "overview",
  children,
}: AdminShellProps) {
  return (
    <main className="museum-app-layout min-h-screen">
      <aside className="museum-sidebar fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-y-auto px-5 py-6">
        <div>
          <Link
            href="/admin"
            className="museum-logo block text-3xl leading-none text-[var(--museum-ivory)] transition hover:text-[var(--museum-bronze-light)]"
          >
            mostra
            <span className="text-[var(--museum-bronze-light)]">.</span>
            <span className="text-[var(--museum-ivory-soft)]">space</span>
          </Link>

          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-[var(--museum-bronze-light)]">
            Admin console
          </p>

          <p className="mt-3 text-sm leading-6 text-[var(--museum-stone)]">
            Pannello amministratore per gestione piattaforma.
          </p>
        </div>

        <nav className="mt-8 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = item.key === activeSection;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "flex w-full rounded-2xl border border-[rgba(197,151,94,0.55)] bg-[rgba(168,121,69,0.13)] px-4 py-3 text-sm font-medium text-[var(--museum-bronze-light)]"
                    : "flex w-full rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-[var(--museum-stone)] transition hover:border-[rgba(168,121,69,0.32)] hover:bg-[rgba(168,121,69,0.08)] hover:text-[var(--museum-ivory)]"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="museum-dashboard-card mt-8 rounded-[1.5rem] p-5">
          <p className="museum-label">Uscite rapide</p>

          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="flex w-full rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-[var(--museum-stone)] transition hover:border-[rgba(168,121,69,0.32)] hover:bg-[rgba(168,121,69,0.08)] hover:text-[var(--museum-ivory)]"
            >
              Dashboard utente
            </Link>

            <Link
              href="/gallerie"
              target="_blank"
              rel="noreferrer"
              className="flex w-full rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-[var(--museum-stone)] transition hover:border-[rgba(168,121,69,0.32)] hover:bg-[rgba(168,121,69,0.08)] hover:text-[var(--museum-ivory)]"
            >
              Sito pubblico
            </Link>

            <div className="pt-2">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>

      <div className="min-h-screen min-w-0 pl-72">
        <header className="museum-topbar sticky top-0 z-30 px-5 py-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="museum-label mb-3">Control room</p>

              <h1 className="font-editorial text-5xl font-medium leading-tight text-[var(--museum-ivory)]">
                {title}
              </h1>

              {subtitle && (
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--museum-stone)]">
                  {subtitle}
                </p>
              )}
            </div>

            <Link href="/pricing" className="museum-button-secondary px-5 py-2.5">
              Vedi piani
            </Link>
          </div>
        </header>

        <section className="px-5 py-8 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </section>
      </div>
    </main>
  );
}
