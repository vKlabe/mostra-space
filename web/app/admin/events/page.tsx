import AdminShell from "@/components/admin/AdminShell";
import AdminEventCurationControls from "@/components/admin/AdminEventCurationControls";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import T from "@/components/i18n/T";
import LocalDateTime from "@/components/time/LocalDateTime";

export const dynamic = "force-dynamic";

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
  public_featured_enabled: boolean | null;
  public_featured_sort_order: number | null;
  public_highlight_enabled: boolean | null;
  public_highlight_sort_order: number | null;
  created_at: string;
};

type Gallery = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  cover_image_url: string | null;
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "diamond" | "institution";
};

type LiveGuidedVisit = {
  gallery_event_id: string | null;
  is_active: boolean;
  access_mode: string | null;
  voice_mode: string | null;
};

function formatDateTime(value: string, timeZone?: string | null) {
  return <LocalDateTime value={value} format="datetime-medium" timeZone={timeZone} />;
}

function getProfileName(profile: Profile | undefined) {
  if (!profile) {
    return "Owner non trovato";
  }

  return (
    profile.display_name ||
    profile.full_name ||
    profile.email?.split("@")[0] ||
    "Profilo mostra.space"
  );
}

function getStatusClass(status: GalleryEvent["status"]) {
  if (status === "live") {
    return "border-emerald-900 bg-emerald-950/35 text-emerald-200";
  }

  if (status === "completed") {
    return "border-neutral-700 bg-neutral-950 text-neutral-400";
  }

  if (status === "cancelled") {
    return "border-red-900 bg-red-950/30 text-red-200";
  }

  return "border-amber-900 bg-amber-950/25 text-amber-200";
}

function getStatusTranslation(status: GalleryEvent["status"]) {
  if (status === "live") {
    return { textKey: "admin.events.status.live", fallback: "Live" };
  }

  if (status === "completed") {
    return { textKey: "admin.events.status.completed", fallback: "Terminato" };
  }

  if (status === "cancelled") {
    return { textKey: "admin.events.status.cancelled", fallback: "Annullato" };
  }

  return { textKey: "admin.events.status.scheduled", fallback: "Programmato" };
}

