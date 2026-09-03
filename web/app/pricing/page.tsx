import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CheckoutButton from "@/components/billing/CheckoutButton";
import CustomerPortalButton from "@/components/billing/CustomerPortalButton";
import LegalFooter from "@/components/legal/LegalFooter";
import MuseumHeader from "@/components/site/MuseumHeader";
import T from "@/components/i18n/T";
import {
  PLAN_LIMITS,
  PLAN_ORDER,
  formatLimitValue,
  formatMb,
  normalizePlanName,
  type PlanName,
} from "@/lib/plans";
import LocalDateTime from "@/components/time/LocalDateTime";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: "user" | "gallerist" | "admin";
  plan: PlanName;
  stripe_customer_id: string | null;
  stripe_subscription_status: string | null;
  stripe_current_period_end: string | null;
  stripe_cancel_at_period_end: boolean | null;
};

type StripeCheckoutPlan = Extract<PlanName, "pro" | "business" | "diamond">;

const STRIPE_CHECKOUT_PLANS: StripeCheckoutPlan[] = [
  "pro",
  "business",
  "diamond",
];

const STANDARD_PLAN_NAMES: PlanName[] = PLAN_ORDER.filter(
  (planName) => planName !== "institution"
);

const planHighlights: Record<
  PlanName,
  Array<{
    textKey: string;
    fallback: string;
  }>
> = {
  free: [
    {
      textKey: "pricing.plans.free.highlights.galleries",
      fallback: "1 galleria pubblicabile",
    },
    {
      textKey: "pricing.plans.free.highlights.artworks",
      fallback: "15 opere totali",
    },
    {
      textKey: "pricing.plans.free.highlights.storage",
      fallback: "25 MB di storage",
    },
  ],
  pro: [
    {
      textKey: "pricing.plans.pro.highlights.galleries",
      fallback: "5 gallerie pubblicabili",
    },
    {
      textKey: "pricing.plans.pro.highlights.artworks",
      fallback: "150 opere totali",
    },
    {
      textKey: "pricing.plans.pro.highlights.storage",
      fallback: "500 MB di storage",
    },
  ],
  business: [
    {
      textKey: "pricing.plans.business.highlights.galleries",
      fallback: "10 gallerie pubblicabili",
    },
    {
      textKey: "pricing.plans.business.highlights.artworks",
      fallback: "250 opere totali",
    },
    {
      textKey: "pricing.plans.business.highlights.storage",
      fallback: "1 GB di storage",
    },
  ],
  diamond: [
    {
      textKey: "pricing.plans.diamond.highlights.galleries",
      fallback: "15 gallerie pubblicabili",
    },
    {
      textKey: "pricing.plans.diamond.highlights.artworks",
      fallback: "500 opere totali",
    },
    {
      textKey: "pricing.plans.diamond.highlights.storage",
      fallback: "2 GB di storage",
    },
  ],
  institution: [
    {
      textKey: "pricing.plans.institution.highlights.customPlan",
      fallback: "Piano personalizzato",
    },
    {
      textKey: "pricing.plans.institution.highlights.customFeatures",
      fallback: "Features su misura",
    },
    {
      textKey: "pricing.plans.institution.highlights.audience",
      fallback: "Per musei, fondazioni e istituzioni",
    },
  ],
};

function getPlanDescriptionContent(plan: PlanName) {
  if (plan === "free") {
    return (
      <T
        textKey="pricing.plans.free.description"
        fallback="Per iniziare, testare la piattaforma e pubblicare una prima galleria virtuale."
      />
    );
  }

  if (plan === "pro") {
    return (
      <T
        textKey="pricing.plans.pro.description"
        fallback="Per artisti, curatori indipendenti e piccoli studi che vogliono creare più gallerie e archiviare più opere."
      />
    );
  }

  if (plan === "business") {
    return (
      <T
        textKey="pricing.plans.business.description"
        fallback="Per gallerie e progetti professionali che hanno bisogno di più spazio, più opere e più continuità operativa."
      />
    );
  }

  if (plan === "diamond") {
    return (
      <T
        textKey="pricing.plans.diamond.description"
        fallback="Per gallerie strutturate, cataloghi ampi e attività espositive digitali più intense."
      />
    );
  }

  return (
    <T
      textKey="pricing.plans.institution.description"
      fallback="Per musei, fondazioni, fiere, istituzioni e progetti speciali con esigenze, limiti e funzionalità personalizzate."
    />
  );
}

