import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, display_name, role, plan, bio, website_url, instagram_url, created_at"
    )
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-50">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-neutral-500">
              Account
            </p>

            <h1 className="text-4xl font-semibold">Il tuo profilo</h1>

            <p className="mt-4 max-w-2xl text-neutral-300">
              Questa pagina è protetta. Se la stai vedendo, significa che il
              login funziona e che Next.js riesce a leggere la sessione Supabase.
            </p>
          </div>

          <LogoutButton />
        </div>

        {error && (
          <div className="mt-10 rounded-3xl border border-red-800 bg-red-950/30 p-6">
            <p className="text-lg font-medium">Errore lettura profilo</p>
            <p className="mt-2 text-neutral-300">{error.message}</p>
          </div>
        )}

        {!error && profile && (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="text-2xl font-medium">Dati account</h2>

              <dl className="mt-6 space-y-3 text-sm">
                <div>
                  <dt className="text-neutral-500">ID utente</dt>
                  <dd className="mt-1 break-all text-neutral-200">
                    {profile.id}
                  </dd>
                </div>

                <div>
                  <dt className="text-neutral-500">Email</dt>
                  <dd className="mt-1 text-neutral-200">{profile.email}</dd>
                </div>

                <div>
                  <dt className="text-neutral-500">Nome completo</dt>
                  <dd className="mt-1 text-neutral-200">
                    {profile.full_name || "Non inserito"}
                  </dd>
                </div>

                <div>
                  <dt className="text-neutral-500">Nome pubblico</dt>
                  <dd className="mt-1 text-neutral-200">
                    {profile.display_name || "Non inserito"}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="text-2xl font-medium">Permessi piattaforma</h2>

              <dl className="mt-6 space-y-3 text-sm">
                <div>
                  <dt className="text-neutral-500">Ruolo</dt>
                  <dd className="mt-1 text-neutral-200">{profile.role}</dd>
                </div>

                <div>
                  <dt className="text-neutral-500">Piano</dt>
                  <dd className="mt-1 text-neutral-200">{profile.plan}</dd>
                </div>

                <div>
                  <dt className="text-neutral-500">Creato il</dt>
                  <dd className="mt-1 text-neutral-200">
                    {new Date(profile.created_at).toLocaleString("it-IT")}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-400">
                Nella prossima fase useremo il campo{" "}
                <span className="text-neutral-100">role</span> per distinguere
                visitatori, galleristi e admin.
              </div>
            </article>
          </div>
        )}

        <div className="mt-10 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-2xl font-medium">Prossimo step</h2>

          <p className="mt-3 text-neutral-300">
            Trasformeremo questo account in gallerista e costruiremo una
            dashboard protetta dove potrai creare la prima galleria virtuale.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
  <a
    href="/dashboard"
    className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
  >
    Vai alla dashboard
  </a>

  <a
    href="/account/upgrade-gallerist"
    className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
  >
    Passa ad account Gallerista / Artista
  </a>
</div>
        </div>
      </section>
    </main>
  );
}