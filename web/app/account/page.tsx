import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import AccountProfileForm from "@/components/account/AccountProfileForm";
import DeleteAccountPanel from "@/components/account/DeleteAccountPanel";
import T from "@/components/i18n/T";
import {
  PLAN_LIMITS,
  formatLimitValue,
  formatMb,
  normalizePlanName,
  type PlanName,
} from "@/lib/plans";

function getRoleLabel(role?: string | null) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "gallerist") {
    return "Gallerista / Artista";
  }

  return "Visitor";
}

function getPlanLabel(plan?: string | null) {
  return PLAN_LIMITS[normalizePlanName(plan)].label;
}

function getPlanDescription(plan?: string | null) {
  const normalizedPlan = normalizePlanName(plan);

  if (normalizedPlan === "institution") {
    return "Piano personalizzato per istituzioni, fondazioni, musei, fiere e progetti espositivi complessi.";
  }

  if (normalizedPlan === "diamond") {
    return "Piano premium per gallerie strutturate, cataloghi ampi e attività espositive digitali più intense.";
  }

  if (normalizedPlan === "business") {
    return "Piano pensato per gallerie strutturate, studi e realtà professionali.";
  }

  if (normalizedPlan === "pro") {
    return "Piano pensato per creator, artisti e gallerie che vogliono più spazio e più strumenti.";
  }

  return "Piano iniziale per esplorare la piattaforma e iniziare a costruire il proprio profilo.";
}

function getPlanBadgeClass(plan?: string | null) {
  const normalizedPlan = normalizePlanName(plan);

  if (normalizedPlan === "institution") {
    return "border-red-900 bg-red-950/40 text-red-300";
  }

  if (normalizedPlan === "diamond") {
    return "border-white/30 bg-white/10 text-white";
  }

  if (normalizedPlan === "business") {
    return "border-purple-900 bg-purple-950/40 text-purple-300";
  }

  if (normalizedPlan === "pro") {
    return "border-blue-900 bg-blue-950/40 text-blue-300";
  }

  return "border-green-900 bg-green-950/40 text-green-300";
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("it-IT");
}

