import AdminShell from "@/components/admin/AdminShell";
import AdminUserControls from "@/components/admin/AdminUserControls";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import type { PlanName } from "@/lib/plans";

type UserRole = "user" | "gallerist" | "admin";
type UserPlan = PlanName;

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: UserRole;
  plan: UserPlan;
  created_at: string;
};

type Gallery = {
  id: string;
  owner_id: string;
  status: "draft" | "published" | "archived";
};

type Artwork = {
  id: string;
  owner_id: string;
  file_size_bytes: number | null;
};

function getRoleBadgeClass(role: UserRole) {
  if (role === "admin") {
    return "border-red-900 bg-red-950/40 text-red-300";
  }

  if (role === "gallerist") {
    return "border-blue-900 bg-blue-950/40 text-blue-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-400";
}

function getPlanBadgeClass(plan: UserPlan) {
  if (plan === "institution") {
    return "border-purple-900 bg-purple-950/40 text-purple-300";
  }

  if (plan === "diamond") {
    return "border-white/30 bg-white/10 text-white";
  }

  if (plan === "business") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (plan === "pro") {
    return "border-blue-900 bg-blue-950/40 text-blue-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-400";
}

function getPlanLabel(plan: UserPlan) {
  if (plan === "institution") {
    return "Institution";
  }

  if (plan === "diamond") {
    return "Diamond";
  }

  if (plan === "business") {
    return "Business";
  }

  if (plan === "pro") {
    return "Pro";
  }

  return "Free";
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("it-IT");
}

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) {
    return "0 MB";
  }

  const mb = bytes / 1024 / 1024;

  if (mb < 1024) {
    return `${mb.toFixed(2)} MB`;
  }

  const gb = mb / 1024;

  return `${gb.toFixed(2)} GB`;
}

export default async function AdminUsersPage() {
  const { admin, user } = await requireAdmin();

  const [profilesResult, galleriesResult, artworksResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, display_name, full_name, role, plan, created_at")
      .order("created_at", { ascending: false }),
    admin.from("galleries").select("id, owner_id, status"),
    admin.from("artworks").select("id, owner_id, file_size_bytes"),
  ]);

  const profiles = (profilesResult.data || []) as Profile[];
  const galleries = (galleriesResult.data || []) as Gallery[];
  const artworks = (artworksResult.data || []) as Artwork[];

  const usersCount = profiles.length;
  const adminsCount = profiles.filter((item) => item.role === "admin").length;
  const galleristsCount = profiles.filter(
    (item) => item.role === "gallerist"
  ).length;

  const institutionCount = profiles.filter(
    (item) => item.plan === "institution"
  ).length;
  const diamondCount = profiles.filter((item) => item.plan === "diamond").length;
  const businessCount = profiles.filter(
    (item) => item.plan === "business"
  ).length;
  const proCount = profiles.filter((item) => item.plan === "pro").length;
  const freeCount = profiles.filter((item) => item.plan === "free").length;

  return (
    <AdminShell
      title="Utenti"
      subtitle="Gestisci manualmente ruoli e piani account. Questa schermata sostituisce temporaneamente Stripe/admin billing nella fase MVP."
      activeSection="users"
    >
      {(profilesResult.error || galleriesResult.error || artworksResult.error) && (
        <div className="mb-6 rounded-3xl border border-red-800 bg-red-950/30 p-6">
          <p className="text-lg font-medium">Errore caricamento utenti</p>

          {profilesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Profiles: {profilesResult.error.message}
            </p>
          )}

          {galleriesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Galleries: {galleriesResult.error.message}
            </p>
          )}

          {artworksResult.error && (
            <p className="mt-2 text-sm text-red-100">
              Artworks: {artworksResult.error.message}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Utenti totali
          </p>

          <p className="text-4xl font-semibold">{usersCount}</p>

          <p className="mt-3 text-sm text-neutral-400">
            {adminsCount} admin · {galleristsCount} galleristi
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Free
          </p>

          <p className="text-4xl font-semibold">{freeCount}</p>

          <p className="mt-3 text-sm text-neutral-400">Account base</p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Pro / Business
          </p>

          <p className="text-4xl font-semibold">{proCount + businessCount}</p>

          <p className="mt-3 text-sm text-neutral-400">
            {proCount} pro · {businessCount} business
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Diamond
          </p>

          <p className="text-4xl font-semibold">{diamondCount}</p>

          <p className="mt-3 text-sm text-neutral-400">
            Account premium
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Institution
          </p>

          <p className="text-4xl font-semibold">{institutionCount}</p>

          <p className="mt-3 text-sm text-neutral-400">
            Account istituzionali
          </p>
        </article>
      </div>

      <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Lista utenti
            </p>

            <h2 className="text-2xl font-medium">Account registrati</h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
              Puoi cambiare ruolo e piano manualmente. Il cambio piano incide
              subito sui limiti di gallerie, opere, storage e richieste.
            </p>
          </div>

          <a
            href="/admin"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Torna overview
          </a>
        </div>

        {profiles.length === 0 && (
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <p className="text-neutral-300">Nessun utente registrato.</p>
          </div>
        )}

        {profiles.length > 0 && (
          <div className="mt-6 space-y-4">
            {profiles.map((profile) => {
              const userGalleries = galleries.filter(
                (gallery) => gallery.owner_id === profile.id
              );

              const userArtworks = artworks.filter(
                (artwork) => artwork.owner_id === profile.id
              );

              const userStorageBytes = userArtworks.reduce(
                (total, artwork) => total + (artwork.file_size_bytes || 0),
                0
              );

              const publishedGalleries = userGalleries.filter(
                (gallery) => gallery.status === "published"
              ).length;

              const displayName =
                profile.display_name ||
                profile.full_name ||
                profile.email ||
                "Utente senza nome";

              return (
                <article
                  key={profile.id}
                  className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getRoleBadgeClass(
                            profile.role
                          )}`}
                        >
                          {profile.role}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getPlanBadgeClass(
                            profile.plan
                          )}`}
                        >
                          {getPlanLabel(profile.plan)}
                        </span>

                        {profile.id === user.id && (
                          <span className="rounded-full border border-red-900 bg-red-950/40 px-3 py-1 text-xs uppercase tracking-[0.15em] text-red-300">
                            Tu
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 text-2xl font-medium">
                        {displayName}
                      </h3>

                      <p className="mt-2 break-all text-sm text-neutral-400">
                        {profile.email || "Email assente"}
                      </p>

                      <dl className="mt-5 grid gap-4 text-sm md:grid-cols-4">
                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Gallerie
                          </dt>
                          <dd className="mt-2 text-xl font-semibold text-neutral-100">
                            {userGalleries.length}
                          </dd>
                          <p className="mt-1 text-xs text-neutral-500">
                            {publishedGalleries} pubblicate
                          </p>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Opere
                          </dt>
                          <dd className="mt-2 text-xl font-semibold text-neutral-100">
                            {userArtworks.length}
                          </dd>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Storage
                          </dt>
                          <dd className="mt-2 text-xl font-semibold text-neutral-100">
                            {formatBytes(userStorageBytes)}
                          </dd>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Creato
                          </dt>
                          <dd className="mt-2 text-xs leading-5 text-neutral-300">
                            {formatDate(profile.created_at)}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <AdminUserControls
                      userId={profile.id}
                      currentRole={profile.role}
                      currentPlan={profile.plan}
                      isCurrentAdminUser={profile.id === user.id}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AdminShell>
  );
}