export default async function AdminEventsPage() {
  const current = await requireAdmin();
  const admin = current.admin;

  await admin
    .from("gallery_events")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in("status", ["scheduled", "live"])
    .lte("ends_at", new Date().toISOString());

  const [eventsResult, galleriesResult, profilesResult, liveResult] =
    await Promise.all([
      admin
        .from("gallery_events")
        .select(
          "id, owner_id, gallery_id, title, description, starts_at, ends_at, timezone, status, public_featured_enabled, public_featured_sort_order, public_highlight_enabled, public_highlight_sort_order, created_at"
        )
        .order("starts_at", { ascending: true }),
      admin
        .from("galleries")
        .select("id, owner_id, title, slug, status, cover_image_url"),
      admin.from("profiles").select("id, email, display_name, full_name, role, plan"),
      admin
        .from("gallery_live_events")
        .select("gallery_event_id, is_active, access_mode, voice_mode"),
    ]);

  const events = (eventsResult.data || []) as unknown as GalleryEvent[];
  const galleries = (galleriesResult.data || []) as unknown as Gallery[];
  const profiles = (profilesResult.data || []) as unknown as Profile[];
  const liveVisits = (liveResult.data || []) as unknown as LiveGuidedVisit[];

  const galleryById = new Map(galleries.map((gallery) => [gallery.id, gallery]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const liveByEventId = new Map(
    liveVisits
      .filter((item) => item.gallery_event_id)
      .map((item) => [item.gallery_event_id as string, item])
  );

  const now = new Date();

  const upcomingEvents = events.filter(
    (event) =>
      (event.status === "scheduled" || event.status === "live") &&
      new Date(event.ends_at) > now
  );

  const featuredEvent = upcomingEvents.find(
    (event) => event.public_featured_enabled
  );

  const highlightedEvents = upcomingEvents.filter(
    (event) => event.public_highlight_enabled
  );

  return (
    <AdminShell
      title={
        <T textKey="admin.events.shell.title" fallback="Eventi pubblici" />
      }
      subtitle={
        <T
          textKey="admin.events.shell.subtitle"
          fallback="Controlla calendario pubblico, evento in evidenza e slider degli eventi selezionati."
        />
      }
      activeSection="overview"
    >
      <div className="space-y-8">
        {eventsResult.error && (
          <div className="rounded-3xl border border-red-900 bg-red-950/25 p-6 text-sm text-red-100">
            {eventsResult.error.message}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              <T textKey="admin.events.stats.total.label" fallback="Totale" />
            </p>
            <p className="mt-4 text-4xl font-semibold text-neutral-50">
              {events.length}
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              <T textKey="admin.events.stats.total.description" fallback="Eventi creati" />
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              <T textKey="admin.events.stats.upcoming.label" fallback="Futuri" />
            </p>
            <p className="mt-4 text-4xl font-semibold text-neutral-50">
              {upcomingEvents.length}
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              <T textKey="admin.events.stats.upcoming.description" fallback="Nel calendario" />
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              <T textKey="admin.events.stats.featured.label" fallback="In evidenza" />
            </p>
            <p className="mt-4 text-4xl font-semibold text-neutral-50">
              {featuredEvent ? 1 : 0}
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              <T textKey="admin.events.stats.featured.description" fallback="Hero /eventi" />
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              <T textKey="admin.events.stats.slider.label" fallback="Slider" />
            </p>
            <p className="mt-4 text-4xl font-semibold text-neutral-50">
              {highlightedEvents.length}
            </p>
            <p className="mt-2 text-sm text-neutral-400">
              <T textKey="admin.events.stats.slider.description" fallback="Eventi selezionati" />
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                <T textKey="admin.events.curation.label" fallback="Curation" />
              </p>
              <h2 className="mt-3 font-serif text-3xl text-neutral-50">
                <T
                  textKey="admin.events.curation.title"
                  fallback="Gestione eventi pubblici"
                />
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                <T
                  textKey="admin.events.curation.description"
                  fallback="Scegli un evento in evidenza e gli eventi che devono comparire nello slider ‘Da non perdere’. Il resto del calendario pubblico resta ordinato dal più vicino al più lontano."
                />
              </p>
            </div>

            <a
              href="/eventi"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
            >
              <T textKey="admin.events.actions.openPublicEvents" fallback="Apri /eventi" />
            </a>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-sm text-neutral-400">
              <T
                textKey="admin.events.empty.noUpcoming"
                fallback="Non ci sono eventi futuri da curare."
              />
            </p>
          ) : (
            <div className="mt-6 grid gap-5">
              {upcomingEvents.map((event) => {
                const gallery = galleryById.get(event.gallery_id);
                const owner = profileById.get(event.owner_id);
                const liveVisit = liveByEventId.get(event.id);
                const statusTranslation = getStatusTranslation(event.status);

                return (
                  <article
                    key={event.id}
                    className="grid gap-5 rounded-3xl border border-neutral-800 bg-neutral-950 p-5 lg:grid-cols-[180px_1fr_360px]"
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
                          <T textKey="admin.events.card.noCover" fallback="No cover" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
                            event.status
                          )}`}
                        >
                          <T
                            textKey={statusTranslation.textKey}
                            fallback={statusTranslation.fallback}
                          />
                        </span>

                        {event.public_featured_enabled && (
                          <span className="rounded-full border border-amber-800 bg-amber-950/35 px-3 py-1 text-xs text-amber-200">
                            <T
                              textKey="admin.events.badges.featured"
                              fallback="Evento in evidenza"
                            />
                          </span>
                        )}

                        {event.public_highlight_enabled && (
                          <span className="rounded-full border border-sky-800 bg-sky-950/35 px-3 py-1 text-xs text-sky-200">
                            <T textKey="admin.events.badges.slider" fallback="Slider" />
                          </span>
                        )}

                        {liveVisit?.is_active && (
                          <span className="rounded-full border border-purple-800 bg-purple-950/35 px-3 py-1 text-xs text-purple-200">
                            <T
                              textKey="admin.events.badges.liveGuidedVisit"
                              fallback="Live guided visit"
                            />
                          </span>
                        )}
                      </div>

                      <h3 className="text-2xl font-medium text-neutral-50">
                        {event.title}
                      </h3>

                      <p className="mt-2 text-sm text-amber-200">
                        {formatDateTime(event.starts_at, event.timezone)} → {formatDateTime(event.ends_at, event.timezone)}
                      </p>

                      <p className="mt-2 text-sm text-neutral-500">
                        {gallery?.title || (
                          <T
                            textKey="admin.events.card.galleryRemoved"
                            fallback="Galleria rimossa"
                          />
                        )}{" "}
                        · {getProfileName(owner)}
                      </p>

                      {event.description && (
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                          {event.description}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3">
                        {gallery && (
                          <a
                            href={`/dashboard/gallerie/${gallery.id}`}
                            className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400"
                          >
                            <T
                              textKey="admin.events.actions.manageGallery"
                              fallback="Gestisci galleria"
                            />
                          </a>
                        )}

                        <a
                          href="/dashboard/eventi"
                          className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400"
                        >
                          <T
                            textKey="admin.events.actions.dashboardEvents"
                            fallback="Dashboard eventi"
                          />
                        </a>
                      </div>
                    </div>

                    <AdminEventCurationControls
                      eventId={event.id}
                      eventTitle={event.title}
                      currentFeatured={Boolean(event.public_featured_enabled)}
                      currentFeaturedSortOrder={event.public_featured_sort_order || 100}
                      currentHighlight={Boolean(event.public_highlight_enabled)}
                      currentHighlightSortOrder={event.public_highlight_sort_order || 100}
                    />
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