export default async function AccountPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      "id, email, full_name, display_name, avatar_url, role, plan, bio, website_url, instagram_url, profile_slug, public_profile_enabled, created_at"
    )
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
        <section className="mx-auto max-w-5xl">
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-neutral-500">
            <T textKey="account.error.label" fallback="Account" />
          </p>

          <h1 className="text-4xl font-semibold">
            <T
              textKey="account.error.profileUnavailable"
              fallback="Profilo non disponibile"
            />
          </h1>

          <div className="mt-8 rounded-3xl border border-red-800 bg-red-950/30 p-6">
            <p className="text-lg font-medium">
              <T
                textKey="account.error.profileReadError"
                fallback="Errore lettura profilo"
              />
            </p>
            <p className="mt-2 text-neutral-300">
              {error?.message ? (
                error.message
              ) : (
                <T
                  textKey="account.error.profileMissing"
                  fallback="Profilo assente."
                />
              )}
            </p>
          </div>
        </section>
      </main>
    );
  }

  const normalizedPlan = normalizePlanName(profile.plan);
  const planLimits = PLAN_LIMITS[normalizedPlan];

  const isCreator = profile.role === "gallerist" || profile.role === "admin";
  const isAdmin = profile.role === "admin";
  const roleLabel = getRoleLabel(profile.role);
  const planLabel = getPlanLabel(profile.plan);
  const planDescription = getPlanDescription(profile.plan);

  const displayName =
    profile.display_name || profile.full_name || profile.email || "Account";

  const publicReference =
    profile.website_url || profile.instagram_url || "Non inserito";

  const createdAt = profile.created_at
    ? formatDate(profile.created_at)
    : "Non disponibile";

  const publicProfileHref =
    profile.profile_slug && profile.public_profile_enabled
      ? `/profili/${profile.profile_slug}`
      : null;

  return (
    <DashboardShell
      title="Account"
      subtitle="Profilo, piano, ruolo e impostazioni personali del tuo spazio su mostra.space."
      activeSection="account"
      navMode={isCreator ? "creator" : "community"}
    >
      <div className="space-y-8">
        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            <T
              textKey="account.profile.label"
              fallback="Profilo personale"
            />
          </p>

          <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-neutral-100">
                {displayName}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                <T
                  textKey="account.profile.description"
                  fallback="Questa è la tua identità dentro mostra.space. Da qui puoi controllare dati account, ruolo, piano e strumenti disponibili."
                />
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="/dashboard/social"
                  className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                >
                  <T
                    textKey="account.profile.goToSocial"
                    fallback="Vai alla sezione Social"
                  />
                </a>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-200">
                {roleLabel}
              </span>

              <span
                className={`rounded-full border px-4 py-2 text-sm ${getPlanBadgeClass(
                  profile.plan
                )}`}
              >
                <T textKey="account.profile.planPrefix" fallback="Piano" />{" "}
                {planLabel}
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <AccountProfileForm
            profile={{
              email: profile.email || user.email || "",
              full_name: profile.full_name,
              display_name: profile.display_name,
              website_url: profile.website_url,
              instagram_url: profile.instagram_url,
              bio: profile.bio,
            }}
          />

          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-2xl font-medium text-neutral-100">
              <T
                textKey="account.platformStatus.title"
                fallback="Stato piattaforma"
              />
            </h2>

            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-neutral-500">
                  <T
                    textKey="account.platformStatus.role"
                    fallback="Ruolo"
                  />
                </dt>
                <dd className="mt-1 text-neutral-200">{roleLabel}</dd>
              </div>

              <div>
                <dt className="text-neutral-500">
                  <T
                    textKey="account.platformStatus.plan"
                    fallback="Piano"
                  />
                </dt>
                <dd className="mt-1 text-neutral-200">{planLabel}</dd>
              </div>

              <div>
                <dt className="text-neutral-500">
                  <T
                    textKey="account.platformStatus.createdAt"
                    fallback="Creato il"
                  />
                </dt>
                <dd className="mt-1 text-neutral-200">{createdAt}</dd>
              </div>

              <div>
                <dt className="text-neutral-500">
                  <T
                    textKey="account.platformStatus.publicProfile"
                    fallback="Profilo pubblico"
                  />
                </dt>
                <dd className="mt-1 break-all text-neutral-200">
                  {publicProfileHref ? (
                    <a
                      href={publicProfileHref}
                      className="text-neutral-100 underline decoration-neutral-700 underline-offset-4 transition hover:decoration-neutral-300"
                    >
                      {publicProfileHref}
                    </a>
                  ) : (
                    <T
                      textKey="account.platformStatus.notAvailable"
                      fallback="Non disponibile"
                    />
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">
                  <T
                    textKey="account.platformStatus.publicWebsite"
                    fallback="Sito / social pubblico"
                  />
                </dt>
                <dd className="mt-1 break-all text-neutral-200">
                  {publicReference}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">
                  <T
                    textKey="account.platformStatus.bio"
                    fallback="Bio"
                  />
                </dt>
                <dd className="mt-1 whitespace-pre-line text-neutral-200">
                  {profile.bio ? (
                    profile.bio
                  ) : (
                    <T
                      textKey="account.platformStatus.bioMissing"
                      fallback="Non inserita"
                    />
                  )}
                </dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              {isCreator ? (
                <T
                  textKey="account.type.creatorLabel"
                  fallback="Profilo creator"
                />
              ) : (
                <T
                  textKey="account.type.communityLabel"
                  fallback="Profilo community"
                />
              )}
            </p>

            <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
              {isCreator ? (
                <T
                  textKey="account.type.creatorTitle"
                  fallback="Strumenti creator attivi"
                />
              ) : (
                <T
                  textKey="account.type.communityTitle"
                  fallback="Account community attivo"
                />
              )}
            </h2>

            <p className="mt-3 text-sm leading-6 text-neutral-400">
              {isCreator ? (
                <T
                  textKey="account.type.creatorDescription"
                  fallback="Questo account può creare e gestire gallerie, opere, richieste e spazi espositivi. Mantiene comunque tutti gli strumenti community."
                />
              ) : (
                <T
                  textKey="account.type.communityDescription"
                  fallback="Questo account può esplorare la piattaforma, salvare preferiti, inviare richieste e costruire il proprio profilo personale."
                />
              )}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/dashboard"
                className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
              >
                <T
                  textKey="account.actions.goToDashboard"
                  fallback="Vai alla dashboard"
                />
              </a>

              {!isCreator && (
                <a
                  href="/account/upgrade-gallerist"
                  className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                >
                  <T
                    textKey="account.actions.upgradeToGallerist"
                    fallback="Passa a Gallerista / Artista"
                  />
                </a>
              )}

              {isCreator && (
                <a
                  href="/dashboard/gallerie"
                  className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                >
                  <T
                    textKey="account.actions.manageGalleries"
                    fallback="Gestisci gallerie"
                  />
                </a>
              )}

              {isAdmin && (
                <a
                  href="/admin"
                  className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                >
                  <T
                    textKey="account.actions.adminArea"
                    fallback="Area admin"
                  />
                </a>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              <T
                textKey="account.currentPlan.label"
                fallback="Piano attuale"
              />
            </p>

            <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
              {planLabel}
            </h2>

            <p className="mt-3 text-sm leading-6 text-neutral-400">
              {planDescription}
            </p>

            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm font-medium text-neutral-200">
                <T
                  textKey="account.currentPlan.accountLimits"
                  fallback="Limiti account"
                />
              </p>

              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">
                    <T
                      textKey="account.currentPlan.galleries"
                      fallback="Gallerie"
                    />
                  </dt>
                  <dd className="text-neutral-200">
                    {formatLimitValue(planLimits.maxGalleries)}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">
                    <T
                      textKey="account.currentPlan.totalArtworks"
                      fallback="Opere totali"
                    />
                  </dt>
                  <dd className="text-neutral-200">
                    {formatLimitValue(planLimits.maxArtworksTotal)}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">
                    <T
                      textKey="account.currentPlan.storage"
                      fallback="Storage"
                    />
                  </dt>
                  <dd className="text-neutral-200">
                    {formatMb(planLimits.maxStorageMb)}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">
                    <T
                      textKey="account.currentPlan.fileSize"
                      fallback="Peso file"
                    />
                  </dt>
                  <dd className="text-neutral-200">
                    {formatMb(planLimits.maxArtworkFileMb)}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">
                    <T
                      textKey="account.currentPlan.requestsPerMonth"
                      fallback="Richieste/mese"
                    />
                  </dt>
                  <dd className="text-neutral-200">
                    {formatLimitValue(planLimits.maxRequestsPerMonth)}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500">
                    <T
                      textKey="account.currentPlan.templates"
                      fallback="Template"
                    />
                  </dt>
                  <dd className="text-neutral-200">
                    {planLimits.selectableTemplates === null ? (
                      <T
                        textKey="account.currentPlan.allTemplates"
                        fallback="Tutti"
                      />
                    ) : (
                      planLimits.selectableTemplates
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </article>
        </section>

        <DeleteAccountPanel email={profile.email || user.email || ""} />

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            <T
              textKey="account.settings.label"
              fallback="Impostazioni base"
            />
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="font-medium text-neutral-200">
                <T
                  textKey="account.settings.security.title"
                  fallback="Sicurezza"
                />
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                <T
                  textKey="account.settings.security.description"
                  fallback="Gestione password, magic link e sessioni verrà aggiunta nelle prossime fasi."
                />
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="font-medium text-neutral-200">
                <T
                  textKey="account.settings.preferences.title"
                  fallback="Preferenze"
                />
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                <T
                  textKey="account.settings.preferences.description"
                  fallback="Qui arriveranno notifiche, lingua, privacy e preferenze community."
                />
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="font-medium text-neutral-200">
                <T
                  textKey="account.settings.logout.title"
                  fallback="Uscita account"
                />
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                <T
                  textKey="account.settings.logout.description"
                  fallback="Puoi terminare la sessione corrente con il pulsante in alto."
                />
              </p>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}