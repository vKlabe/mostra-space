import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import UnityGalleryViewer from "@/components/unity/UnityGalleryViewer";

type DashboardGalleryUnityEditorPageProps = {
  params: Promise<{
    galleryId: string;
  }>;
};

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type GalleryStatus = "draft" | "published" | "archived";

type Gallery = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: GalleryStatus;
  cover_image_url: string | null;
  updated_at: string | null;
  published_at: string | null;
};

function getStatusLabel(status: GalleryStatus) {
  if (status === "published") {
    return "Pubblicata";
  }

  if (status === "archived") {
    return "Archiviata";
  }

  return "Bozza";
}

function getStatusBadgeClass(status: GalleryStatus) {
  if (status === "published") {
    return "border-green-900 bg-green-950/40 text-green-300";
  }

  if (status === "archived") {
    return "border-yellow-900 bg-yellow-950/40 text-yellow-300";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-300";
}

function formatDate(value: string | null) {
  if (!value) {
    return "N/D";
  }

  try {
    return new Date(value).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/D";
  }
}

export default async function DashboardGalleryUnityEditorPage({
  params,
}: DashboardGalleryUnityEditorPageProps) {
  const { galleryId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    redirect("/auth/login");
  }

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("id, owner_id, title, slug, status, cover_image_url, updated_at, published_at")
    .eq("id", galleryId)
    .single<Gallery>();

  if (galleryError || !gallery) {
    return (
      <DashboardShell
        title="Galleria non trovata"
        subtitle="La galleria non esiste oppure non hai i permessi per leggerla."
        activeSection="gallerie"
      >
        <div className="rounded-3xl border border-red-900 bg-red-950/30 p-6">
          <p className="text-sm text-red-100">
            {galleryError?.message || "Nessun dato disponibile."}
          </p>
        </div>

        <a
          href="/dashboard/gallerie"
          className="mt-6 inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          Torna alle gallerie
        </a>
      </DashboardShell>
    );
  }

  const isAdmin = profile.role === "admin";
  const isOwner = gallery.owner_id === user.id;

  if (!isAdmin && !isOwner) {
    return (
      <DashboardShell
        title="Accesso negato"
        subtitle="Non puoi aprire l’editor Unity di questa galleria."
        activeSection="gallerie"
      >
        <div className="rounded-3xl border border-yellow-900 bg-yellow-950/30 p-6">
          <p className="text-sm text-yellow-100">
            Non sei il proprietario di questa galleria e non hai permessi admin.
          </p>
        </div>

        <a
          href="/dashboard/gallerie"
          className="mt-6 inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          Torna alle gallerie
        </a>
      </DashboardShell>
    );
  }

  const publicPageHref = `/gallerie/${gallery.slug}`;
  const visitorPreviewHref = `/unity-frame?galleryId=${gallery.id}&mode=visitor`;
  const detailHref = `/dashboard/gallerie/${gallery.id}`;

  return (
    <DashboardShell
      title={`Editor 3D — ${gallery.title}`}
      subtitle="Allestisci la galleria virtuale, posiziona le opere sulle pareti, modifica dimensioni e cornici, poi salva le modifiche."
      activeSection="gallerie"
      actions={
        <>
          <a
            href={detailHref}
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Dettaglio galleria
          </a>

          <a
            href={visitorPreviewHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-blue-800 px-5 py-2 text-sm text-blue-200 transition hover:border-blue-500"
          >
            Anteprima visitatore
          </a>

          {gallery.status === "published" && (
            <a
              href={publicPageHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-green-800 px-5 py-2 text-sm text-green-200 transition hover:border-green-500"
            >
              Pagina pubblica
            </a>
          )}

          <a
            href="/dashboard/gallerie"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Esci
          </a>
        </>
      }
    >
      <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
                Editor Unity WebGL
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-medium">{gallery.title}</h2>

                <span
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] ${getStatusBadgeClass(
                    gallery.status
                  )}`}
                >
                  {getStatusLabel(gallery.status)}
                </span>
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
                Trascina le opere sulle pareti, regola dimensioni e cornice dal
                pannello destro, poi usa <span className="text-neutral-100">Salva opera</span> o{" "}
                <span className="text-neutral-100">Salva tutto</span> dentro
                Unity.
              </p>
            </div>

            {gallery.cover_image_url && (
              <div className="w-full overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 md:w-44">
                <img
                  src={gallery.cover_image_url}
                  alt={gallery.title}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Stato lavoro
          </p>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Status</dt>
              <dd className="text-neutral-100">{getStatusLabel(gallery.status)}</dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Ultima modifica</dt>
              <dd className="text-right text-neutral-100">
                {formatDate(gallery.updated_at)}
              </dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Pubblicazione</dt>
              <dd className="text-right text-neutral-100">
                {formatDate(gallery.published_at)}
              </dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Slug</dt>
              <dd className="break-all text-right text-neutral-100">
                {gallery.slug}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="overflow-hidden rounded-3xl border border-neutral-800 bg-black shadow-2xl">
        <div className="flex flex-col justify-between gap-3 border-b border-neutral-800 bg-neutral-950 px-5 py-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium text-neutral-100">
              Area editor 3D
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              Usa la tastiera per muoverti. Il mouse resta libero per drag,
              pannelli e campi numerici.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
            <span className="rounded-full border border-neutral-800 px-3 py-1">
              WASD movimento
            </span>

            <span className="rounded-full border border-neutral-800 px-3 py-1">
              Q/E ruota
            </span>

            <span className="rounded-full border border-neutral-800 px-3 py-1">
              R/F quota
            </span>

            <span className="rounded-full border border-neutral-800 px-3 py-1">
              Drag opera
            </span>
          </div>
        </div>

        <UnityGalleryViewer galleryId={gallery.id} mode="editor" />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
            1. Posiziona
          </p>

          <h3 className="text-lg font-medium">Trascina le opere</h3>

          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Seleziona un’opera dalla sidebar sinistra o clicca un’opera già
            appesa. Trascinala su una parete e rilasciala.
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
            2. Modifica
          </p>

          <h3 className="text-lg font-medium">Dimensioni e cornice</h3>

          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Dal pannello destro puoi impostare larghezza, altezza, colore della
            cornice, spessore e profondità.
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-neutral-500">
            3. Salva
          </p>

          <h3 className="text-lg font-medium">Non uscire senza salvare</h3>

          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Dopo ogni modifica importante usa <span className="text-neutral-100">Salva opera</span> o{" "}
            <span className="text-neutral-100">Salva tutto</span>. Poi apri
            l’anteprima visitatore per controllare il risultato.
          </p>
        </article>
      </section>

      {gallery.status !== "published" && (
        <section className="mt-6 rounded-3xl border border-yellow-900 bg-yellow-950/20 p-6">
          <p className="text-sm font-medium text-yellow-200">
            La galleria non è ancora pubblica
          </p>

          <p className="mt-2 text-sm leading-6 text-yellow-100/80">
            Puoi usare l’anteprima visitatore per controllare il viewer 3D. La
            pagina pubblica completa sarà disponibile solo dopo la pubblicazione
            dal dettaglio galleria.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={visitorPreviewHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-blue-800 px-5 py-2 text-sm text-blue-200 transition hover:border-blue-500"
            >
              Apri anteprima visitatore
            </a>

            <a
              href={detailHref}
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              Vai alla pubblicazione
            </a>
          </div>
        </section>
      )}
    </DashboardShell>
  );
}