function getPlanEyebrowContent(plan: PlanName) {
  if (plan === "free") {
    return <T textKey="pricing.plans.free.eyebrow" fallback="Ingresso" />;
  }

  if (plan === "pro") {
    return <T textKey="pricing.plans.pro.eyebrow" fallback="Artista" />;
  }

  if (plan === "business") {
    return <T textKey="pricing.plans.business.eyebrow" fallback="Gallerista" />;
  }

  if (plan === "diamond") {
    return <T textKey="pricing.plans.diamond.eyebrow" fallback="Premium" />;
  }

  return (
    <T
      textKey="pricing.plans.institution.eyebrow"
      fallback="Istituzione"
    />
  );
}

function getPlanBadgeClass(plan: PlanName, isCurrent: boolean) {
  if (isCurrent) {
    return "border-[var(--museum-bronze-light)] bg-[rgba(168,121,69,0.18)] text-[var(--museum-bronze-light)]";
  }

  if (plan === "free") {
    return "border-[var(--museum-border)] bg-[rgba(8,7,5,0.34)] text-[var(--museum-stone)]";
  }

  if (plan === "pro") {
    return "border-[var(--museum-bronze-dark)] bg-[rgba(168,121,69,0.1)] text-[var(--museum-bronze-light)]";
  }

  if (plan === "business") {
    return "border-[rgba(197,151,94,0.42)] bg-[rgba(197,151,94,0.12)] text-[var(--museum-ivory-soft)]";
  }

  if (plan === "diamond") {
    return "border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.1)] text-[var(--museum-ivory)]";
  }

  return "border-[rgba(216,205,187,0.28)] bg-[rgba(216,205,187,0.08)] text-[var(--museum-ivory)]";
}

function formatTemplateLimitContent(value: number | null) {
  if (value === null) {
    return <T textKey="pricing.features.allTemplates" fallback="Tutti" />;
  }

  return value;
}

function getCatalogPdfContent(plan: PlanName) {
  if (plan === "free") {
    return (
      <T
        textKey="pricing.features.pdfCatalog.free"
        fallback="Anteprima"
      />
    );
  }

  if (plan === "pro") {
    return (
      <T
        textKey="pricing.features.pdfCatalog.pro"
        fallback="PDF elegante"
      />
    );
  }

  if (plan === "business" || plan === "diamond") {
    return (
      <T
        textKey="pricing.features.pdfCatalog.allLayouts"
        fallback="Tutti i layout"
      />
    );
  }

  return (
    <T
      textKey="pricing.features.pdfCatalog.custom"
      fallback="Personalizzato"
    />
  );
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return <LocalDateTime value={value} format="date-short" />;
}

function isStripeCheckoutPlan(plan: PlanName): plan is StripeCheckoutPlan {
  return STRIPE_CHECKOUT_PLANS.includes(plan as StripeCheckoutPlan);
}

