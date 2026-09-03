import AdminShell from "@/components/admin/AdminShell";
import AdminLiveGuidedVisitControls from "@/components/admin/AdminLiveGuidedVisitControls";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import LocalDateTime from "@/components/time/LocalDateTime";

type AccessMode = "public" | "password" | "invite_only" | "private_link";
type VoiceMode = "owner_only" | "everyone" | "request_to_speak";
type EventStatus = "scheduled" | "live" | "completed" | "cancelled";

type LiveGuidedVisit = {
  id: string;
  gallery_id: string;
  gallery_event_id: string | null;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  access_mode: AccessMode | string | null;
  voice_mode: VoiceMode | string | null;
  is_active: boolean;
  max_participants: number | null;
  room_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
};

type GalleryEvent = {
  id: string;
  owner_id: string;
  gallery_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: EventStatus;
};

type Gallery = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: "user" | "gallerist" | "admin";
  plan: "free" | "pro" | "business" | "diamond" | "institution";
};

type LiveSetting = {
  gallery_id: string;
  voice_enabled: boolean;
  voice_access_mode: string | null;
  voice_schedule_mode: string | null;
  default_voice_role: string | null;
  allow_guests: boolean | null;
  requires_login: boolean | null;
  owner_plan_required: string | null;
};

function formatDateTime(value: string | null, timeZone?: string | null) {
  if (!value) return "-";
  return <LocalDateTime value={value} format="datetime-medium" timeZone={timeZone} fallback="-" />;
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

function getPlanLabel(plan: Profile["plan"] | string | null | undefined) {
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

function getPlanBadgeClass(plan: Profile["plan"] | string | null | undefined) {
  if (plan === "institution") {
    return "border-purple-900 bg-purple-950/40 text-purple-200";
  }

  if (plan === "diamond") {
    return "border-amber-900 bg-amber-950/30 text-amber-200";
  }

  if (plan === "business") {
    return "border-green-900 bg-green-950/35 text-green-200";
  }

  if (plan === "pro") {
    return "border-blue-900 bg-blue-950/35 text-blue-200";
  }

  return "border-neutral-700 bg-neutral-950 text-neutral-400";
}

function getAccessModeLabel(value: string | null | undefined) {
  if (value === "password") {
    return "Password";
  }

  if (value === "invite_only") {
    return "Solo invito";
  }

  if (value === "private_link") {
    return "Link privato";
  }

  return "Pubblico";
}

function getVoiceModeLabel(value: string | null | undefined) {
  if (value === "everyone") {
    return "Tutti parlano";
  }

  if (value === "request_to_speak") {
    return "Richiesta parola";
  }

  return "Solo owner/moderatori";
}

function getEventStatusLabel(status: string | null | undefined) {
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

function getLiveStatusClass(liveEvent: LiveGuidedVisit, linkedEvent?: GalleryEvent) {
  const now = new Date();
  const startsAt = new Date(liveEvent.starts_at);
  const endsAt = new Date(liveEvent.ends_at);

  if (!liveEvent.is_active || linkedEvent?.status === "cancelled") {
    return "border-neutral-700 bg-neutral-950 text-neutral-400";
  }

  if (linkedEvent?.status === "completed" || endsAt <= now) {
    return "border-neutral-700 bg-neutral-950 text-neutral-400";
  }

  if (startsAt <= now && endsAt > now) {
    return "border-emerald-900 bg-emerald-950/35 text-emerald-200";
  }

  return "border-amber-900 bg-amber-950/25 text-amber-200";
}

function getLiveStatusLabel(liveEvent: LiveGuidedVisit, linkedEvent?: GalleryEvent) {
  const now = new Date();
  const startsAt = new Date(liveEvent.starts_at);
  const endsAt = new Date(liveEvent.ends_at);

  if (!liveEvent.is_active) {
    return "Disattivata";
  }

  if (linkedEvent?.status === "cancelled") {
    return "Evento annullato";
  }

  if (linkedEvent?.status === "completed" || endsAt <= now) {
    return "Conclusa";
  }

  if (startsAt <= now && endsAt > now) {
    return "Live ora";
  }

  return "Programmata";
}

function normalizeAccessMode(value: string | null | undefined): AccessMode {
  if (
    value === "public" ||
    value === "password" ||
    value === "invite_only" ||
    value === "private_link"
  ) {
    return value;
  }

  return "public";
}

function normalizeVoiceMode(value: string | null | undefined): VoiceMode {
  if (
    value === "owner_only" ||
    value === "everyone" ||
    value === "request_to_speak"
  ) {
    return value;
  }

  return "owner_only";
}

export default async function AdminLiveGuidedVisitsPage() {
  const { admin } = await requireAdmin();

  const [
    liveEventsResult,
    calendarEventsResult,
    galleriesResult,
    profilesResult,
    settingsResult,
  ] = await Promise.all([
    admin
      .from("gallery_live_events")
      .select(
        [
          "id",
          "gallery_id",
          "gallery_event_id",
          "title",
          "description",
          "starts_at",
          "ends_at",
          "timezone",
          "access_mode",
          "voice_mode",
          "is_active",
          "max_participants",
          "room_name",
          "created_by",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .order("starts_at", { ascending: true }),
    admin
      .from("gallery_events")
      .select("id, owner_id, gallery_id, title, starts_at, ends_at, timezone, status"),
    admin.from("galleries").select("id, owner_id, title, slug, status"),
    admin
      .from("profiles")
      .select("id, email, display_name, full_name, role, plan"),
    admin
      .from("gallery_live_settings")
      .select(
        "gallery_id, voice_enabled, voice_access_mode, voice_schedule_mode, default_voice_role, allow_guests, requires_login, owner_plan_required"
      ),
  ]);

  const liveEvents =
  (liveEventsResult.data || []) as unknown as LiveGuidedVisit[];
const calendarEvents =
  (calendarEventsResult.data || []) as unknown as GalleryEvent[];
const galleries = (galleriesResult.data || []) as unknown as Gallery[];
const profiles = (profilesResult.data || []) as unknown as Profile[];
const settings = (settingsResult.data || []) as unknown as LiveSetting[];

  const calendarEventById = new Map(
    calendarEvents.map((event) => [event.id, event])
  );
  const galleryById = new Map(galleries.map((gallery) => [gallery.id, gallery]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const settingsByGalleryId = new Map(
    settings.map((setting) => [setting.gallery_id, setting])
  );

  const now = new Date();
  const activeLiveEvents = liveEvents.filter((event) => event.is_active);
  const liveNowCount = liveEvents.filter((event) => {
    const startsAt = new Date(event.starts_at);
    const endsAt = new Date(event.ends_at);
    const linkedEvent = event.gallery_event_id
      ? calendarEventById.get(event.gallery_event_id)
      : undefined;

    return (
      event.is_active &&
      linkedEvent?.status !== "cancelled" &&
      linkedEvent?.status !== "completed" &&
      startsAt <= now &&
      endsAt > now
    );
  }).length;

  const passwordCount = liveEvents.filter(
    (event) => event.access_mode === "password"
  ).length;
  const inviteOnlyCount = liveEvents.filter(
    (event) => event.access_mode === "invite_only"
  ).length;
  const ownerOnlyCount = liveEvents.filter(
    (event) => event.voice_mode === "owner_only" || !event.voice_mode
  ).length;

  return (
    <AdminShell
      title="Live guided visits"
      subtitle="Controlla le visite guidate live audio collegate agli eventi MostraSpace. Per ora la feature resta Institution-only."
      activeSection="live-guided-visits"
    >
      {(liveEventsResult.error ||
        calendarEventsResult.error ||
        galleriesResult.error ||
        profilesResult.error ||
        settingsResult.error) && (
        <div className="mb-6 rounded-3xl border border-red-800 bg-red-950/30 p-6">
          <p className="text-lg font-medium">Errore caricamento Live guided visits</p>

          {liveEventsResult.error && (
            <p className="mt-2 text-sm text-red-100">
              gallery_live_events: {liveEventsResult.error.message}
            </p>
          )}

          {calendarEventsResult.error && (
            <p className="mt-2 text-sm text-red-100">
              gallery_events: {calendarEventsResult.error.message}
            </p>
          )}

          {galleriesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              galleries: {galleriesResult.error.message}
            </p>
          )}

          {profilesResult.error && (
            <p className="mt-2 text-sm text-red-100">
              profiles: {profilesResult.error.message}
            </p>
          )}

          {settingsResult.error && (
            <p className="mt-2 text-sm text-red-100">
              gallery_live_settings: {settingsResult.error.message}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Totale
          </p>
          <p className="text-4xl font-semibold">{liveEvents.length}</p>
          <p className="mt-3 text-sm text-neutral-400">Live guided visits create</p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Attive
          </p>
          <p className="text-4xl font-semibold">{activeLiveEvents.length}</p>
          <p className="mt-3 text-sm text-neutral-400">{liveNowCount} live ora</p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Password
          </p>
          <p className="text-4xl font-semibold">{passwordCount}</p>
          <p className="mt-3 text-sm text-neutral-400">Eventi protetti</p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Solo invito
          </p>
          <p className="text-4xl font-semibold">{inviteOnlyCount}</p>
          <p className="mt-3 text-sm text-neutral-400">Accesso selettivo</p>
        </article>

        <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Owner-led
          </p>
          <p className="text-4xl font-semibold">{ownerOnlyCount}</p>
          <p className="mt-3 text-sm text-neutral-400">Solo speaker autorizzati</p>
        </article>
      </div>

      <section className="mt-8 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
              Monitoraggio
            </p>
            <h2 className="text-2xl font-medium">Live guided visits create</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-neutral-400">
              Questa pagina è il controllo admin generale: stato, piano owner,
              evento calendario collegato, modalità accesso, modalità voce e room
              name che useremo poi per LiveKit.
            </p>
          </div>

          <a
            href="/dashboard/eventi"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            Apri dashboard eventi
          </a>
        </div>

        {liveEvents.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <p className="text-sm text-neutral-400">
              Nessuna Live guided visit creata. Crea un evento Institution dalla
              dashboard eventi e abilita il box Live guided visits.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {liveEvents.map((liveEvent) => {
              const linkedEvent = liveEvent.gallery_event_id
                ? calendarEventById.get(liveEvent.gallery_event_id)
                : undefined;
              const gallery = galleryById.get(liveEvent.gallery_id);
              const owner = gallery ? profileById.get(gallery.owner_id) : undefined;
              const creator = liveEvent.created_by
                ? profileById.get(liveEvent.created_by)
                : undefined;
              const setting = settingsByGalleryId.get(liveEvent.gallery_id);
              const ownerPlan = owner?.plan || "free";
              const ownerIsInstitution = ownerPlan === "institution";

              return (
                <article
                  key={liveEvent.id}
                  className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${getLiveStatusClass(
                            liveEvent,
                            linkedEvent
                          )}`}
                        >
                          {getLiveStatusLabel(liveEvent, linkedEvent)}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${getPlanBadgeClass(
                            ownerPlan
                          )}`}
                        >
                          {getPlanLabel(ownerPlan)}
                        </span>

                        {!ownerIsInstitution && (
                          <span className="rounded-full border border-red-900 bg-red-950/30 px-3 py-1 text-xs uppercase tracking-[0.16em] text-red-200">
                            Owner non Institution
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 text-2xl font-medium text-neutral-50">
                        {liveEvent.title}
                      </h3>

                      <p className="mt-2 text-sm text-amber-200">
                        {formatDateTime(liveEvent.starts_at, liveEvent.timezone)} →{" "}
                        {formatDateTime(liveEvent.ends_at, liveEvent.timezone)} ·{" "}
                        {liveEvent.timezone || "Europe/Rome"}
                      </p>

                      {liveEvent.description && (
                        <p className="mt-3 max-w-4xl text-sm leading-7 text-neutral-400">
                          {liveEvent.description}
                        </p>
                      )}

                      <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Galleria
                          </dt>
                          <dd className="mt-2 text-neutral-100">
                            {gallery?.title || "Galleria rimossa"}
                          </dd>
                          <p className="mt-1 text-xs text-neutral-500">
                            {gallery ? `/${gallery.slug}` : liveEvent.gallery_id}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Owner
                          </dt>
                          <dd className="mt-2 text-neutral-100">
                            {getProfileName(owner)}
                          </dd>
                          <p className="mt-1 break-all text-xs text-neutral-500">
                            {owner?.email || "-"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Accesso
                          </dt>
                          <dd className="mt-2 text-neutral-100">
                            {getAccessModeLabel(liveEvent.access_mode)}
                          </dd>
                          <p className="mt-1 text-xs text-neutral-500">
                            {setting?.requires_login ? "Login richiesto" : "Guest consentiti"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Voce
                          </dt>
                          <dd className="mt-2 text-neutral-100">
                            {getVoiceModeLabel(liveEvent.voice_mode)}
                          </dd>
                          <p className="mt-1 text-xs text-neutral-500">
                            Max {liveEvent.max_participants || 50} partecipanti
                          </p>
                        </div>
                      </dl>

                      <div className="mt-5 grid gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm md:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Evento calendario
                          </p>
                          <p className="mt-2 text-neutral-100">
                            {linkedEvent?.title || "Non collegato"}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            Stato: {getEventStatusLabel(linkedEvent?.status)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-neutral-600">
                            Room LiveKit futura
                          </p>
                          <p className="mt-2 break-all text-neutral-100">
                            {liveEvent.room_name || "Room name non impostato"}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            Creata da: {getProfileName(creator)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {gallery && (
                          <a
                            href={`/dashboard/gallerie/${gallery.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400"
                          >
                            Gestisci galleria
                          </a>
                        )}

                        {gallery?.status === "published" && (
                          <a
                            href={`/gallerie/${gallery.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-white px-4 py-2 text-xs font-medium text-neutral-950 transition hover:bg-neutral-200"
                          >
                            Pagina pubblica
                          </a>
                        )}

                        {linkedEvent && (
                          <a
                            href="/eventi"
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-100 transition hover:border-neutral-400"
                          >
                            Calendario pubblico
                          </a>
                        )}
                      </div>
                    </div>

                    <AdminLiveGuidedVisitControls
                      liveEventId={liveEvent.id}
                      eventTitle={liveEvent.title}
                      isActive={liveEvent.is_active}
                      linkedEventStatus={linkedEvent?.status || null}
                      currentAccessMode={normalizeAccessMode(liveEvent.access_mode)}
                      currentVoiceMode={normalizeVoiceMode(liveEvent.voice_mode)}
                      currentMaxParticipants={liveEvent.max_participants}
                      hasLinkedCalendarEvent={Boolean(linkedEvent)}
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
