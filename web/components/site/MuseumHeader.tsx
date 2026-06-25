import Link from "next/link";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";

const navItems = [
  {
    href: "/gallerie",
    label: "Esplora",
  },
  {
    href: "/gallerie",
    label: "Gallerie",
  },
  {
    href: "/pricing",
    label: "Prezzi",
  },
  {
    href: "/legal",
    label: "Legal",
  },
];

export default function MuseumHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--museum-border)] bg-[rgba(8,7,5,0.88)] px-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6">
        <Link
          href="/"
          className="museum-logo text-3xl leading-none text-[var(--museum-ivory)] transition hover:text-[var(--museum-bronze-light)]"
          aria-label="Mostra.space homepage"
        >
          mostra<span className="text-[var(--museum-bronze-light)]">.</span>
          <span className="text-[var(--museum-ivory-soft)]">space</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--museum-ivory-soft)] transition hover:text-[var(--museum-bronze-light)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>

          <Link
            href="/auth/login"
            className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-[var(--museum-ivory-soft)] transition hover:text-[var(--museum-bronze-light)] sm:inline-flex"
          >
            Accedi
          </Link>

          <Link
            href="/auth/register"
            className="museum-button-secondary px-5 py-2.5"
          >
            Registrati
          </Link>
        </div>
      </div>
    </header>
  );
}