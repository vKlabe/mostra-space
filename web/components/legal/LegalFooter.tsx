import Link from "next/link";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import T from "@/components/i18n/T";
import { LEGAL_OWNER } from "@/lib/legal/legal-pages";

const legalLinks = [
  {
    href: "/legal/termini",
    labelKey: "legal.footer.legalLinks.terms",
    labelFallback: "Termini",
  },
  {
    href: "/legal/privacy",
    labelKey: "legal.footer.legalLinks.privacy",
    labelFallback: "Privacy",
  },
  {
    href: "/legal/cookie",
    labelKey: "legal.footer.legalLinks.cookies",
    labelFallback: "Cookie",
  },
  {
    href: "/legal/pagamenti",
    labelKey: "legal.footer.legalLinks.payments",
    labelFallback: "Pagamenti",
  },
  {
    href: "/legal/cancellazioni-rimborsi",
    labelKey: "legal.footer.legalLinks.cancellationsRefunds",
    labelFallback: "Cancellazioni e rimborsi",
  },
  {
    href: "/legal/fatturazione",
    labelKey: "legal.footer.legalLinks.billing",
    labelFallback: "Fatturazione",
  },
];

const footerNav = [
  {
    href: "/gallerie",
    labelKey: "legal.footer.navigation.galleries",
    labelFallback: "Gallerie",
  },
  {
    href: "/marketplace",
    labelKey: "legal.footer.navigation.marketplace",
    labelFallback: "Marketplace",
  },
  {
    href: "/pricing",
    labelKey: "legal.footer.navigation.pricing",
    labelFallback: "Prezzi",
  },
  {
    href: "/dashboard",
    labelKey: "legal.footer.navigation.dashboard",
    labelFallback: "Dashboard",
  },
  {
    href: "/legal",
    labelKey: "legal.footer.navigation.legalArea",
    labelFallback: "Area legale",
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
              <T
                textKey="legal.footer.company.descriptionPrefix"
                fallback="Una piattaforma digitale di"
              />{" "}
              {LEGAL_OWNER.name}{" "}
              <T
                textKey="legal.footer.company.descriptionSuffix"
                fallback="per creare, visitare e gestire spazi espositivi virtuali."
              />
            </p>

            <p className="mt-4 text-xs leading-6 text-[var(--museum-stone-muted)]">
              <T
                textKey="legal.footer.company.vatNumber"
                fallback="P. IVA"
              />{" "}
              {LEGAL_OWNER.vatNumber}
            </p>
          </div>

          <div>
            <p className="museum-label">
              <T
                textKey="legal.footer.navigation.label"
                fallback="Navigazione"
              />
            </p>

            <nav className="mt-5 grid gap-3">
              {footerNav.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="museum-link text-sm"
                >
                  <T
                    textKey={link.labelKey}
                    fallback={link.labelFallback}
                  />
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between md:flex-col md:items-start">
              <div>
                <p className="museum-label">
                  <T textKey="legal.footer.language.label" fallback="Lingua" />
                </p>

                <div className="mt-4">
                  <LanguageSwitcher />
                </div>
              </div>

              <div>
                <p className="museum-label">
                  <T textKey="legal.footer.contacts.label" fallback="Contatti" />
                </p>

                <div className="mt-4 space-y-2 text-sm">
                  <p>
                    <T
                      textKey="legal.footer.contacts.support"
                      fallback="Supporto:"
                    />{" "}
                    <a
                      href={`mailto:${LEGAL_OWNER.supportEmail}`}
                      className="museum-link"
                    >
                      {LEGAL_OWNER.supportEmail}
                    </a>
                  </p>

                  <p>
                    <T
                      textKey="legal.footer.contacts.billing"
                      fallback="Billing:"
                    />{" "}
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
                <T
                  textKey={link.labelKey}
                  fallback={link.labelFallback}
                />
              </Link>
            ))}
          </nav>

          <p className="mt-5 text-xs text-[var(--museum-stone-muted)]">
            © {new Date().getFullYear()} {LEGAL_OWNER.name}.{" "}
            <T
              textKey="legal.footer.copyright.allRightsReserved"
              fallback="Tutti i diritti riservati."
            />
          </p>
        </div>
      </div>
    </footer>
  );
}