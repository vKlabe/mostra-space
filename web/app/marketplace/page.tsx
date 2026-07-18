import Link from "next/link";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import MuseumHeader from "@/components/site/MuseumHeader";
import LegalFooter from "@/components/legal/LegalFooter";
import TemplateCheckoutButton from "@/components/marketplace/TemplateCheckoutButton";
import T from "@/components/i18n/T";

export const dynamic = "force-dynamic";

type MarketplaceTemplate = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unity_scene_key: string;
  preview_image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  available_from_plan: string | null;

  marketplace_price_cents: number | null;
  marketplace_currency: string | null;
  marketplace_is_active: boolean;
  marketplace_description: string | null;
  marketplace_preview_image_url: string | null;
  marketplace_demo_url: string | null;
  marketplace_square_meters: number | null;
  marketplace_compare_at_price_cents: number | null;
  marketplace_is_on_sale: boolean;
  marketplace_sale_section_enabled: boolean;
  marketplace_sale_sort_order: number;
  marketplace_bestseller_section_enabled: boolean;
  marketplace_bestseller_sort_order: number;
};

type TemplatePurchase = {
  template_id: string;
};

type TemplateCardProps = {
  template: MarketplaceTemplate;
  isLoggedIn: boolean;
  isPurchased: boolean;
  isCompact?: boolean;
  className?: string;
};

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function formatPrice(cents: number | null, currency: string | null) {
  if (!cents || cents <= 0) {
    return "Prezzo non disponibile";
  }

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
  }).format(cents / 100);
}

function formatSquareMeters(value: number | null) {
  if (!value || value <= 0) {
    return "";
  }

  return `${new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
  }).format(value)} m²`;
}

function sortByMarketplaceOrder(
  a: MarketplaceTemplate,
  b: MarketplaceTemplate,
  field:
    | "marketplace_sale_sort_order"
    | "marketplace_bestseller_sort_order"
) {
  const firstOrder = a[field] || 0;
  const secondOrder = b[field] || 0;

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  if (a.sort_order !== b.sort_order) {
    return a.sort_order - b.sort_order;
  }

  return a.name.localeCompare(b.name);
}

function MarketplaceTemplateCard({
  template,
  isLoggedIn,
  isPurchased,
  isCompact = false,
  className = "",
}: TemplateCardProps) {
  const previewImage =
    template.marketplace_preview_image_url || template.preview_image_url;

  const description = template.marketplace_description || template.description;

  const compareAtPriceVisible =
    template.marketplace_is_on_sale &&
    template.marketplace_compare_at_price_cents &&
    template.marketplace_price_cents &&
    template.marketplace_compare_at_price_cents > template.marketplace_price_cents;

  const squareMeters = formatSquareMeters(template.marketplace_square_meters);

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 ${className}`}
    >
      <div className="relative aspect-video bg-neutral-950">
        {previewImage ? (
          <img
            src={previewImage}
            alt={template.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_30%),linear-gradient(135deg,_#262626,_#111827_55%,_#020617)] p-6 text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
              <T
                textKey="marketplace.card.previewComing"
                fallback="Preview in arrivo"
              />
            </p>
          </div>
        )}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {template.is_featured && (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-neutral-950">
              <T textKey="marketplace.card.featured" fallback="Featured" />
            </span>
          )}

          {template.marketplace_is_on_sale && (
            <span className="rounded-full border border-red-900 bg-red-950/90 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-red-200">
              <T textKey="marketplace.card.onSale" fallback="On sale" />
            </span>
          )}
        </div>

        {isPurchased && (
          <span className="absolute right-4 top-4 rounded-full border border-green-900 bg-green-950/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-green-200">
            <T textKey="marketplace.card.purchased" fallback="Acquistato" />
          </span>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${isCompact ? "p-5" : "p-6"}`}>
        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-amber-300">
          <T textKey="marketplace.card.label" fallback="Marketplace template" />
        </p>

        <h2 className={isCompact ? "text-xl font-medium" : "text-2xl font-medium"}>
          {template.name}
        </h2>

        <p className="mt-2 break-all text-sm text-neutral-500">
          {template.slug}
        </p>

        {description ? (
          <p
            className={
              isCompact
                ? "mt-5 min-h-28 text-sm leading-7 text-neutral-400"
                : "mt-5 min-h-24 text-sm leading-7 text-neutral-400"
            }
          >
            {description}
          </p>
        ) : (
          <p
            className={
              isCompact
                ? "mt-5 min-h-28 text-sm leading-7 text-neutral-500"
                : "mt-5 min-h-24 text-sm leading-7 text-neutral-500"
            }
          >
            <T
              textKey="marketplace.card.defaultDescription"
              fallback="Template premium acquistabile singolarmente e collegato per sempre al tuo account."
            />
          </p>
        )}

        <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
          {squareMeters && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-neutral-600">
                <T
                  textKey="marketplace.card.squareMeters"
                  fallback="Metri quadri"
                />
              </p>
              <p className="mt-2 font-medium text-neutral-100">
                {squareMeters}
              </p>
            </div>
          )}

          {template.marketplace_demo_url && (
            <a
              href={template.marketplace_demo_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-neutral-700 bg-neutral-950 p-3 transition hover:border-neutral-400"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-neutral-600">
                <T textKey="marketplace.card.demoLabel" fallback="Demo" />
              </p>
              <p className="mt-2 font-medium text-neutral-100">
                <T
                  textKey="marketplace.card.demo"
                  fallback="Visita demo"
                />
              </p>
            </a>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
            <T textKey="marketplace.card.price" fallback="Prezzo" />
          </p>

          {compareAtPriceVisible && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-red-400">
                <T textKey="marketplace.card.onSale" fallback="On sale" />
              </span>

              <span className="text-sm font-medium text-red-400 line-through decoration-red-400">
                {formatPrice(
                  template.marketplace_compare_at_price_cents,
                  template.marketplace_currency
                )}
              </span>
            </div>
          )}

          <p className="mt-2 text-3xl font-semibold">
            {formatPrice(
              template.marketplace_price_cents,
              template.marketplace_currency
            )}
          </p>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            <T
              textKey="marketplace.card.paymentDescription"
              fallback="Pagamento singolo. Accesso permanente al template sul tuo account."
            />
          </p>
        </div>

        <div className="mt-6">
          <TemplateCheckoutButton
            templateId={template.id}
            isLoggedIn={isLoggedIn}
            isPurchased={isPurchased}
          />
        </div>
      </div>
    </article>
  );
}

