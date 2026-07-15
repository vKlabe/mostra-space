import Link from "next/link";
import MuseumHeader from "@/components/site/MuseumHeader";
import LegalFooter from "@/components/legal/LegalFooter";
import { legalPages, LEGAL_OWNER } from "@/lib/legal/legal-pages";
import T from "@/components/i18n/T";

export const dynamic = "force-dynamic";

export default function LegalIndexPage() {
  return (
    <main className="museum-page min-h-screen">
      <MuseumHeader />

      <section className="border-b border-[var(--museum-border)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="museum-label">
            <T textKey="legal.hero.label" fallback="Mostra.space" />
          </p>

          <h1 className="museum-title mt-6 max-w-4xl text-6xl text-[var(--museum-ivory)] md:text-7xl">
            <T textKey="legal.hero.title" fallback="Area legale." />
          </h1>

          <p className="museum-subtitle mt-7 max-w-3xl text-base text-[var(--museum-stone)] md:text-lg">
            <T
              textKey="legal.hero.subtitle"
              fallback="Documenti informativi relativi a termini di utilizzo, privacy, cookie, pagamenti, cancellazioni, rimborsi e fatturazione della piattaforma."
            />
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {legalPages.map((page) => (
            <Link
              key={page.slug}
              href={`/legal/${page.slug}`}
              className="museum-card group rounded-[1.75rem] p-6 transition hover:border-[var(--museum-bronze)]"
            >
              <p className="museum-label">
                <T
                  textKey="legal.documents.updatedAt"
                  fallback="Aggiornato il"
                />{" "}
                {page.updatedAt}
              </p>

              <h2 className="mt-5 font-editorial text-4xl font-medium leading-tight text-[var(--museum-ivory)]">
                {page.title}
              </h2>

              <p className="mt-4 text-sm leading-7 text-[var(--museum-stone)]">
                {page.description}
              </p>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--museum-bronze-light)]">
                <T
                  textKey="legal.documents.read"
                  fallback="Leggi documento →"
                />
              </p>
            </Link>
          ))}
        </div>

        <section className="museum-card mt-10 rounded-[1.75rem] p-6 md:p-8">
          <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="museum-label">
                <T textKey="legal.contacts.label" fallback="Contatti" />
              </p>

              <h2 className="museum-title mt-4 text-5xl text-[var(--museum-ivory)]">
                <T
                  textKey="legal.contacts.title"
                  fallback="Titolare e supporto."
                />
              </h2>
            </div>

            <div className="space-y-3 text-sm leading-7 text-[var(--museum-stone)]">
              <p>
                <T textKey="legal.contacts.owner" fallback="Titolare:" />{" "}
                <span className="text-[var(--museum-ivory-soft)]">
                  {LEGAL_OWNER.name}
                </span>{" "}
                —{" "}
                <T textKey="legal.contacts.vatNumber" fallback="P. IVA" />{" "}
                <span className="text-[var(--museum-ivory-soft)]">
                  {LEGAL_OWNER.vatNumber}
                </span>
              </p>

              <p>
                <T textKey="legal.contacts.support" fallback="Supporto:" />{" "}
                <a
                  href={`mailto:${LEGAL_OWNER.supportEmail}`}
                  className="museum-link underline-offset-4 hover:underline"
                >
                  {LEGAL_OWNER.supportEmail}
                </a>
              </p>

              <p>
                <T textKey="legal.contacts.billing" fallback="Billing:" />{" "}
                <a
                  href={`mailto:${LEGAL_OWNER.billingEmail}`}
                  className="museum-link underline-offset-4 hover:underline"
                >
                  {LEGAL_OWNER.billingEmail}
                </a>
              </p>
            </div>
          </div>
        </section>
      </section>

      <LegalFooter />
    </main>
  );
}