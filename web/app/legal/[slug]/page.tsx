import Link from "next/link";
import { notFound } from "next/navigation";
import MuseumHeader from "@/components/site/MuseumHeader";
import LegalFooter from "@/components/legal/LegalFooter";
import { getLegalPage, legalPages } from "@/lib/legal/legal-pages";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return legalPages.map((page) => ({
    slug: page.slug,
  }));
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

  return (
    <main className="museum-page min-h-screen">
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

          <h1 className="museum-title mt-5 text-6xl text-[var(--museum-ivory)] md:text-7xl">
            {page.title}
          </h1>

          <p className="museum-subtitle mt-7 max-w-3xl text-base text-[var(--museum-stone)]">
            {page.description}
          </p>
        </header>

        <div className="mt-10 space-y-6">
          {page.sections.map((section) => (
            <section
              key={section.title}
              className="museum-card rounded-[1.75rem] p-6 md:p-8"
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
          Le informazioni contenute in questa pagina sono fornite a fini
          informativi e potranno essere aggiornate per esigenze tecniche,
          organizzative o normative.
        </footer>
      </article>

      <LegalFooter />
    </main>
  );
}