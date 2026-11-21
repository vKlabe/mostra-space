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
      prefetch={item.key === "events" ? false : undefined}
      aria-current={isActive ? "page" : undefined}
      className={`museum-sidebar-link flex min-h-11 items-center rounded-xl px-3 py-2 text-sm ${isActive ? "museum-sidebar-link-active" : ""}`}
    >
      {item.label}
    </Link>
  );
}

function DisclosureChevron({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={`size-4 shrink-0 text-[var(--museum-bronze-light)] transition-transform motion-reduce:transition-none ${className}`}
    >
      <path d="m5 8 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AdminNavigation({ activeSection, mobile = false }: { activeSection: Section; mobile?: boolean }) {
  const navigationId = mobile ? "admin-mobile-navigation" : "admin-desktop-navigation";
  const openGroup = navGroups.find((group) => group.items.some((item) => item.key === activeSection)) ?? navGroups[0];

  return (
    <nav aria-labelledby={navigationId} className={mobile ? "mt-2 space-y-2" : "mt-6 space-y-2"}>
      <span id={navigationId} className="sr-only"><WorkspaceText label="adminNavigation" /></span>
      <AdminNavLink item={overview} activeSection={activeSection} />
      {navGroups.map((group) => (
        <details
          key={`${activeSection}-${group.label}`}
          open={group === openGroup}
          className="group/admin-section rounded-xl border border-[var(--museum-border)] bg-[var(--museum-charcoal)]"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--museum-ivory-soft)] hover:bg-[var(--museum-surface)] hover:text-[var(--museum-ivory)] [&::-webkit-details-marker]:hidden">
            <WorkspaceText label={group.label} />
            <DisclosureChevron className="group-open/admin-section:rotate-180" />
          </summary>
          <ul className="space-y-0.5 border-t border-[var(--museum-border)] px-1.5 py-1.5">
            {group.items.map((item) => (
              <li key={item.key}>
                <AdminNavLink item={item} activeSection={activeSection} />
              </li>
            ))}
          </ul>
        </details>
      ))}
    </nav>
  );
}

function AdminHomeLink() {
  return (
    <Link href="/home" className="museum-logo inline-block rounded text-3xl text-[var(--museum-ivory)]">
      mostra<span className="text-[var(--museum-bronze-light)]">.</span>space
    </Link>
  );
}

function AdminUtilityLinks() {
  return (
    <div className="mt-4 space-y-1 border-t border-[var(--museum-border)] pt-3">
      <Link href="/dashboard" className="museum-sidebar-link min-h-11 rounded-xl px-3 py-2 text-sm">
        <T textKey="common.dashboard" />
      </Link>
      <Link href="/gallerie" target="_blank" rel="noreferrer" className="museum-sidebar-link min-h-11 rounded-xl px-3 py-2 text-sm">
        <T textKey="galleries.experience.publicGalleries" fallback="Gallerie pubbliche" />
      </Link>
      <div className="px-3 pt-2">
        <LogoutButton />
      </div>
    </div>
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
      <aside className="museum-sidebar fixed inset-y-0 left-0 hidden w-72 overflow-y-auto overscroll-contain px-5 py-6 [scrollbar-color:var(--museum-control-border)_transparent] [scrollbar-width:thin] lg:block">
        <AdminHomeLink />
        <p className="museum-label mt-3"><WorkspaceText label="adminArea" /></p>

        <AdminNavigation activeSection={activeSection} />
        <AdminUtilityLinks />
      </aside>

      <div className="min-h-screen min-w-0 lg:pl-72">
        <header className="museum-topbar px-5 py-6 sm:py-8 lg:sticky lg:top-0 lg:z-30 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-4 lg:hidden">
              <AdminHomeLink />
            </div>
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

            <details key={activeSection} className="group/admin-menu museum-dashboard-card mt-5 rounded-2xl p-2 lg:hidden">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 text-sm font-medium text-[var(--museum-ivory)] hover:bg-[var(--museum-surface)] [&::-webkit-details-marker]:hidden">
                <WorkspaceText label="adminNavigation" />
                <DisclosureChevron className="group-open/admin-menu:rotate-180" />
              </summary>
              <AdminNavigation activeSection={activeSection} mobile />
              <AdminUtilityLinks />
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
