"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import T from "@/components/i18n/T";

type NotificationType =
  | "event_created"
  | "event_3_days_before"
  | "event_30_minutes_before"
  | "gallery_published"
  | "status_published";

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  eventId: string | null;
  galleryId: string | null;
  statusId: string | null;
  actorProfileId: string | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  href: string | null;
  scheduledFor: string;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationResponse = {
  success?: boolean;
  notifications?: NotificationItem[];
  unreadCount?: number;
};

type ToastState =
  | {
      mode: "item";
      item: NotificationItem;
    }
  | {
      mode: "summary";
      count: number;
      latest: NotificationItem | null;
    }
  | null;

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function getInitial(value: string | null) {
  return value?.trim().slice(0, 1).toUpperCase() || "M";
}

function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function DashboardNotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const toastTimerRef = useRef<number | null>(null);

  function scheduleToastDismiss() {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 7000);
  }

  async function fetchNotifications(options?: {
    announceNew?: boolean;
  }) {
    try {
      const response = await fetch("/api/account/notifications?limit=30", {
        cache: "no-store",
      });
      const result = (await response.json().catch(() => null)) as NotificationResponse | null;

      if (!response.ok || !result?.success) {
        return;
      }

      const nextNotifications = result.notifications || [];
      const previousKnownIds = knownIdsRef.current;
      const newlyDue = options?.announceNew
        ? nextNotifications.filter((item) => !previousKnownIds.has(item.id))
        : [];

      knownIdsRef.current = new Set(nextNotifications.map((item) => item.id));
      setNotifications(nextNotifications);
      setUnreadCount(Number(result.unreadCount) || 0);


      if (newlyDue.length > 0) {
        const unreadNew = newlyDue.filter((item) => !item.readAt);
        const visibleNew = unreadNew.length > 0 ? unreadNew : newlyDue;
        const latestNew = visibleNew[0] || null;

        if (visibleNew.length > 1) {
          setToast({
            mode: "summary",
            count: visibleNew.length,
            latest: latestNew,
          });
          scheduleToastDismiss();
        } else if (latestNew) {
          setToast({ mode: "item", item: latestNew });
          scheduleToastDismiss();
        }
      }
    } catch {
      // A temporary network error must not affect the rest of the dashboard.
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: number | null = null;
    let cancelled = false;

    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/account/notifications?limit=30", {
          cache: "no-store",
        });
        const result = (await response.json().catch(() => null)) as NotificationResponse | null;

        if (!cancelled && response.ok && result?.success) {
          const items = result.notifications || [];
          knownIdsRef.current = new Set(items.map((item) => item.id));
          setNotifications(items);
          setUnreadCount(Number(result.unreadCount) || 0);
          setIsLoading(false);

          const newlyDeliveredUnread = items.filter(
            (item) => !item.readAt && !item.deliveredAt
          );

          if (newlyDeliveredUnread.length === 1) {
            setToast({ mode: "item", item: newlyDeliveredUnread[0] });
            scheduleToastDismiss();
          } else if (newlyDeliveredUnread.length > 1) {
            setToast({
              mode: "summary",
              count: newlyDeliveredUnread.length,
              latest: newlyDeliveredUnread[0] || null,
            });
            scheduleToastDismiss();
          }
        } else if (!cancelled) {
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setIsLoading(false);
        }
      }

      if (cancelled) {
        return;
      }

      channel = supabase
        .channel(`dashboard-notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "account_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const scheduledFor = String(payload.new?.scheduled_for || "");
            const scheduledTime = new Date(scheduledFor).getTime();

            if (
              scheduledFor &&
              Number.isFinite(scheduledTime) &&
              scheduledTime > Date.now() + 5000
            ) {
              return;
            }

            window.setTimeout(() => {
              void fetchNotifications({ announceNew: true });
            }, 250);
          }
        )
        .subscribe();

      pollTimer = window.setInterval(() => {
        void fetchNotifications({ announceNew: true });
      }, 60000);
    }

    void initialize();

    return () => {
      cancelled = true;

      if (channel) {
        void supabase.removeChannel(channel);
      }

      if (pollTimer) {
        window.clearInterval(pollTimer);
      }

      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
    // The component is mounted once per DashboardShell render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function markAsRead(notificationId: string) {
    const item = notifications.find((notification) => notification.id === notificationId);

    if (!item || item.readAt) {
      return true;
    }

    const response = await fetch(`/api/account/notifications/${notificationId}/read`, {
      method: "PATCH",
    });

    if (!response.ok) {
      return false;
    }

    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, readAt }
          : notification
      )
    );
    setUnreadCount((current) => Math.max(0, current - 1));
    return true;
  }

  async function openNotification(item: NotificationItem) {
    await markAsRead(item.id);
    setIsOpen(false);
    setToast(null);

    if (item.href) {
      window.location.assign(item.href);
    }
  }

  async function markAllAsRead() {
    if (isMarkingAll || unreadCount === 0) {
      return;
    }

    setIsMarkingAll(true);

    try {
      const response = await fetch("/api/account/notifications/read-all", {
        method: "PATCH",
      });

      if (!response.ok) {
        return;
      }

      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) =>
          notification.readAt ? notification : { ...notification, readAt }
        )
      );
      setUnreadCount(0);
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--museum-border)] text-[var(--museum-stone)] transition hover:border-[var(--museum-bronze-light)] hover:text-[var(--museum-ivory)]"
        >
          <BellIcon />
          <span className="sr-only">
            <T textKey="dashboard.notifications.open" fallback="Apri notifiche" />
          </span>

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--museum-bronze)] px-1 text-[10px] font-semibold leading-none text-black">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full z-[70] mt-3 w-[min(92vw,420px)] overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-800 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                  <T
                    textKey="dashboard.notifications.label"
                    fallback="Attività"
                  />
                </p>
                <p className="mt-1 text-sm font-medium text-neutral-100">
                  {unreadCount > 0 ? (
                    <>
                      {unreadCount}{" "}
                      <T
                        textKey="dashboard.notifications.unread"
                        fallback="da leggere"
                      />
                    </>
                  ) : (
                    <T
                      textKey="dashboard.notifications.noneUnread"
                      fallback="Tutto letto"
                    />
                  )}
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={isMarkingAll}
                  className="text-xs text-neutral-400 transition hover:text-white disabled:opacity-50"
                >
                  <T
                    textKey="dashboard.notifications.markAll"
                    fallback="Segna tutte"
                  />
                </button>
              )}
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-2">
              {isLoading ? (
                <p className="p-5 text-sm text-neutral-500">
                  <T
                    textKey="dashboard.notifications.loading"
                    fallback="Carico notifiche..."
                  />
                </p>
              ) : notifications.length === 0 ? (
                <p className="p-5 text-sm leading-6 text-neutral-500">
                  <T
                    textKey="dashboard.notifications.empty"
                    fallback="Non ci sono ancora notifiche. Le attività dei profili che segui appariranno qui."
                  />
                </p>
              ) : (
                notifications.slice(0, 20).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void openNotification(item)}
                    className={
                      item.readAt
                        ? "flex w-full gap-3 rounded-2xl px-3 py-3 text-left opacity-65 transition hover:bg-neutral-900"
                        : "flex w-full gap-3 rounded-2xl bg-neutral-900/75 px-3 py-3 text-left transition hover:bg-neutral-900"
                    }
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-neutral-800 bg-black">
                      {item.actorAvatarUrl ? (
                        <img
                          src={item.actorAvatarUrl}
                          alt={item.actorName || "mostra.space"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-serif text-sm text-amber-500">
                          {getInitial(item.actorName)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {item.actorName && (
                        <p className="mb-1 truncate text-[11px] uppercase tracking-[0.16em] text-amber-500/80">
                          {item.actorName}
                        </p>
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium leading-5 text-neutral-100">
                          {item.title}
                        </p>
                        {!item.readAt && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                        )}
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-400">
                        {item.message}
                      </p>

                      <p className="mt-2 text-[11px] text-neutral-600">
                        {formatNotificationDate(item.scheduledFor)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-neutral-800 p-3">
              <a
                href="/account/notifiche"
                onClick={() => setIsOpen(false)}
                className="block rounded-2xl border border-neutral-800 px-4 py-3 text-center text-xs font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-white"
              >
                <T
                  textKey="dashboard.notifications.viewAll"
                  fallback="Vedi tutte le notifiche"
                />
              </a>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed right-4 top-20 z-[90] w-[min(calc(100vw-2rem),390px)] rounded-3xl border border-neutral-700 bg-neutral-950/95 p-5 shadow-2xl shadow-black/50 backdrop-blur md:right-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-500">
                <T
                  textKey="dashboard.notifications.toast.label"
                  fallback="Nuova attività"
                />
              </p>

              {toast.mode === "item" && toast.item.actorName && (
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
                  {toast.item.actorName}
                </p>
              )}

              {toast.mode === "summary" ? (
                <>
                  <h3 className="mt-2 text-lg font-medium text-neutral-100">
                    {toast.count}{" "}
                    {toast.count === 1 ? (
                      <T
                        textKey="dashboard.notifications.toast.summarySingle"
                        fallback="nuova notifica"
                      />
                    ) : (
                      <T
                        textKey="dashboard.notifications.toast.summary"
                        fallback="nuove notifiche"
                      />
                    )}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-400">
                    {toast.latest?.title || (
                      <T
                        textKey="dashboard.notifications.toast.summaryDescription"
                        fallback="I profili che segui hanno pubblicato nuovi contenuti."
                      />
                    )}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="mt-2 text-lg font-medium text-neutral-100">
                    {toast.item.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-400">
                    {toast.item.message}
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-800 text-neutral-500 transition hover:border-neutral-600 hover:text-white"
            >
              <CloseIcon />
              <span className="sr-only">
                <T
                  textKey="dashboard.notifications.toast.close"
                  fallback="Chiudi notifica"
                />
              </span>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {toast.mode === "item" && toast.item.href && (
              <button
                type="button"
                onClick={() => void openNotification(toast.item)}
                className="rounded-full bg-white px-4 py-2 text-xs font-medium text-neutral-950 transition hover:bg-neutral-200"
              >
                <T textKey="dashboard.notifications.toast.open" fallback="Apri" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setToast(null);
                setIsOpen(true);
              }}
              className="rounded-full border border-neutral-700 px-4 py-2 text-xs text-neutral-200 transition hover:border-neutral-500"
            >
              <T
                textKey="dashboard.notifications.toast.viewNotifications"
                fallback="Vedi notifiche"
              />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