export default async function MarketplacePage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const templatesResult = await admin
    .from("gallery_templates")
    .select(
      [
        "id",
        "name",
        "slug",
        "description",
        "unity_scene_key",
        "preview_image_url",
        "is_active",
        "is_featured",
        "sort_order",
        "available_from_plan",
        "marketplace_price_cents",
        "marketplace_currency",
        "marketplace_is_active",
        "marketplace_description",
        "marketplace_preview_image_url",
        "marketplace_demo_url",
        "marketplace_square_meters",
        "marketplace_compare_at_price_cents",
        "marketplace_is_on_sale",
        "marketplace_sale_section_enabled",
        "marketplace_sale_sort_order",
        "marketplace_bestseller_section_enabled",
        "marketplace_bestseller_sort_order",
      ].join(", ")
    )
    .eq("available_from_plan", "marketplace")
    .eq("marketplace_is_active", true)
    .eq("is_active", true)
    .gt("marketplace_price_cents", 0)
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const templates =
    (templatesResult.data || []) as unknown as MarketplaceTemplate[];

  const saleTemplates = templates
    .filter((template) => template.marketplace_sale_section_enabled)
    .sort((a, b) => sortByMarketplaceOrder(a, b, "marketplace_sale_sort_order"))
    .slice(0, 6);

  const bestsellerTemplates = templates
    .filter((template) => template.marketplace_bestseller_section_enabled)
    .sort((a, b) =>
      sortByMarketplaceOrder(a, b, "marketplace_bestseller_sort_order")
    )
    .slice(0, 3);

  let purchasedTemplateIds = new Set<string>();

  if (user) {
    const purchasesResult = await admin
      .from("gallery_template_purchases")
      .select("template_id")
      .eq("user_id", user.id)
      .eq("status", "paid");

    const purchases =
      (purchasesResult.data || []) as unknown as TemplatePurchase[];

    purchasedTemplateIds = new Set(
      purchases.map((purchase) => purchase.template_id)
    );
  }

  return (
    <>
      <MuseumHeader />

      <main className="min-h-screen bg-neutral-950 text-neutral-50">
        <section className="border-b border-neutral-900 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.10),_transparent_28%),linear-gradient(180deg,_#111111,_#050505)]">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div>
                <p className="mb-4 text-xs uppercase tracking-[0.28em] text-neutral-500">
                  <T
                    textKey="marketplace.hero.label"
                    fallback="MostraSpace Marketplace"
                  />
                </p>

                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
                  <T
                    textKey="marketplace.hero.title"
                    fallback="Template gallerie acquistabili per sempre."
                  />
                </h1>

                <p className="mt-6 max-w-3xl text-base leading-8 text-neutral-400">
                  <T
                    textKey="marketplace.hero.subtitle"
                    fallback="Acquista ambienti 3D extra per le tue mostre digitali. Una volta comprato, il template resta collegato al tuo account e potrai usarlo indipendentemente dal piano attivo."
                  />
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-800 bg-neutral-950/80 p-5">
                <p className="text-sm text-neutral-400">
                  <T
                    textKey="marketplace.hero.availableTemplates"
                    fallback="Template disponibili"
                  />
                </p>

                <p className="mt-2 text-4xl font-semibold">
                  {templates.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          {templatesResult.error && (
            <div className="rounded-3xl border border-red-900 bg-red-950/30 p-6">
              <p className="font-medium text-red-100">
                <T
                  textKey="marketplace.errors.loadingTitle"
                  fallback="Errore caricamento marketplace"
                />
              </p>

              <p className="mt-2 text-sm text-red-200">
                {templatesResult.error.message}
              </p>
            </div>
          )}

          {!templatesResult.error && templates.length === 0 && (
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-8">
              <p className="text-lg font-medium">
                <T
                  textKey="marketplace.empty.title"
                  fallback="Marketplace in preparazione"
                />
              </p>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-400">
                <T
                  textKey="marketplace.empty.description"
                  fallback="Non ci sono ancora template acquistabili. Torna presto: qui compariranno gli ambienti premium venduti singolarmente."
                />
              </p>

              <Link
                href="/pricing"
                className="mt-6 inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-200 transition hover:border-neutral-500"
              >
                <T
                  textKey="marketplace.empty.viewPlans"
                  fallback="Vedi i piani"
                />
              </Link>
            </div>
          )}

          {templates.length > 0 && (
            <div className="space-y-16">
              {saleTemplates.length > 0 && (
                <section>
                  <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                      <p className="text-xs uppercase tracking-[0.26em] text-red-400">
                        <T
                          textKey="marketplace.sections.sale.label"
                          fallback="Sconti"
                        />
                      </p>

                      <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                        <T
                          textKey="marketplace.sections.sale.title"
                          fallback="Template con sconti"
                        />
                      </h2>
                    </div>

                    <p className="max-w-2xl text-sm leading-7 text-neutral-500">
                      <T
                        textKey="marketplace.sections.sale.description"
                        fallback="Una selezione temporanea di template marketplace scelti dall’admin."
                      />
                    </p>
                  </div>

                  <div className="flex snap-x gap-6 overflow-x-auto pb-4">
                    {saleTemplates.map((template) => (
                      <MarketplaceTemplateCard
                        key={template.id}
                        template={template}
                        isLoggedIn={Boolean(user)}
                        isPurchased={purchasedTemplateIds.has(template.id)}
                        className="min-w-[290px] snap-start md:min-w-[360px]"
                      />
                    ))}
                  </div>
                </section>
              )}

              {bestsellerTemplates.length > 0 && (
                <section>
                  <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                      <p className="text-xs uppercase tracking-[0.26em] text-amber-300">
                        <T
                          textKey="marketplace.sections.bestseller.label"
                          fallback="Scelti dall’admin"
                        />
                      </p>

                      <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                        <T
                          textKey="marketplace.sections.bestseller.title"
                          fallback="I più venduti"
                        />
                      </h2>
                    </div>

                    <p className="max-w-2xl text-sm leading-7 text-neutral-500">
                      <T
                        textKey="marketplace.sections.bestseller.description"
                        fallback="Tre template marketplace messi in evidenza come migliori proposte commerciali."
                      />
                    </p>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-3">
                    {bestsellerTemplates.map((template) => (
                      <MarketplaceTemplateCard
                        key={template.id}
                        template={template}
                        isLoggedIn={Boolean(user)}
                        isPurchased={purchasedTemplateIds.has(template.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-neutral-500">
                      <T
                        textKey="marketplace.sections.all.label"
                        fallback="Marketplace"
                      />
                    </p>

                    <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                      <T
                        textKey="marketplace.sections.all.title"
                        fallback="Tutti i template"
                      />
                    </h2>
                  </div>

                  <p className="max-w-2xl text-sm leading-7 text-neutral-500">
                    <T
                      textKey="marketplace.sections.all.description"
                      fallback="Catalogo completo dei template acquistabili singolarmente."
                    />
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {templates.map((template) => (
                    <MarketplaceTemplateCard
                      key={template.id}
                      template={template}
                      isLoggedIn={Boolean(user)}
                      isPurchased={purchasedTemplateIds.has(template.id)}
                      isCompact
                    />
                  ))}
                </div>
              </section>
            </div>
          )}
        </section>
      </main>

      <LegalFooter />
    </>
  );
}
