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
};

type TemplatePurchase = {
  template_id: string;
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
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => {
                const previewImage =
                  template.marketplace_preview_image_url ||
                  template.preview_image_url;

                const description =
                  template.marketplace_description || template.description;

                const isPurchased = purchasedTemplateIds.has(template.id);

                return (
                  <article
                    key={template.id}
                    className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900"
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

                      {template.is_featured && (
                        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-neutral-950">
                          <T
                            textKey="marketplace.card.featured"
                            fallback="Featured"
                          />
                        </span>
                      )}

                      {isPurchased && (
                        <span className="absolute right-4 top-4 rounded-full border border-green-900 bg-green-950/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-green-200">
                          <T
                            textKey="marketplace.card.purchased"
                            fallback="Acquistato"
                          />
                        </span>
                      )}
                    </div>

                    <div className="p-6">
                      <p className="mb-3 text-xs uppercase tracking-[0.22em] text-amber-300">
                        <T
                          textKey="marketplace.card.label"
                          fallback="Marketplace template"
                        />
                      </p>

                      <h2 className="text-2xl font-medium">
                        {template.name}
                      </h2>

                      <p className="mt-2 break-all text-sm text-neutral-500">
                        {template.slug}
                      </p>

                      {description && (
                        <p className="mt-5 min-h-24 text-sm leading-7 text-neutral-400">
                          {description}
                        </p>
                      )}

                      {!description && (
                        <p className="mt-5 min-h-24 text-sm leading-7 text-neutral-500">
                          <T
                            textKey="marketplace.card.defaultDescription"
                            fallback="Template premium acquistabile singolarmente e collegato per sempre al tuo account."
                          />
                        </p>
                      )}

                      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                          <T
                            textKey="marketplace.card.price"
                            fallback="Prezzo"
                          />
                        </p>

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
                          isLoggedIn={Boolean(user)}
                          isPurchased={isPurchased}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <LegalFooter />
    </>
  );
}