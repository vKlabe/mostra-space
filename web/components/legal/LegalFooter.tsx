import Link from "next/link";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { LEGAL_OWNER } from "@/lib/legal/legal-pages";

const legalLinks = [
  {
    href: "/legal/termini",
    label: "Termini",
  },
  {
    href: "/legal/privacy",
    label: "Privacy",
  },
  {
    href: "/legal/cookie",
    label: "Cookie",
  },
  {
    href: "/legal/pagamenti",
    label: "Pagamenti",
  },
  {
    href: "/legal/cancellazioni-rimborsi",
    label: "Cancellazioni e rimborsi",
  },
  {
    href: "/legal/fatturazione",
    label: "Fatturazione",
  },
];

const footerNav = [
  {
    href: "/gallerie",
    label: "Gallerie",
  },
  {
    href: "/pricing",
    label: "Prezzi",
  },
  {
    href: "/dashboard",
    label: "Dashboard",
  },
  {
    href: "/legal",
    label: "Area legale",
  },
];

export default function LegalFooter() {
  return (
    <footer className="border-t border-[var(--museum-border)] bg-[var(--museum-black)] px-4 py-10 text-[var(--museum-stone)] md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-[1.25fr_0.75fr_1fr]">
          <div>
            <Link
              href="/"
              className="museum-logo text-3xl leading-none text-[var(--museum-ivory)] transition hover:text-[var(--museum-bronze-light)]"
            >
              mostra<span className="text-[var(--museum-bronze-light)]">.</span>
              <span className="text-[var(--museum-ivory-soft)]">space</span>
            </Link>

            <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--museum-stone)]">
              Una piattaforma digitale di {LEGAL_OWNER.name} per creare,
              visitare e gestire spazi espositivi virtuali.
            </p>

            <p className="mt-4 text-xs leading-6 text-[var(--museum-stone-muted)]">
              P. IVA {LEGAL_OWNER.vatNumber}
            </p>
          </div>

          <div>
            <p className="museum-label">Navigazione</p>

            <nav className="mt-5 grid gap-3">
              {footerNav.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="museum-link text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between md:flex-col md:items-start">
              <div>
                <p className="museum-label">Lingua</p>
                <div className="mt-4">
                  <LanguageSwitcher />
                </div>
              </div>

              <div>
                <p className="museum-label">Contatti</p>

                <div className="mt-4 space-y-2 text-sm">
                  <p>
                    Supporto:{" "}
                    <a
                      href={`mailto:${LEGAL_OWNER.supportEmail}`}
                      className="museum-link"
                    >
                      {LEGAL_OWNER.supportEmail}
                    </a>
                  </p>

                  <p>
                    Billing:{" "}
                    <a
                      href={`mailto:${LEGAL_OWNER.billingEmail}`}
                      className="museum-link"
                    >
                      {LEGAL_OWNER.billingEmail}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--museum-border)] pt-6">
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[var(--museum-stone-muted)] underline-offset-4 transition hover:text-[var(--museum-bronze-light)] hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="mt-5 text-xs text-[var(--museum-stone-muted)]">
            © {new Date().getFullYear()} {LEGAL_OWNER.name}. Tutti i diritti
            riservati.
          </p>
        </div>
      </div>
    </footer>
  );
}