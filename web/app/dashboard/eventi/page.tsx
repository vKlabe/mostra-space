import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import CreateGalleryEventForm from "@/components/events/CreateGalleryEventForm";
import GalleryEventActions from "@/components/events/GalleryEventActions";
import GalleryEventInviteManager from "@/components/events/GalleryEventInviteManager";
import T from "@/components/i18n/T";
import { PLAN_LIMITS, normalizePlanName, type PlanName } from "@/lib/plans";

type Profile = {
  id: string;
  role: "user" | "gallerist" | "admin";
  plan: PlanName | string | null;
};

type OwnerPlanProfile = {
  id: string;
  plan: PlanName | string | null;
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
  access_mode: "public" | "password" | "invite_only" | "private_link";
  private_token: string | null;
  is_listed: boolean;
  created_at: string;
};

type GalleryLiveEvent = {
  id: string;
  gallery_event_id: string | null;
  gallery_id: string;
  access_mode: "public" | "password" | "invite_only" | "private_link";
  voice_mode: "owner_only" | "everyone" | "request_to_speak";
  is_active: boolean;
  max_participants: number | null;
  room_name: string;
};

type EventInviteRow = {
  event_id: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getEventStatusTranslation(status: GalleryEvent["status"]) {
  if (status === "live") {
    return {
      textKey: "dashboard.events.status.live",
      fallback: "Live",
    };
  }

  if (status === "completed") {
    return {
      textKey: "dashboard.events.status.completed",
      fallback: "Terminato",
    };
  }

  if (status === "cancelled") {
    return {
      textKey: "dashboard.events.status.cancelled",
      fallback: "Annullato",
    };
  }

  return {
    textKey: "dashboard.events.status.scheduled",
    fallback: "Programmato",
  };
}

function getGalleryStatusTranslation(status: Gallery["status"]) {
  if (status === "published") {
    return {
      textKey: "dashboard.events.galleryStatus.published",
      fallback: "Pubblicata",
    };
  }

  if (status === "archived") {
    return {
      textKey: "dashboard.events.galleryStatus.archived",
      fallback: "Archiviata",
    };
  }

  return {
    textKey: "dashboard.events.galleryStatus.draft",
    fallback: "Bozza",
  };
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

function getAccessModeLabel(mode: GalleryLiveEvent["access_mode"]) {
  if (mode === "password") return "Password";
  if (mode === "invite_only") return "Solo invito";
  if (mode === "private_link") return "Link privato";
  return "Pubblico";
}

function getEventAccessTranslation(mode: GalleryEvent["access_mode"]) {
  if (mode === "password") {
    return {
      textKey: "dashboard.events.access.password",
      fallback: "Password",
    };
  }

  if (mode === "invite_only") {
    return {
      textKey: "dashboard.events.access.inviteOnly",
      fallback: "Solo invito",
    };
  }

  if (mode === "private_link") {
    return {
      textKey: "dashboard.events.access.privateLink",
      fallback: "Link privato",
    };
  }

  return {
    textKey: "dashboard.events.access.public",
    fallback: "Pubblico",
  };
}

function getVoiceModeLabel(mode: GalleryLiveEvent["voice_mode"]) {
  if (mode === "everyone") return "Tutti parlano";
  if (mode === "request_to_speak") return "Richiesta parola";
  return "Owner/moderatori parlano";
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
    .select("id, role, plan")
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
        title={
          <T textKey="dashboard.events.restricted.title" fallback="Eventi" />
        }
        subtitle={
          <T
            textKey="dashboard.events.restricted.subtitle"
            fallback="Gli eventi sono disponibili per galleristi, artisti e admin."
          />
        }
        activeSection="gallerie"
      >
        <a
          href="/dashboard"
          className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
        >
          <T
            textKey="dashboard.events.actions.backToDashboard"
            fallback="Torna alla dashboard"
          />
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
      "id, owner_id, gallery_id, title, description, starts_at, ends_at, timezone, status, access_mode, private_token, is_listed, created_at"
    )
    .order("starts_at", { ascending: true });

  const { data: events } =
    profile.role === "admin"
      ? await eventQuery
      : await eventQuery.eq("owner_id", user.id);

  const safeGalleries = (galleries || []) as Gallery[];
  const safeEvents = (events || []) as GalleryEvent[];

  const ownerIds = Array.from(
    new Set(safeGalleries.map((gallery) => gallery.owner_id))
  );

  const { data: ownerProfiles } =
    ownerIds.length > 0
      ? await admin.from("profiles").select("id, plan").in("id", ownerIds)
      : { data: [] };

  const ownerPlanById = new Map(
    ((ownerProfiles || []) as OwnerPlanProfile[]).map((ownerProfile) => [
      ownerProfile.id,
      normalizePlanName(ownerProfile.plan),
    ])
  );

  const eventIds = safeEvents.map((event) => event.id);

  const { data: liveEvents } =
    eventIds.length > 0
      ? await admin
          .from("gallery_live_events")
          .select(
            "id, gallery_event_id, gallery_id, access_mode, voice_mode, is_active, max_participants, room_name"
          )
          .in("gallery_event_id", eventIds)
      : { data: [] };

  const safeLiveEvents = (liveEvents || []) as GalleryLiveEvent[];
  const liveEventByEventId = new Map(
    safeLiveEvents
      .filter((liveEvent) => liveEvent.gallery_event_id)
      .map((liveEvent) => [liveEvent.gallery_event_id as string, liveEvent])
  );

  const { data: eventInviteRows } =
    eventIds.length > 0
      ? await admin
          .from("gallery_event_invites")
          .select("event_id")
          .in("event_id", eventIds)
          .neq("status", "revoked")
      : { data: [] };

  const inviteCountByEventId = ((eventInviteRows || []) as EventInviteRow[]).reduce(
    (map, row) => {
      map.set(row.event_id, (map.get(row.event_id) || 0) + 1);
      return map;
    },
    new Map<string, number>()
  );

  const galleryById = new Map(
    safeGalleries.map((gallery) => [gallery.id, gallery])
  );

  const activeGalleryIds = new Set(
    safeEvents
      .filter((event) => event.status === "scheduled" || event.status === "live")
      .map((event) => event.gallery_id)
  );

  const currentProfilePlan = normalizePlanName(profile.plan);

  const galleryOptions = safeGalleries.map((gallery) => {
    const ownerPlan =
      ownerPlanById.get(gallery.owner_id) ||
      (gallery.owner_id === user.id ? currentProfilePlan : "free");

    return {
      ...gallery,
      ownerPlan,
      ownerPlanLabel: PLAN_LIMITS[ownerPlan].label,
      hasActiveEvent: activeGalleryIds.has(gallery.id),
      liveGuidedEligible: ownerPlan === "institution",
    };
  });

  const upcomingEvents = safeEvents.filter(
    (event) => event.status === "scheduled" || event.status === "live"
  );

  const closedEvents = safeEvents.filter(
    (event) => event.status === "completed" || event.status === "cancelled"
  );

  return (
    <DashboardShell
      title={
        <T textKey="dashboard.events.shell.title" fallback="Eventi" />
      }
      subtitle={
        <T
          textKey="dashboard.events.shell.subtitle"
          fallback="Crea eventi collegati alle tue gallerie. Ogni galleria può avere massimo un evento attivo."
        />
      }
      activeSection="gallerie"
      actions={
        <div className="flex flex-wrap gap-3">
          <a
            href="/eventi"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="dashboard.events.actions.publicCalendar"
              fallback="Calendario pubblico"
            />
          </a>

          <a
            href="/account/calendario"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="dashboard.events.actions.myCalendar"
              fallback="Il mio calendario"
            />
          </a>
        </div>
      }
    >
      <div className="space-y-8">
        <CreateGalleryEventForm galleries={galleryOptions} />

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            <T textKey="dashboard.events.active.label" fallback="Eventi attivi" />
          </p>

          <h2 className="font-serif text-3xl text-neutral-50">
            <T textKey="dashboard.events.active.title" fallback="Prossimi eventi" />
          </h2>

          {upcomingEvents.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-400">
              <T
                textKey="dashboard.events.active.empty"
                fallback="Non hai eventi programmati. Crea un evento collegato a una galleria per farlo apparire nel calendario pubblico."
              />
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {upcomingEvents.map((event) => {
                const gallery = galleryById.get(event.gallery_id);
                const liveEvent = liveEventByEventId.get(event.id);
                const inviteCount = inviteCountByEventId.get(event.id) || 0;

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
                          <T
                            textKey="dashboard.events.active.noCover"
                            fallback="No cover"
                          />
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
                          <T
                            textKey={getEventStatusTranslation(event.status).textKey}
                            fallback={getEventStatusTranslation(event.status).fallback}
                          />
                        </span>

                        <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
                          <T
                            textKey={getEventAccessTranslation(event.access_mode || "public").textKey}
                            fallback={getEventAccessTranslation(event.access_mode || "public").fallback}
                          />
                        </span>

                        {liveEvent?.is_active && (
                          <span className="rounded-full border border-sky-800 bg-sky-950/40 px-3 py-1 text-xs font-medium text-sky-200">
                            Live guided visit
                          </span>
                        )}

                        {gallery && (
                          <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-400">
                            {gallery.title} ·{" "}
                            <T
                              textKey={getGalleryStatusTranslation(gallery.status).textKey}
                              fallback={getGalleryStatusTranslation(gallery.status).fallback}
                            />
                          </span>
                        )}
                      </div>

                      <h3 className="text-2xl font-medium text-neutral-50">
                        {event.title}
                      </h3>

                      <p className="mt-2 text-sm text-amber-200">
                        {formatDateTime(event.starts_at)}
                      </p>

                      {(event.access_mode === "invite_only" || event.access_mode === "private_link") && (
                        <div className="mt-3 rounded-2xl border border-neutral-800 bg-black/30 p-3 text-xs leading-5 text-neutral-400">
                          {event.access_mode === "invite_only" && (
                            <>
                              <p>
                                <T
                                  textKey="dashboard.events.access.invitesCount"
                                  fallback="Invitati"
                                />
                                : {inviteCount}
                              </p>
                              <GalleryEventInviteManager
                                eventId={event.id}
                                initialInviteCount={inviteCount}
                              />
                            </>
                          )}
                          {event.access_mode === "private_link" && event.private_token && (
                            <p className="break-all">
                              <T
                                textKey="dashboard.events.access.privateLinkValue"
                                fallback="Link privato"
                              />
                              : /eventi?privateToken={event.private_token}
                            </p>
                          )}
                        </div>
                      )}

                      {liveEvent?.is_active && (
                        <p className="mt-2 text-xs leading-5 text-sky-200/80">
                          Voice room: {getAccessModeLabel(liveEvent.access_mode)} ·{" "}
                          {getVoiceModeLabel(liveEvent.voice_mode)}
                          {liveEvent.max_participants
                            ? ` · max ${liveEvent.max_participants} partecipanti`
                            : ""}
                        </p>
                      )}

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
                          <T
                            textKey="dashboard.events.active.manageGallery"
                            fallback="Gestisci galleria"
                          />
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
              <T textKey="dashboard.events.archive.label" fallback="Archivio eventi" />
            </p>

            <h2 className="font-serif text-3xl text-neutral-50">
              <T textKey="dashboard.events.archive.title" fallback="Eventi chiusi" />
            </h2>

            <div className="mt-6 grid gap-3">
              {closedEvents.map((event) => {
                const gallery = galleryById.get(event.gallery_id);
                const liveEvent = liveEventByEventId.get(event.id);

                return (
                  <div
                    key={event.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 md:flex-row md:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-neutral-100">
                          {event.title}
                        </p>

                        {liveEvent && (
                          <span className="rounded-full border border-sky-900 bg-sky-950/25 px-2 py-0.5 text-[11px] text-sky-200/80">
                            Live guided visit
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-neutral-500">
                        {gallery?.title ? (
                          gallery.title
                        ) : (
                          <T
                            textKey="dashboard.events.archive.galleryRemoved"
                            fallback="Galleria rimossa"
                          />
                        )}{" "}
                        · {formatDateTime(event.starts_at)} ·{" "}
                        <T
                          textKey={getEventStatusTranslation(event.status).textKey}
                          fallback={getEventStatusTranslation(event.status).fallback}
                        />
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
