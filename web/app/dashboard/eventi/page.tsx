import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import CreateGalleryEventForm from "@/components/events/CreateGalleryEventForm";
import GalleryEventActions from "@/components/events/GalleryEventActions";

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
};

type Gallery = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  cover_image_url: string | null;
};

type GalleryEvent = {
  id: string;
  owner_id: string;
  gallery_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
  created_at: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusLabel(status: GalleryEvent["status"]) {
  if (status === "live") {
    return "Live";
  }

  if (status === "completed") {
    return "Terminato";
  }

  if (status === "cancelled") {
    return "Annullato";
  }

  return "Programmato";
}

function getStatusClass(status: GalleryEvent["status"]) {
  if (status === "completed") {
    return "border-neutral-700 bg-neutral-950 text-neutral-400";
  }

  if (status === "cancelled") {
    return "border-red-900 bg-red-950/30 text-red-200";
  }

  if (status === "live") {
    return "border-emerald-900 bg-emerald-950/35 text-emerald-200";
  }

  return "border-amber-900 bg-amber-950/25 text-amber-200";
}

export default async function DashboardEventsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    redirect("/dashboard");
  }

  const canManageEvents =
    profile.role === "gallerist" || profile.role === "admin";

  if (!canManageEvents) {
    return (
      <DashboardShell
        title="Eventi"
        subtitle="Gli eventi sono disponibili per galleristi, artisti e admin."
        activeSection="gallerie"
      >
        <a
          href="/dashboard"
          className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          Torna alla dashboard
        </a>
      </DashboardShell>
    );
  }

  await admin
    .from("gallery_events")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("status", ["scheduled", "live"])
    .lte("ends_at", new Date().toISOString());

  const galleryQuery = admin
    .from("galleries")
    .select("id, owner_id, title, slug, status, cover_image_url")
    .order("created_at", { ascending: false });

  const { data: galleries } =
    profile.role === "admin"
      ? await galleryQuery
      : await galleryQuery.eq("owner_id", user.id);

  const eventQuery = admin
    .from("gallery_events")
    .select(
      "id, owner_id, gallery_id, title, description, starts_at, ends_at, timezone, status, created_at"
    )
    .order("starts_at", { ascending: true });

  const { data: events } =
    profile.role === "admin"
      ? await eventQuery
      : await eventQuery.eq("owner_id", user.id);

  const safeGalleries = (galleries || []) as Gallery[];
  const safeEvents = (events || []) as GalleryEvent[];
  const galleryById = new Map(safeGalleries.map((gallery) => [gallery.id, gallery]));

  const activeGalleryIds = new Set(
    safeEvents
      .filter((event) => event.status === "scheduled" || event.status === "live")
      .map((event) => event.gallery_id)
  );

  const galleryOptions = safeGalleries.map((gallery) => ({
    ...gallery,
    hasActiveEvent: activeGalleryIds.has(gallery.id),
  }));

  const upcomingEvents = safeEvents.filter(
    (event) => event.status === "scheduled" || event.status === "live"
  );

  const closedEvents = safeEvents.filter(
    (event) => event.status === "completed" || event.status === "cancelled"
  );

  return (
    <DashboardShell
      title="Eventi"
      subtitle="Crea eventi collegati alle tue gallerie. Ogni galleria può avere massimo un evento attivo."
      activeSection="gallerie"
      actions={
        <div className="flex flex-wrap gap-3">
          <a
            href="/eventi"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Calendario pubblico
          </a>

          <a
            href="/account/calendario"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Il mio calendario
          </a>
        </div>
      }
    >
      <div className="space-y-8">
        <CreateGalleryEventForm galleries={galleryOptions} />

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Eventi attivi
          </p>

          <h2 className="font-serif text-3xl text-neutral-50">
            Prossimi eventi
          </h2>

          {upcomingEvents.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-400">
              Non hai eventi programmati. Crea un evento collegato a una
              galleria per farlo apparire nel calendario pubblico.
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {upcomingEvents.map((event) => {
                const gallery = galleryById.get(event.gallery_id);

                return (
                  <article
                    key={event.id}
                    className="grid gap-5 rounded-3xl border border-neutral-800 bg-neutral-950 p-5 md:grid-cols-[170px_1fr_auto]"
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-neutral-800 bg-black">
                      {gallery?.cover_image_url ? (
                        <img
                          src={gallery.cover_image_url}
                          alt={gallery.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.25em] text-neutral-600">
                          No cover
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
                            event.status
                          )}`}
                        >
                          {getStatusLabel(event.status)}
                        </span>

                        {gallery && (
                          <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-400">
                            {gallery.title} · {gallery.status}
                          </span>
                        )}
                      </div>

                      <h3 className="text-2xl font-medium text-neutral-50">
                        {event.title}
                      </h3>

                      <p className="mt-2 text-sm text-amber-200">
                        {formatDateTime(event.starts_at)}
                      </p>

                      {event.description && (
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                          {event.description}
                        </p>
                      )}

                      {gallery && (
                        <a
                          href={`/dashboard/gallerie/${gallery.id}`}
                          className="mt-4 inline-flex rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400"
                        >
                          Gestisci galleria
                        </a>
                      )}
                    </div>

                    <GalleryEventActions
                      eventId={event.id}
                      eventTitle={event.title}
                      status={event.status}
                    />
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {closedEvents.length > 0 && (
          <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Archivio eventi
            </p>

            <h2 className="font-serif text-3xl text-neutral-50">
              Eventi chiusi
            </h2>

            <div className="mt-6 grid gap-3">
              {closedEvents.map((event) => {
                const gallery = galleryById.get(event.gallery_id);

                return (
                  <div
                    key={event.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 md:flex-row md:items-center"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-100">
                        {event.title}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {gallery?.title || "Galleria rimossa"} ·{" "}
                        {formatDateTime(event.starts_at)} ·{" "}
                        {getStatusLabel(event.status)}
                      </p>
                    </div>

                    <GalleryEventActions
                      eventId={event.id}
                      eventTitle={event.title}
                      status={event.status}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