export default async function PricingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select(
        [
          "id",
          "email",
          "display_name",
          "full_name",
          "role",
          "plan",
          "stripe_customer_id",
          "stripe_subscription_status",
          "stripe_current_period_end",
          "stripe_cancel_at_period_end",
        ].join(", ")
      )
      .eq("id", user.id)
      .single<Profile>();

    profile = data || null;
  }

  const currentPlan = profile ? normalizePlanName(profile.plan) : null;
  const billingDate = formatDate(profile?.stripe_current_period_end);
  const hasStripeCustomer = Boolean(profile?.stripe_customer_id);
  const isPaidCurrentPlan =
    currentPlan !== null &&
    currentPlan !== "free" &&
    currentPlan !== "institution";

  const institutionPlan = PLAN_LIMITS.institution;
  const isInstitutionCurrent = currentPlan === "institution";

  return (
    <main className="museum-page overflow-hidden">
      <MuseumHeader />

      <section className="border-b border-[var(--museum-border)]">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.7fr] lg:items-end">
            <div>
              <p className="museum-label">
                <T
                  textKey="pricing.hero.label"
                  fallback="Piani e prezzi"
                />
              </p>

              <h1 className="museum-title mt-6 max-w-5xl text-6xl text-[var(--museum-ivory)] md:text-7xl">
                <T
                  textKey="pricing.title"
                  fallback="Scegli il piano per il tuo spazio espositivo virtuale"
                />
              </h1>

              <p className="museum-subtitle mt-7 max-w-3xl text-base text-[var(--museum-stone)] md:text-lg">
                <T
                  textKey="pricing.subtitle"
                  fallback="Parti gratis, poi passa a un piano superiore quando hai bisogno di più gallerie, opere e storage."
                />
              </p>
            </div>

            <div className="museum-card rounded-[1.75rem] p-6">
              {profile ? (
                <>
                  <p className="museum-label">
                    <T
                      textKey="pricing.account.connected"
                      fallback="Account collegato"
                    />
                  </p>

                  <p className="mt-4 font-editorial text-3xl text-[var(--museum-ivory)]">
                    {profile.display_name ||
                      profile.full_name ||
                      profile.email || (
                        <T
                          textKey="pricing.account.defaultUser"
                          fallback="Utente"
                        />
                      )}
                  </p>

                  <div className="mt-5 grid gap-3 text-sm text-[var(--museum-stone)]">
                    <p>
                      <T
                        textKey="pricing.account.currentPlan"
                        fallback="Piano attuale:"
                      />{" "}
                      <span className="capitalize text-[var(--museum-ivory)]">
                        {currentPlan}
                      </span>
                    </p>

                    {profile.stripe_subscription_status && (
                      <p>
                        <T
                          textKey="pricing.account.subscriptionStatus"
                          fallback="Stato abbonamento:"
                        />{" "}
                        <span className="text-[var(--museum-ivory)]">
                          {profile.stripe_subscription_status}
                        </span>
                      </p>
                    )}

                    {billingDate && (
                      <p>
                        {profile.stripe_cancel_at_period_end ? (
                          <T
                            textKey="pricing.account.activeUntil"
                            fallback="Attivo fino al"
                          />
                        ) : (
                          <T
                            textKey="pricing.account.renewalDate"
                            fallback="Rinnovo previsto il"
                          />
                        )}{" "}
                        <span className="text-[var(--museum-ivory)]">
                          {billingDate}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="/dashboard"
                      className="museum-button-secondary px-5 py-2.5"
                    >
                      <T
                        textKey="pricing.account.dashboard"
                        fallback="Dashboard"
                      />
                    </Link>

                    {isPaidCurrentPlan && hasStripeCustomer && (
                      <CustomerPortalButton className="museum-button-primary px-5 py-2.5">
                        <T
                          textKey="pricing.actions.manageSubscription"
                          fallback="Gestisci abbonamento"
                        />
                      </CustomerPortalButton>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="museum-label">
                    <T
                      textKey="pricing.access.required"
                      fallback="Accesso richiesto"
                    />
                  </p>

                  <h2 className="mt-4 font-editorial text-3xl text-[var(--museum-ivory)]">
                    <T
                      textKey="pricing.access.title"
                      fallback="Consulta i piani, poi entra nel tuo spazio."
                    />
                  </h2>

                  <p className="mt-4 text-sm leading-7 text-[var(--museum-stone)]">
                    <T
                      textKey="pricing.access.description"
                      fallback="Puoi vedere tutte le opzioni. Per attivare un piano o gestire un abbonamento devi accedere."
                    />
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="/auth/login"
                      className="museum-button-primary px-5 py-2.5"
                    >
                      <T
                        textKey="pricing.access.login"
                        fallback="Accedi"
                      />
                    </Link>

                    <Link
                      href="/auth/register"
                      className="museum-button-secondary px-5 py-2.5"
                    >
                      <T
                        textKey="pricing.access.register"
                        fallback="Registrati"
                      />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {STANDARD_PLAN_NAMES.map((planName) => {
            const plan = PLAN_LIMITS[planName];
            const isCurrent = currentPlan === planName;
            const isFeatured = plan.name === "pro" || plan.name === "diamond";

            return (
              <article
                key={plan.name}
                className={
                  isCurrent
                    ? "relative rounded-[1.75rem] border border-[var(--museum-bronze-light)] bg-[rgba(168,121,69,0.12)] p-6 shadow-[var(--museum-shadow-bronze)]"
                    : isFeatured
                      ? "relative rounded-[1.75rem] border border-[rgba(168,121,69,0.5)] bg-[rgba(23,21,17,0.88)] p-6 shadow-[var(--museum-shadow-soft)]"
                      : "relative rounded-[1.75rem] border border-[var(--museum-border)] bg-[rgba(23,21,17,0.74)] p-6 shadow-[var(--museum-shadow-soft)]"
                }
              >
                {isCurrent && (
                  <div className="absolute right-5 top-5 rounded-full border border-[var(--museum-bronze-light)] bg-[var(--museum-bronze)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--museum-black)]">
                    <T
                      textKey="pricing.badges.current"
                      fallback="Attuale"
                    />
                  </div>
                )}

                {plan.name === "pro" && !isCurrent && (
                  <div className="absolute right-5 top-5 rounded-full border border-[var(--museum-bronze-dark)] bg-[rgba(168,121,69,0.12)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--museum-bronze-light)]">
                    <T
                      textKey="pricing.badges.recommended"
                      fallback="Consigliato"
                    />
                  </div>
                )}

                {plan.name === "diamond" && !isCurrent && (
                  <div className="absolute right-5 top-5 rounded-full border border-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.1)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--museum-ivory)]">
                    <T
                      textKey="pricing.badges.premium"
                      fallback="Premium"
                    />
                  </div>
                )}

                <p className="museum-label">{getPlanEyebrowContent(plan.name)}</p>

                <span
                  className={`mt-5 inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getPlanBadgeClass(
                    plan.name,
                    isCurrent
                  )}`}
                >
                  {plan.label}
                </span>

                <h2 className="mt-6 font-editorial text-5xl font-medium leading-none text-[var(--museum-ivory)]">
                  {plan.monthlyPriceLabel}
                </h2>

                <p className="mt-5 min-h-28 text-sm leading-7 text-[var(--museum-stone)]">
                  {getPlanDescriptionContent(plan.name)}
                </p>

                <div className="mt-6">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-none border border-[var(--museum-border)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--museum-stone-muted)]"
                    >
                      <T textKey="pricing.currentPlan" fallback="Piano attuale" />
                    </button>
                  ) : plan.name === "free" ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-none border border-[var(--museum-border)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--museum-stone-muted)]"
                    >
                      <T textKey="pricing.basePlan" fallback="Piano base" />
                    </button>
                  ) : profile &&
                    hasStripeCustomer &&
                    isPaidCurrentPlan &&
                    isStripeCheckoutPlan(plan.name) ? (
                    <CustomerPortalButton className="museum-button-primary w-full px-5 py-3">
                      <T
                        textKey="pricing.manageSubscription"
                        fallback="Gestisci abbonamento"
                      />
                    </CustomerPortalButton>
                  ) : profile && isStripeCheckoutPlan(plan.name) ? (
                    <CheckoutButton
                      plan={plan.name}
                      className="museum-button-primary w-full px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <T textKey="pricing.upgradeTo" fallback="Passa a" />{" "}
                      {plan.label}
                    </CheckoutButton>
                  ) : (
                    <Link
                      href="/auth/login"
                      className="museum-button-primary w-full px-5 py-3"
                    >
                      <T
                        textKey="pricing.activate"
                        fallback="Accedi per attivare"
                      />
                    </Link>
                  )}
                </div>

                <div className="mt-7 space-y-3 border-t border-[var(--museum-border)] pt-6">
                  {planHighlights[plan.name].map((item) => (
                    <div
                      key={item.textKey}
                      className="flex gap-3 text-sm text-[var(--museum-stone)]"
                    >
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--museum-bronze-light)]" />
                      <span>
                        <T
                          textKey={item.textKey}
                          fallback={item.fallback}
                        />
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-7 space-y-4 border-t border-[var(--museum-border)] pt-6">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-[var(--museum-stone-muted)]">
                      <T
                        textKey="pricing.features.galleries"
                        fallback="Gallerie"
                      />
                    </span>
                    <span className="text-[var(--museum-ivory-soft)]">
                      {formatLimitValue(plan.maxGalleries)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-[var(--museum-stone-muted)]">
                      <T
                        textKey="pricing.features.totalArtworks"
                        fallback="Opere totali"
                      />
                    </span>
                    <span className="text-[var(--museum-ivory-soft)]">
                      {formatLimitValue(plan.maxArtworksTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-[var(--museum-stone-muted)]">
                      <T
                        textKey="pricing.features.storage"
                        fallback="Storage"
                      />
                    </span>
                    <span className="text-[var(--museum-ivory-soft)]">
                      {formatMb(plan.maxStorageMb)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-[var(--museum-stone-muted)]">
                      <T
                        textKey="pricing.features.requestsPerMonth"
                        fallback="Richieste/mese"
                      />
                    </span>
                    <span className="text-[var(--museum-ivory-soft)]">
                      {formatLimitValue(plan.maxRequestsPerMonth)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-[var(--museum-stone-muted)]">
                      <T
                        textKey="pricing.features.galleryTemplates"
                        fallback="Template gallerie"
                      />
                    </span>
                    <span className="text-[var(--museum-ivory-soft)]">
                      {formatTemplateLimitContent(plan.selectableTemplates)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-[var(--museum-stone-muted)]">
                      <T
                        textKey="pricing.features.pdfCatalog"
                        fallback="Catalogo PDF"
                      />
                    </span>
                    <span className="text-right text-[var(--museum-ivory-soft)]">
                      {getCatalogPdfContent(plan.name)}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <section
          className={
            isInstitutionCurrent
              ? "mt-6 rounded-[1.75rem] border border-[var(--museum-bronze-light)] bg-[rgba(168,121,69,0.12)] p-6 shadow-[var(--museum-shadow-bronze)] md:p-8"
              : "mt-6 rounded-[1.75rem] border border-[rgba(216,205,187,0.24)] bg-[rgba(23,21,17,0.74)] p-6 shadow-[var(--museum-shadow-soft)] md:p-8"
          }
        >
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.35fr_0.65fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="museum-label">
                  {getPlanEyebrowContent(institutionPlan.name)}
                </p>

                {isInstitutionCurrent && (
                  <span className="rounded-full border border-[var(--museum-bronze-light)] bg-[var(--museum-bronze)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--museum-black)]">
                    <T
                      textKey="pricing.badges.current"
                      fallback="Attuale"
                    />
                  </span>
                )}
              </div>

              <span
                className={`mt-5 inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getPlanBadgeClass(
                  institutionPlan.name,
                  isInstitutionCurrent
                )}`}
              >
                {institutionPlan.label}
              </span>

              <h2 className="mt-6 font-editorial text-5xl font-medium leading-none text-[var(--museum-ivory)] md:text-6xl">
                {institutionPlan.monthlyPriceLabel}
              </h2>

              <p className="mt-5 text-sm leading-7 text-[var(--museum-stone)]">
                {getPlanDescriptionContent(institutionPlan.name)}
              </p>
            </div>

            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-5">
                  <p className="font-medium text-[var(--museum-ivory)]">
                    <T
                      textKey="pricing.institution.customLimits.title"
                      fallback="Limiti personalizzati"
                    />
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--museum-stone)]">
                    <T
                      textKey="pricing.institution.customLimits.description"
                      fallback="Gallerie, opere, storage e richieste definiti in base al progetto."
                    />
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-5">
                  <p className="font-medium text-[var(--museum-ivory)]">
                    <T
                      textKey="pricing.institution.dedicatedSupport.title"
                      fallback="Supporto dedicato"
                    />
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--museum-stone)]">
                    <T
                      textKey="pricing.institution.dedicatedSupport.description"
                      fallback="Onboarding, configurazione e assistenza per realtà complesse."
                    />
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-5">
                  <p className="font-medium text-[var(--museum-ivory)]">
                    <T
                      textKey="pricing.institution.customBranding.title"
                      fallback="Branding su misura"
                    />
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--museum-stone)]">
                    <T
                      textKey="pricing.institution.customBranding.description"
                      fallback="Esperienza più coerente con identità, archivio e progetto culturale."
                    />
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-5">
                  <p className="font-medium text-[var(--museum-ivory)]">
                    <T
                      textKey="pricing.institution.customRooms.title"
                      fallback="Sale e template dedicati"
                    />
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--museum-stone)]">
                    <T
                      textKey="pricing.institution.customRooms.description"
                      fallback="Possibilità di ambienti, configurazioni e funzioni su richiesta."
                    />
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:text-right">
              {isInstitutionCurrent ? (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-none border border-[var(--museum-border)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--museum-stone-muted)] lg:w-auto"
                >
                  <T
                    textKey="pricing.actions.currentPlan"
                    fallback="Piano attuale"
                  />
                </button>
              ) : (
                <a
                  href="mailto:info@mostra.space?subject=Richiesta%20piano%20Institution%20MostraSpace"
                  className="museum-button-secondary inline-flex w-full justify-center px-5 py-3 lg:w-auto"
                >
                  <T
                    textKey="pricing.actions.contactUs"
                    fallback="Contattaci"
                  />
                </a>
              )}

              <div className="mt-6 space-y-3 border-t border-[var(--museum-border)] pt-6 text-left lg:text-right">
                {planHighlights.institution.map((item) => (
                  <div
                    key={item.textKey}
                    className="flex gap-3 text-sm text-[var(--museum-stone)] lg:justify-end"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--museum-bronze-light)] lg:order-2" />
                    <span>
                      <T
                        textKey={item.textKey}
                        fallback={item.fallback}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="museum-card mt-10 rounded-[1.75rem] p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="museum-label">
                <T
                  textKey="pricing.limitsNote.label"
                  fallback="Nota sui limiti"
                />
              </p>

              <h2 className="museum-title mt-4 text-4xl text-[var(--museum-ivory)] md:text-5xl">
                <T
                  textKey="pricing.limitsNote.title"
                  fallback="Storage account e opere visibili non sono la stessa cosa."
                />
              </h2>

              <p className="museum-subtitle mt-5 text-sm text-[var(--museum-stone)]">
                <T
                  textKey="pricing.limitsNote.description"
                  fallback="Lo storage indica quante opere puoi archiviare sul tuo account. Le opere visibili per sala indicano invece quante opere vengono caricate in una singola galleria visitabile, così l’esperienza resta fluida e accessibile."
                />
              </p>
            </div>

            <div className="rounded-[1.35rem] border border-[var(--museum-border)] bg-[rgba(8,7,5,0.46)] p-6">
              <p className="text-sm leading-7 text-[var(--museum-stone)]">
                <T
                  textKey="pricing.payments.description"
                  fallback="I pagamenti dei piani Pro, Business e Diamond sono gestiti tramite Stripe. Puoi attivare un piano, aggiornare metodo di pagamento, consultare rinnovi e cancellare l’abbonamento dal portale di gestione. Il piano Institution è personalizzato e richiede contatto diretto."
                />
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="museum-button-primary px-5 py-2.5"
                >
                  <T
                    textKey="pricing.actions.backToDashboard"
                    fallback="Torna alla dashboard"
                  />
                </Link>

                <Link
                  href="/legal/pagamenti"
                  className="museum-button-secondary px-5 py-2.5"
                >
                  <T
                    textKey="pricing.actions.paymentInfo"
                    fallback="Info pagamenti"
                  />
                </Link>

                <Link
                  href="/legal/cancellazioni-rimborsi"
                  className="museum-button-secondary px-5 py-2.5"
                >
                  <T
                    textKey="pricing.actions.refunds"
                    fallback="Rimborsi"
                  />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </section>

      <LegalFooter />
    </main>
  );
}