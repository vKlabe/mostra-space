import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import NotificationReadButton from "@/components/account/NotificationReadButton";
import NotificationMarkAllReadButton from "@/components/account/NotificationMarkAllReadButton";
import NotificationOpenLink from "@/components/account/NotificationOpenLink";
import T from "@/components/i18n/T";

type Notification = {
  id: string;
  type:
    | "event_created"
    | "event_3_days_before"
    | "event_30_minutes_before"
    | "gallery_published"
    | "status_published";
  title: string;
  message: string;
  event_id: string | null;
  gallery_id: string | null;
  actor_profile_id: string | null;
  status_id: string | null;
  href: string | null;
  source_key: string | null;
  scheduled_for: string;
  read_at: string | null;
  created_at: string;
};

type GalleryEvent = {
  id: string;
  title: string;
  starts_at: string;
  gallery_id: string;
};

type Gallery = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AccountNotificationsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  const { data: notifications } = await admin
    .from("account_notifications")
    .select(
      "id, type, title, message, event_id, gallery_id, actor_profile_id, status_id, href, source_key, scheduled_for, read_at, created_at"
    )
    .eq("user_id", user.id)
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: false })
    .limit(80);

  const safeNotifications = (notifications || []) as Notification[];
  const eventIds = Array.from(
    new Set(
      safeNotifications
        .map((notification) => notification.event_id)
        .filter(Boolean) as string[]
    )
  );

  const galleryIds = Array.from(
    new Set(
      safeNotifications
        .map((notification) => notification.gallery_id)
        .filter(Boolean) as string[]
    )
  );

  const { data: events } =
    eventIds.length > 0
      ? await admin
          .from("gallery_events")
          .select("id, title, starts_at, gallery_id")
          .in("id", eventIds)
      : { data: [] };

  const { data: galleries } =
    galleryIds.length > 0
      ? await admin
          .from("galleries")
          .select("id, title, slug, status")
          .in("id", galleryIds)
      : { data: [] };

  const eventById = new Map(
    ((events || []) as GalleryEvent[]).map((event) => [event.id, event])
  );

  const galleryById = new Map(
    ((galleries || []) as Gallery[]).map((gallery) => [gallery.id, gallery])
  );

  const unreadCount = safeNotifications.filter(
    (notification) => !notification.read_at
  ).length;

  const isCreator =
    profile?.role === "gallerist" || profile?.role === "admin";

  return (
    <DashboardShell
  title={
    <T
      textKey="account.notifications.shell.title"
      fallback="Notifiche"
    />
  }
  subtitle={
    <T
      textKey="account.notifications.shell.subtitle"
      fallback="Attività, nuove gallerie, stati e promemoria collegati ai profili che segui."
    />
  }
  activeSection="account"
  navMode={isCreator ? "creator" : "community"}
      actions={
        <div className="flex flex-wrap gap-3">
          <a
            href="/account/calendario"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="account.notifications.actions.myCalendar"
              fallback="Il mio calendario"
            />
          </a>

          <a
            href="/eventi"
            className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            <T
              textKey="account.notifications.actions.publicEvents"
              fallback="Eventi pubblici"
            />
          </a>
        </div>
      }
    >
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-amber-500">
          <T
            textKey="account.notifications.header.label"
            fallback="Centro notifiche"
          />
        </p>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <h2 className="font-serif text-3xl text-neutral-50">
          {unreadCount > 0 ? (
            <>
              {unreadCount}{" "}
              <T
                textKey="account.notifications.header.unread"
                fallback="notifiche da leggere"
              />
            </>
          ) : (
            <T
              textKey="account.notifications.header.noNewNotifications"
              fallback="Nessuna nuova notifica"
            />
          )}
          </h2>

          <NotificationMarkAllReadButton disabled={unreadCount === 0} />
        </div>

        {safeNotifications.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-400">
            <T
              textKey="account.notifications.empty.message"
              fallback="Non hai ancora notifiche. Quando i profili che segui pubblicheranno nuovi contenuti, li troverai qui."
            />
          </p>
        ) : (
          <div className="mt-6 grid gap-4">
            {safeNotifications.map((notification) => {
              const event = notification.event_id
                ? eventById.get(notification.event_id)
                : null;
              const gallery = notification.gallery_id
                ? galleryById.get(notification.gallery_id)
                : null;
              const notificationHref =
                notification.href ||
                (gallery?.status === "published"
                  ? `/gallerie/${gallery.slug}`
                  : null);

              return (
                <article
                  key={notification.id}
                  className={
                    notification.read_at
                      ? "rounded-3xl border border-neutral-800 bg-neutral-950 p-5 opacity-70"
                      : "rounded-3xl border border-amber-900 bg-amber-950/20 p-5"
                  }
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                        {formatDate(notification.scheduled_for)}
                      </p>

                      <h3 className="mt-2 text-xl font-medium text-neutral-50">
                        {notification.title}
                      </h3>

                      <p className="mt-2 text-sm leading-7 text-neutral-300">
                        {notification.message}
                      </p>

                      {event && (
                        <p className="mt-2 text-sm text-amber-200">
                          <T
                            textKey="account.notifications.event.date"
                            fallback="Evento:"
                          />{" "}
                          {formatDate(event.starts_at)}
                        </p>
                      )}

                      <div className="mt-4">
                        {notificationHref ? (
                          <NotificationOpenLink
                            notificationId={notification.id}
                            href={notificationHref}
                          />
                        ) : gallery ? (
                          <span className="rounded-full border border-neutral-800 px-5 py-2 text-sm text-neutral-500">
                            <T
                              textKey="account.notifications.event.galleryInPreparation"
                              fallback="Galleria in preparazione"
                            />
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <NotificationReadButton
                      notificationId={notification.id}
                      isRead={Boolean(notification.read_at)}
                    />
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