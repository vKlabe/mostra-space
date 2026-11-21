import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import T from "@/components/i18n/T";
import JsonLd from "@/components/seo/JsonLd";
import MuseumHeader from "@/components/site/MuseumHeader";
import LegalFooter from "@/components/legal/LegalFooter";
import { getLegalPage, legalPages } from "@/lib/legal/legal-pages";
import {
  absoluteUrl,
  createPublicMetadata,
  NO_INDEX_METADATA,
} from "@/lib/seo/site";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return legalPages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getLegalPage(slug);

  if (!page) {
    return {
      ...NO_INDEX_METADATA,
      title: "Documento non disponibile",
    };
  }

  return createPublicMetadata({
    title: page.title,
    description: page.description,
    path: `/legal/${encodeURIComponent(page.slug)}`,
  });
}

export default async function LegalDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getLegalPage(slug);

  if (!page) {
    notFound();
  }

  const pageUrl = absoluteUrl(`/legal/${encodeURIComponent(page.slug)}`);
  const legalStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: page.title,
        description: page.description,
        inLanguage: "it-IT",
        isPartOf: {
          "@id": `${absoluteUrl("/")}#website`,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Area legale",
            item: absoluteUrl("/legal"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: page.title,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <main className="museum-page min-h-screen">
      <JsonLd data={legalStructuredData} />
      <MuseumHeader />

      <article className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16">
        <Link
          href="/legal"
          className="museum-link text-sm underline-offset-4 hover:underline"
        >
          ← Torna all’area legale
        </Link>

        <header className="mt-8 border-b border-[var(--museum-border)] pb-10">
          <p className="museum-label">Aggiornato il {page.updatedAt}</p>

          <h1 className="museum-title mt-4 break-words text-[clamp(2.4rem,7vw,4.5rem)] text-[var(--museum-ivory)]">
            {page.title}
          </h1>

          <p className="museum-subtitle mt-7 max-w-3xl text-base text-[var(--museum-stone)]">
            {page.description}
          </p>
        </header>

        <nav aria-labelledby="legal-contents" className="museum-card mt-8 rounded-[1.5rem] p-5 md:p-6">
          <h2 id="legal-contents" className="font-editorial text-2xl text-[var(--museum-ivory)]">
            <T textKey="ux.legal.contents" fallback="In questo documento" />
          </h2>
          <ol className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {page.sections.map((section, index) => (
              <li key={section.title}>
                <a className="museum-link inline-block py-1.5 text-sm underline underline-offset-4" href={`#section-${index + 1}`}>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-8 space-y-6">
          {page.sections.map((section, index) => (
            <section
              key={section.title}
              id={`section-${index + 1}`}
              className="museum-card scroll-mt-24 rounded-[1.75rem] p-5 md:p-8"
            >
              <h2 className="font-editorial text-3xl font-medium text-[var(--museum-ivory)]">
                {section.title}
              </h2>

              {section.paragraphs && (
                <div className="mt-5 space-y-4">
                  {section.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-sm leading-7 text-[var(--museum-stone)]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              {section.bullets && (
                <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--museum-stone)]">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--museum-bronze-light)]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <footer className="mt-10 border-t border-[var(--museum-border)] pt-6 text-sm leading-7 text-[var(--museum-stone-muted)]">
          {page.slug === "vendita-opere-2026-11-05" ? (
            "Questa versione delle condizioni resta consultabile. Le nuove versioni saranno pubblicate separatamente e richiederanno una nuova accettazione per le nuove vendite."
          ) : (
            <>Le informazioni contenute in questa pagina sono fornite a fini informativi e potranno essere aggiornate per esigenze tecniche, organizzative o normative.</>
          )}
        </footer>
      </article>

      <LegalFooter />
    </main>
  );
}
