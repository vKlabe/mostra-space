import { createClient } from "@/lib/supabase/server";
import {
  PLAN_LIMITS,
  PLAN_ORDER,
  formatLimitValue,
  formatMb,
  normalizePlanName,
  type PlanName,
} from "@/lib/plans";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "institution";
};

function getPlanBadgeClass(plan: PlanName) {
  if (plan === "free") {
    return "border-neutral-700 bg-neutral-950 text-neutral-300";
  }

  if (plan === "pro") {
    return "border-blue-900 bg-blue-950/40 text-blue-300";
  }

  if (plan === "business") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  return "border-purple-900 bg-purple-950/40 text-purple-300";
}

function getPlanDescription(plan: PlanName) {
  if (plan === "free") {
    return "Per testare il portale, creare una prima galleria e capire il flusso.";
  }

  if (plan === "pro") {
    return "Per artisti, piccoli studi e gallerie che vogliono usare il viewer in modo continuativo.";
  }

  if (plan === "business") {
    return "Per gallerie strutturate, progetti commerciali e cataloghi più ampi.";
  }

  return "Per musei, fondazioni, istituzioni, fiere e progetti custom ad alto volume.";
}

function getCtaLabel(plan: PlanName, currentPlan: PlanName | null) {
  if (currentPlan === plan) {
    return "Piano attuale";
  }

  if (!currentPlan) {
    return "Richiedi informazioni";
  }

  if (plan === "free") {
    return "Piano base";
  }

  return `Richiedi ${PLAN_LIMITS[plan].label}`;
}

function getMailtoHref(plan: PlanName, userEmail?: string | null) {
  const subject = encodeURIComponent(
    `Richiesta upgrade piano ${PLAN_LIMITS[plan].label}`
  );

  const body = encodeURIComponent(
    [
      `Ciao,`,
      ``,
      `vorrei ricevere informazioni per attivare il piano ${PLAN_LIMITS[plan].label}.`,
      userEmail ? `Email account: ${userEmail}` : "",
      ``,
      `Grazie.`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  return `mailto:info@galleriabarattolo.it?subject=${subject}&body=${body}`;
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
      .select("id, email, display_name, full_name, role, plan")
      .eq("id", user.id)
      .single<Profile>();

    profile = data || null;
  }

  const currentPlan = profile ? normalizePlanName(profile.plan) : null;

  return (
    <main className="min-h-screen bg-neutral-950 px-5 py-8 text-neutral-50 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.35em] text-neutral-500">
              Pricing
            </p>

            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              Scegli il piano per il tuo spazio espositivo virtuale.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-7 text-neutral-400">
              I piani controllano gallerie, opere, storage, template,
              richieste mensili e limiti WebGL. Per ora questa pagina è un
              placeholder: l’upgrade viene gestito manualmente.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Dashboard
            </a>

            <a
              href="/gallerie"
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Gallerie pubbliche
            </a>
          </div>
        </header>

        {profile && (
          <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Account collegato:{" "}
              <span className="text-neutral-100">
                {profile.display_name ||
                  profile.full_name ||
                  profile.email ||
                  "utente"}
              </span>
            </p>

            <p className="mt-2 text-sm text-neutral-400">
              Piano attuale:{" "}
              <span className="capitalize text-neutral-100">
                {currentPlan}
              </span>
            </p>
          </div>
        )}

        {!profile && (
          <div className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Non hai effettuato l’accesso. Puoi comunque consultare i piani.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/auth/login"
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                Accedi
              </a>

              <a
                href="/auth/register"
                className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
              >
                Registrati
              </a>
            </div>
          </div>
        )}

        <div className="mt-10 grid gap-5 lg:grid-cols-4">
          {PLAN_ORDER.map((planName) => {
            const plan = PLAN_LIMITS[planName];
            const isCurrent = currentPlan === planName;

            return (
              <article
                key={plan.name}
                className={
                  isCurrent
                    ? "relative rounded-3xl border border-white bg-neutral-900 p-6 shadow-2xl"
                    : "relative rounded-3xl border border-neutral-800 bg-neutral-900 p-6"
                }
              >
                {isCurrent && (
                  <div className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-950">
                    Attuale
                  </div>
                )}

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getPlanBadgeClass(
                    plan.name
                  )}`}
                >
                  {plan.label}
                </span>

                <h2 className="mt-5 text-3xl font-semibold">
                  {plan.monthlyPriceLabel}
                </h2>

                <p className="mt-4 min-h-20 text-sm leading-6 text-neutral-400">
                  {getPlanDescription(plan.name)}
                </p>

                <div className="mt-6">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-full border border-neutral-700 px-5 py-3 text-sm text-neutral-500"
                    >
                      {getCtaLabel(plan.name, currentPlan)}
                    </button>
                  ) : (
                    <a
                      href={getMailtoHref(plan.name, profile?.email)}
                      className={
                        plan.name === "free"
                          ? "flex w-full justify-center rounded-full border border-neutral-700 px-5 py-3 text-sm text-neutral-100 transition hover:border-neutral-400"
                          : "flex w-full justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                      }
                    >
                      {getCtaLabel(plan.name, currentPlan)}
                    </a>
                  )}
                </div>

                <div className="mt-6 space-y-4 border-t border-neutral-800 pt-6">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-500">Gallerie</span>
                    <span className="text-neutral-200">
                      {formatLimitValue(plan.maxGalleries)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-500">Opere totali</span>
                    <span className="text-neutral-200">
                      {formatLimitValue(plan.maxArtworksTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-500">Opere/galleria</span>
                    <span className="text-neutral-200">
                      {formatLimitValue(plan.maxArtworksPerGallery)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-500">Storage</span>
                    <span className="text-neutral-200">
                      {formatMb(plan.maxStorageMb)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-500">Peso file</span>
                    <span className="text-neutral-200">
                      {formatMb(plan.maxArtworkFileMb)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-500">Richieste/mese</span>
                    <span className="text-neutral-200">
                      {formatLimitValue(plan.maxRequestsPerMonth)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-500">Template</span>
                    <span className="text-neutral-200">
                      {plan.selectableTemplates === null
                        ? "Tutti"
                        : plan.selectableTemplates}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-neutral-500">WebGL/sala</span>
                    <span className="text-neutral-200">
                      {formatLimitValue(plan.maxArtworksVisiblePerRoom)}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <section className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Nota tecnica
              </p>

              <h2 className="text-2xl font-medium">
                Storage account ≠ runtime WebGL.
              </h2>

              <p className="mt-4 text-sm leading-7 text-neutral-400">
                Lo storage indica quante opere puoi archiviare sul tuo account.
                Il runtime WebGL indica invece quante opere vengono caricate
                nella singola sala quando un visitatore apre il viewer. Questo
                evita di appesantire browser e computer dei visitatori.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
              <p className="text-sm leading-7 text-neutral-400">
                In questa fase l’upgrade è solo dimostrativo. I pulsanti
                preparano una richiesta via email. Nella fase successiva si può
                collegare Stripe, Paddle oppure una gestione manuale tramite
                pannello admin.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="/dashboard"
                  className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                >
                  Torna alla dashboard
                </a>

                <a
                  href="mailto:info@galleriabarattolo.it?subject=Richiesta%20informazioni%20piani%20Art%20Portal"
                  className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                >
                  Contattaci
                </a>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}