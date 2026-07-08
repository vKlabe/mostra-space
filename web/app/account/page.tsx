import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import AccountProfileForm from "@/components/account/AccountProfileForm";
import DeleteAccountPanel from "@/components/account/DeleteAccountPanel";

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
  if (plan === "institution") {
    return "Institution";
  }

  if (plan === "business") {
    return "Business";
  }

  if (plan === "pro") {
    return "Pro";
  }

  return "Free";
}

function getPlanDescription(plan?: string | null) {
  if (plan === "institution") {
    return "Piano pensato per istituzioni, fondazioni, musei e progetti espositivi complessi.";
  }

  if (plan === "business") {
    return "Piano pensato per gallerie strutturate, studi e realta professionali.";
  }

  if (plan === "pro") {
    return "Piano pensato per creator, artisti e gallerie che vogliono piu spazio e piu strumenti.";
  }

  return "Piano iniziale per esplorare la piattaforma e iniziare a costruire il proprio profilo.";
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
            Account
          </p>

          <h1 className="text-4xl font-semibold">Profilo non disponibile</h1>

          <div className="mt-8 rounded-3xl border border-red-800 bg-red-950/30 p-6">
            <p className="text-lg font-medium">Errore lettura profilo</p>
            <p className="mt-2 text-neutral-300">
              {error?.message || "Profilo assente."}
            </p>
          </div>
        </section>
      </main>
    );
  }

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
    ? new Date(profile.created_at).toLocaleString("it-IT")
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
            Profilo personale
          </p>

          <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-neutral-100">
                {displayName}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                Questa e la tua identita dentro mostra.space. Da qui puoi
                controllare dati account, ruolo, piano e strumenti disponibili.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="/dashboard/social"
                  className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                >
                  Vai alla sezione Social
                </a>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-200">
                {roleLabel}
              </span>

              <span className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-200">
                Piano {planLabel}
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
              Stato piattaforma
            </h2>

            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-neutral-500">Ruolo</dt>
                <dd className="mt-1 text-neutral-200">{roleLabel}</dd>
              </div>

              <div>
                <dt className="text-neutral-500">Piano</dt>
                <dd className="mt-1 text-neutral-200">{planLabel}</dd>
              </div>

              <div>
                <dt className="text-neutral-500">Creato il</dt>
                <dd className="mt-1 text-neutral-200">{createdAt}</dd>
              </div>

              <div>
                <dt className="text-neutral-500">Profilo pubblico</dt>
                <dd className="mt-1 break-all text-neutral-200">
                  {publicProfileHref ? (
                    <a
                      href={publicProfileHref}
                      className="text-neutral-100 underline decoration-neutral-700 underline-offset-4 transition hover:decoration-neutral-300"
                    >
                      {publicProfileHref}
                    </a>
                  ) : (
                    "Non disponibile"
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Sito / social pubblico</dt>
                <dd className="mt-1 break-all text-neutral-200">
                  {publicReference}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Bio</dt>
                <dd className="mt-1 whitespace-pre-line text-neutral-200">
                  {profile.bio || "Non inserita"}
                </dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              {isCreator ? "Profilo creator" : "Profilo community"}
            </p>

            <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
              {isCreator
                ? "Strumenti creator attivi"
                : "Account community attivo"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-neutral-400">
              {isCreator
                ? "Questo account puo creare e gestire gallerie, opere, richieste e spazi espositivi. Mantiene comunque tutti gli strumenti community."
                : "Questo account puo esplorare la piattaforma, salvare preferiti, inviare richieste e costruire il proprio profilo personale."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/dashboard"
                className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
              >
                Vai alla dashboard
              </a>

              {!isCreator && (
                <a
                  href="/account/upgrade-gallerist"
                  className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                >
                  Passa a Gallerista / Artista
                </a>
              )}

              {isCreator && (
                <a
                  href="/dashboard/gallerie"
                  className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                >
                  Gestisci gallerie
                </a>
              )}

              {isAdmin && (
                <a
                  href="/admin"
                  className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
                >
                  Area admin
                </a>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Piano attuale
            </p>

            <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
              {planLabel}
            </h2>

            <p className="mt-3 text-sm leading-6 text-neutral-400">
              {planDescription}
            </p>

            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-sm font-medium text-neutral-200">
                Limiti account
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-500">
                In questa fase mostriamo il piano attuale. Nella prossima fase
                collegheremo qui limiti reali su gallerie, opere, storage,
                template disponibili e richieste.
              </p>
            </div>
          </article>
        </section>

        <DeleteAccountPanel email={profile.email || user.email || ""} />

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Impostazioni base
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="font-medium text-neutral-200">Sicurezza</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Gestione password, magic link e sessioni verra aggiunta nelle
                prossime fasi.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="font-medium text-neutral-200">Preferenze</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Qui arriveranno notifiche, lingua, privacy e preferenze
                community.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="font-medium text-neutral-200">Uscita account</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Puoi terminare la sessione corrente con il pulsante in alto.
              </p>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
