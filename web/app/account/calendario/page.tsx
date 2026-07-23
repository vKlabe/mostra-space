import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import T from "@/components/i18n/T";

type FollowRow = {
  following_id: string;
};

type FavoriteGalleryRow = {
  gallery_id: string;
};

type GalleryEvent = {
  id: string;
  owner_id: string;
  gallery_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
};

type Gallery = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  cover_image_url: string | null;
};

type Profile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  profile_slug: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getProfileName(profile: Profile | undefined) {
  return (
    profile?.display_name ||
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    null
  );
}

export default async function AccountCalendarPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
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

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const { data: followRows } = await admin
    .from("account_follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const { data: favoriteRows } = await admin
    .from("favorite_galleries")
    .select("gallery_id")
    .eq("user_id", user.id);

  const followedProfileIds = ((followRows || []) as FollowRow[]).map(
    (row) => row.following_id
  );

  const favoriteGalleryIds = ((favoriteRows || []) as FavoriteGalleryRow[]).map(
    (row) => row.gallery_id
  );

  const nowIso = new Date().toISOString();

  const { data: followedOwnerGalleriesData } =
    followedProfileIds.length > 0
      ? await admin
          .from("galleries")
          .select("id")
          .in("owner_id", followedProfileIds)
      : { data: [] };

  const followedOwnerGalleryIds = ((followedOwnerGalleriesData || []) as Array<{
    id: string;
  }>).map((gallery) => gallery.id);

  const ownerIdsForCalendar = Array.from(
    new Set([...followedProfileIds, user.id])
  );

  const galleryIdsForCalendar = Array.from(
    new Set([...favoriteGalleryIds, ...followedOwnerGalleryIds])
  );

  const eventQueries: PromiseLike<{ data: unknown[] | null }>[] = [];

  if (ownerIdsForCalendar.length > 0) {
    eventQueries.push(
      admin
        .from("gallery_events")
        .select(
          "id, owner_id, gallery_id, title, description, starts_at, ends_at, status"
        )
        .in("owner_id", ownerIdsForCalendar)
        .in("status", ["scheduled", "live"])
        .gt("ends_at", nowIso)
        .order("starts_at", { ascending: true })
    );
  }

  if (galleryIdsForCalendar.length > 0) {
    eventQueries.push(
      admin
        .from("gallery_events")
        .select(
          "id, owner_id, gallery_id, title, description, starts_at, ends_at, status"
        )
        .in("gallery_id", galleryIdsForCalendar)
        .in("status", ["scheduled", "live"])
        .gt("ends_at", nowIso)
        .order("starts_at", { ascending: true })
    );
  }

  const queryResults = await Promise.all(eventQueries);
  const eventsById = new Map<string, GalleryEvent>();

  for (const result of queryResults) {
    for (const event of (result.data || []) as unknown as GalleryEvent[]) {
      eventsById.set(event.id, event);
    }
  }

  const events = Array.from(eventsById.values()).sort(
    (a, b) =>
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );

  const galleryIds = Array.from(new Set(events.map((event) => event.gallery_id)));
  const ownerIds = Array.from(new Set(events.map((event) => event.owner_id)));

  const { data: galleries } =
    galleryIds.length > 0
      ? await admin
          .from("galleries")
          .select("id, title, slug, status, cover_image_url")
          .in("id", galleryIds)
      : { data: [] };

  const { data: profiles } =
    ownerIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name, full_name, email, profile_slug")
          .in("id", ownerIds)
      : { data: [] };

  const galleryById = new Map(
    ((galleries || []) as Gallery[]).map((gallery) => [gallery.id, gallery])
  );

  const profileById = new Map(
    ((profiles || []) as Profile[]).map((profile) => [profile.id, profile])
  );

  const isCreator =
    profile?.role === "gallerist" || profile?.role === "admin";

  return (
    <DashboardShell
  title={
    <T
      textKey="account.calendar.shell.title"
      fallback="Il tuo calendario"
    />
  }
  subtitle={
    <T
      textKey="account.calendar.shell.subtitle"
      fallback="Eventi creati dai profili che segui e dalle gallerie che hai salvato."
    />
  }
  activeSection="account"
  navMode={isCreator ? "creator" : "community"}
      actions={
        <div className="flex flex-wrap gap-3">
          <a
            href="/eventi"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="account.calendar.actions.publicCalendar"
              fallback="Calendario pubblico"
            />
          </a>

          <a
            href="/account/notifiche"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="account.calendar.actions.notifications"
              fallback="Notifiche"
            />
          </a>
        </div>
      }
    >
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-amber-500">
          <T
            textKey="account.calendar.header.label"
            fallback="Agenda personale"
          />
        </p>

        <h2 className="font-serif text-3xl text-neutral-50">
          <T
            textKey="account.calendar.header.title"
            fallback="Eventi dai tuoi interessi"
          />
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
          <T
            textKey="account.calendar.header.subtitle"
            fallback="Qui trovi solo gli eventi collegati ai profili che segui e alle gallerie che hai salvato."
          />
        </p>

        {events.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-950 p-6">
            <p className="text-sm text-neutral-300">
              <T
                textKey="account.calendar.empty.message"
                fallback="Non ci sono eventi nel tuo calendario personale."
              />
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/profili"
                className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
              >
                <T
                  textKey="account.calendar.empty.followProfiles"
                  fallback="Segui profili"
                />
              </a>

              <a
                href="/gallerie"
                className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
              >
                <T
                  textKey="account.calendar.empty.exploreGalleries"
                  fallback="Esplora gallerie"
                />
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {events.map((event) => {
              const gallery = galleryById.get(event.gallery_id);
              const owner = profileById.get(event.owner_id);
              const ownerName = getProfileName(owner);
              const canOpenGallery = gallery?.status === "published";

              return (
                <article
                  key={event.id}
                  className="grid gap-5 rounded-3xl border border-neutral-800 bg-neutral-950 p-5 md:grid-cols-[160px_1fr]"
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
                          textKey="account.calendar.event.noCover"
                          fallback="No cover"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-amber-200">
                      {formatDate(event.starts_at)}
                    </p>

                    <h3 className="mt-2 text-2xl font-medium text-neutral-50">
                      {event.title}
                    </h3>

                    <p className="mt-2 text-sm text-neutral-500">
                      {gallery?.title ? (
                        gallery.title
                      ) : (
                        <T
                          textKey="account.calendar.event.galleryRemoved"
                          fallback="Galleria rimossa"
                        />
                      )}{" "}
                      ·{" "}
                      {owner?.profile_slug ? (
  <a
    href={`/profili/${owner.profile_slug}`}
    className="text-neutral-300 underline decoration-neutral-700 underline-offset-4 transition hover:text-white"
  >
    {ownerName || (
      <T
        textKey="account.calendar.event.unknownProfile"
        fallback="Profilo mostra.space"
      />
    )}
  </a>
) : (
  ownerName || (
    <T
      textKey="account.calendar.event.unknownProfile"
      fallback="Profilo mostra.space"
    />
  )
)}
                    </p>

                    {event.description && (
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
                        {event.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3">
                      {canOpenGallery && gallery ? (
                        <a
                          href={`/gallerie/${gallery.slug}`}
                          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
                        >
                          <T
                            textKey="account.calendar.event.openGallery"
                            fallback="Apri galleria"
                          />
                        </a>
                      ) : (
                        <span className="rounded-full border border-neutral-800 px-5 py-2 text-sm text-neutral-500">
                          <T
                            textKey="account.calendar.event.galleryInPreparation"
                            fallback="Galleria in preparazione"
                          />
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}