import { CommerceTitle } from "@/components/commerce/CommerceUI";
import LogoutButton from "@/components/auth/LogoutButton";
import WorkspaceText from "@/components/dashboard/WorkspaceText";
import T from "@/components/i18n/T";
import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

type Section =
  | "overview"
  | "users"
  | "galleries"
  | "inquiries"
  | "templates"
  | "soundtracks"
  | "events"
  | "live-guided-visits"
  | "premio"
  | "storage"
  | "pwa"
  | "billing"
  | "commerce";

type AdminShellProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  activeSection?: Section;
  children: ReactNode;
  actions?: ReactNode;
};

type AdminLink = { href: string; key: Section; label: ReactNode };

const overview: AdminLink = {
  href: "/admin",
  key: "overview",
  label: <WorkspaceText label="adminOverview" />,
};

const navGroups: Array<{
  label: ComponentProps<typeof WorkspaceText>["label"];
  items: AdminLink[];
}> = [
  {
    label: "adminContent",
    items: [
      { href: "/admin/utenti", key: "users", label: <WorkspaceText label="adminUsers" /> },
      { href: "/admin/gallerie", key: "galleries", label: <T textKey="common.galleries" /> },
      { href: "/admin/richieste", key: "inquiries", label: <WorkspaceText label="adminRequests" /> },
      { href: "/admin/template", key: "templates", label: <WorkspaceText label="adminTemplates" /> },
      { href: "/admin/soundtracks", key: "soundtracks", label: <WorkspaceText label="adminSound" /> },
    ],
  },
  {
    label: "adminProgram",
    items: [
      { href: "/admin/events", key: "events", label: <T textKey="dashboard.events.shell.title" fallback="Eventi" /> },
      { href: "/admin/live-guided-visits", key: "live-guided-visits", label: <WorkspaceText label="adminLive" /> },
      { href: "/admin/premiomostraspace", key: "premio", label: <T textKey="premio.navMenu" fallback="Premio Mostra.Space" /> },
    ],
  },
  {
    label: "adminOperations",
    items: [
      { href: "/admin/pagamenti-opere", key: "commerce", label: <CommerceTitle mode="admin" /> },
      { href: "/admin/billing", key: "billing", label: <WorkspaceText label="adminBilling" /> },
      { href: "/admin/storage", key: "storage", label: <WorkspaceText label="adminStorage" /> },
      { href: "/admin/pwa", key: "pwa", label: <WorkspaceText label="adminPwa" /> },
    ],
  },
];

function AdminNavLink({ item, activeSection }: { item: AdminLink; activeSection: Section }) {
  const isActive = item.key === activeSection;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`museum-sidebar-link flex min-h-11 items-center rounded-xl px-3 py-2 text-sm ${isActive ? "museum-sidebar-link-active" : ""}`}
    >
      {item.label}
    </Link>
  );
}

function AdminNavigation({ activeSection, mobile = false }: { activeSection: Section; mobile?: boolean }) {
  return (
    <nav className={mobile ? "mt-4 space-y-3" : "mt-7 space-y-5"}>
      <AdminNavLink item={overview} activeSection={activeSection} />
      {navGroups.map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="px-3 pb-1 text-xs font-medium text-[var(--museum-stone)]">
            <WorkspaceText label={group.label} />
          </p>
          <ul className={mobile ? "grid gap-1 sm:grid-cols-2" : "space-y-1"}>
            {group.items.map((item) => (
              <li key={item.key}>
                <AdminNavLink item={item} activeSection={activeSection} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function AdminShell({
  title,
  subtitle,
  activeSection = "overview",
  children,
  actions,
}: AdminShellProps) {
  return (
    <main className="museum-app-layout min-h-screen">
      <aside className="museum-sidebar fixed inset-y-0 left-0 hidden w-72 overflow-y-auto px-5 py-6 lg:block">
        <Link href="/admin" className="museum-logo text-3xl text-[var(--museum-ivory)]">
          mostra<span className="text-[var(--museum-bronze-light)]">.</span>space
        </Link>
        <p className="museum-label mt-3"><WorkspaceText label="adminArea" /></p>

        <AdminNavigation activeSection={activeSection} />

        <div className="museum-dashboard-card mt-8 space-y-2 rounded-2xl p-4">
          <Link href="/dashboard" className="museum-sidebar-link flex min-h-11 items-center rounded-xl px-3 py-2 text-sm">
            <T textKey="common.dashboard" />
          </Link>
          <Link href="/gallerie" target="_blank" rel="noreferrer" className="museum-sidebar-link flex min-h-11 items-center rounded-xl px-3 py-2 text-sm">
            <WorkspaceText label="publicSite" />
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <div className="min-h-screen min-w-0 lg:pl-72">
        <header className="museum-topbar px-5 py-6 sm:py-8 lg:sticky lg:top-0 lg:z-30 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="museum-label mb-2"><WorkspaceText label="adminArea" /></p>
                <h1 className="font-editorial text-3xl font-medium leading-tight text-[var(--museum-ivory)] sm:text-4xl xl:text-5xl">{title}</h1>
                {subtitle && <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--museum-stone)]">{subtitle}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {actions}
                <Link href="/pricing" className="museum-button-secondary min-h-11 px-5 py-2">
                  <WorkspaceText label="adminPlans" />
                </Link>
              </div>
            </div>

            <details className="museum-dashboard-card mt-5 rounded-2xl p-3 lg:hidden">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-2 text-sm font-medium text-[var(--museum-ivory)]">
                <WorkspaceText label="adminNavigation" />
                <span aria-hidden="true" className="text-[var(--museum-bronze-light)]">⌄</span>
              </summary>
              <AdminNavigation activeSection={activeSection} mobile />
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--museum-border)] pt-4">
                <Link href="/dashboard" className="museum-button-secondary min-h-11 px-4 py-2">
                  <T textKey="common.dashboard" />
                </Link>
                <Link href="/gallerie" target="_blank" rel="noreferrer" className="museum-button-secondary min-h-11 px-4 py-2">
                  <WorkspaceText label="publicSite" />
                </Link>
                <LogoutButton />
              </div>
            </details>
          </div>
        </header>

        <section id="main-content" tabIndex={-1} className="scroll-mt-36 px-5 py-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </section>
      </div>
    </main>
  );
}
