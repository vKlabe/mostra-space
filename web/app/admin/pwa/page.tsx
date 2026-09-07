import AdminShell from "@/components/admin/AdminShell";
import AdminPwaControls from "@/components/admin/AdminPwaControls";
import AdminPwaReadiness from "@/components/admin/AdminPwaReadiness";
import LocalDateTime from "@/components/time/LocalDateTime";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getPwaReadiness } from "@/lib/pwa/pwaReadiness.server";

type SubscriptionRow = {
  id: string;
  user_id: string;
  device_label: string | null;
  locale: string | null;
  timezone: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
  expires_at: string | null;
  disabled_at: string | null;
  failure_count: number;
  last_error_code: string | null;
  last_error_at: string | null;
};

type DeliveryStatus = "pending" | "processing" | "sent" | "failed" | "skipped";

type DeliveryRow = {
  id: string;
  notification_id: string;
  subscription_id: string;
  status: DeliveryStatus;
  attempt_count: number;
  next_attempt_at: string;
  last_attempt_at: string | null;
  sent_at: string | null;
  response_status: number | null;
  last_error_code: string | null;
  created_at: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  push_category: string | null;
  read_at: string | null;
  scheduled_for: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
};

type AdminActionRow = {
  id: string;
  admin_user_id: string | null;
  action: string;
  subscription_id: string | null;
  delivery_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return <LocalDateTime value={value} format="datetime" fallback="-" />;
}

function profileName(profile: ProfileRow | undefined) {
  return (
    profile?.display_name ||
    profile?.full_name ||
    profile?.email ||
    "Utente non disponibile"
  );
}

function statusClass(status: DeliveryStatus) {
  if (status === "sent") return "border-green-900 bg-green-950/40 text-green-300";
  if (status === "failed") return "border-red-900 bg-red-950/40 text-red-300";
  if (status === "processing") return "border-blue-900 bg-blue-950/40 text-blue-300";
  if (status === "pending") return "border-amber-900 bg-amber-950/30 text-amber-300";
  return "border-neutral-700 bg-neutral-950 text-neutral-400";
}

function actionLabel(action: string) {
  if (action === "dispatch_run") return "Dispatcher manuale";
  if (action === "delivery_requeued") return "Consegna rimessa in coda";
  if (action === "subscription_disabled") return "Endpoint disattivato";
  return action;
}

export default async function AdminPwaPage() {
  const { admin } = await requireAdmin();
  // Server-rendered operational snapshot; a single timestamp keeps every
  // metric and retry eligibility check internally consistent.
  // eslint-disable-next-line react-hooks/purity
  const snapshotTime = Date.now();
  const since24Hours = new Date(snapshotTime - 24 * 60 * 60 * 1000).toISOString();
  const readiness = await getPwaReadiness(admin);

  const [
    subscriptionsResult,
    deliveriesResult,
    activeCountResult,
    inactiveCountResult,
    enabledUsersResult,
    sentCountResult,
    failedCountResult,
    skippedCountResult,
    waitingCountResult,
    actionsResult,
  ] = await Promise.all([
    admin
      .from("pwa_push_subscriptions")
      .select(
        "id, user_id, device_label, locale, timezone, active, created_at, updated_at, last_seen_at, expires_at, disabled_at, failure_count, last_error_code, last_error_at"
      )
      .order("updated_at", { ascending: false })
      .limit(100),
    admin
      .from("pwa_push_deliveries")
      .select(
        "id, notification_id, subscription_id, status, attempt_count, next_attempt_at, last_attempt_at, sent_at, response_status, last_error_code, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("pwa_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    admin
      .from("pwa_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("active", false),
    admin
      .from("pwa_push_preferences")
      .select("user_id", { count: "exact", head: true })
      .eq("push_enabled", true),
    admin
      .from("pwa_push_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("created_at", since24Hours),
    admin
      .from("pwa_push_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", since24Hours),
    admin
      .from("pwa_push_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("status", "skipped")
      .gte("created_at", since24Hours),
    admin
      .from("pwa_push_deliveries")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing"]),
    admin
      .from("pwa_push_admin_actions")
      .select(
        "id, admin_user_id, action, subscription_id, delivery_id, metadata, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const subscriptions = (subscriptionsResult.data || []) as SubscriptionRow[];
  const deliveries = (deliveriesResult.data || []) as DeliveryRow[];
  const actions = (actionsResult.data || []) as AdminActionRow[];
  const notificationIds = Array.from(
    new Set(deliveries.map((delivery) => delivery.notification_id))
  );
  const { data: notificationData, error: notificationError } =
    notificationIds.length > 0
      ? await admin
          .from("account_notifications")
          .select("id, user_id, type, push_category, read_at, scheduled_for")
          .in("id", notificationIds)
      : { data: [], error: null };
  const notifications = (notificationData || []) as NotificationRow[];
  const userIds = Array.from(
    new Set([
      ...subscriptions.map((subscription) => subscription.user_id),
      ...notifications.map((notification) => notification.user_id),
      ...actions
        .map((action) => action.admin_user_id)
        .filter((value): value is string => Boolean(value)),
    ])
  );
  const { data: profileData, error: profileError } =
    userIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, email, display_name, full_name")
          .in("id", userIds)
      : { data: [], error: null };
  const profiles = (profileData || []) as ProfileRow[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const subscriptionById = new Map(
    subscriptions.map((subscription) => [subscription.id, subscription])
  );
  const notificationById = new Map(
    notifications.map((notification) => [notification.id, notification])
  );
  const sent24 = sentCountResult.count || 0;
  const failed24 = failedCountResult.count || 0;
  const successRate =
    sent24 + failed24 > 0
      ? Math.round((sent24 / (sent24 + failed24)) * 1000) / 10
      : 100;
  const loadErrors = [
    subscriptionsResult.error,
    deliveriesResult.error,
    activeCountResult.error,
    inactiveCountResult.error,
    enabledUsersResult.error,
    sentCountResult.error,
    failedCountResult.error,
    skippedCountResult.error,
    waitingCountResult.error,
    actionsResult.error,
    notificationError,
    profileError,
  ].filter(Boolean);

  return (
    <AdminShell
      title="PWA e notifiche push"
      subtitle="Controlla dispositivi, coda, consegne, errori e operazioni amministrative del sistema Web Push."
      activeSection="pwa"
    >
      <AdminPwaReadiness initialReport={readiness} />

      {loadErrors.length > 0 && (
        <div className="mb-6 rounded-3xl border border-red-800 bg-red-950/30 p-6">
          <p className="text-lg font-medium">Dati PWA incompleti</p>
          <p className="mt-2 text-sm text-red-100">
            Una o più query di monitoraggio non sono riuscite. Verifica che la migrazione PWA 8 sia stata eseguita.
          </p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
        {[
          ["Dispositivi attivi", activeCountResult.count || 0, "Endpoint abilitati"],
          ["Dispositivi inattivi", inactiveCountResult.count || 0, "Scaduti o disattivati"],
          ["Utenti push", enabledUsersResult.count || 0, "Invio globale attivo"],
          ["Inviate 24h", sent24, `${successRate}% successo`],
          ["Fallite 24h", failed24, "Errori definitivi"],
          ["In attesa", waitingCountResult.count || 0, "Pending o processing"],
        ].map(([label, value, description]) => (
          <article
            key={String(label)}
            className="rounded-3xl border border-neutral-800 bg-neutral-900 p-5"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              {label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-neutral-100">{value}</p>
            <p className="mt-2 text-xs text-neutral-500">{description}</p>
          </article>
        ))}
      </div>

      <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-amber-500">
              Controllo operativo
            </p>
            <h2 className="mt-3 text-2xl font-medium">Dispatcher</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
              Il Cron continua a lavorare ogni minuto. Questo comando esegue subito un ciclo controllato e registra l’operazione.
            </p>
          </div>
          <AdminPwaControls action="dispatch" />
        </div>
        <p className="mt-4 text-xs text-neutral-600">
          Nelle ultime 24 ore: {skippedCountResult.count || 0} consegne ignorate perché già lette, disattivate o escluse dalle preferenze.
        </p>
      </section>

      <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
          Ultime consegne
        </p>
        <h2 className="mt-3 text-2xl font-medium">Coda e risultati</h2>

        {deliveries.length === 0 ? (
          <p className="mt-5 text-sm text-neutral-500">Nessuna consegna registrata.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {deliveries.map((delivery) => {
              const notification = notificationById.get(delivery.notification_id);
              const subscription = subscriptionById.get(delivery.subscription_id);
              const owner = notification
                ? profileById.get(notification.user_id)
                : subscription
                  ? profileById.get(subscription.user_id)
                  : undefined;
              const retryable =
                (delivery.status === "failed" || delivery.status === "skipped") &&
                subscription?.active &&
                notification &&
                !notification.read_at &&
                Date.parse(notification.scheduled_for) <= snapshotTime;

              return (
                <article
                  key={delivery.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                >
                  <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr_1fr_auto] xl:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(delivery.status)}`}>
                          {delivery.status}
                        </span>
                        <span className="text-xs text-neutral-600">
                          HTTP {delivery.response_status || "-"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-neutral-200">
                        {notification?.push_category || notification?.type || "Notifica rimossa"}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">{profileName(owner)}</p>
                    </div>
                    <div className="text-xs leading-6 text-neutral-500">
                      <p>Dispositivo: {subscription?.device_label || "Non disponibile"}</p>
                      <p>Tentativi: {delivery.attempt_count}</p>
                    </div>
                    <div className="text-xs leading-6 text-neutral-500">
                      <p>Creata: {formatDate(delivery.created_at)}</p>
                      <p>Inviata: {formatDate(delivery.sent_at)}</p>
                      {delivery.last_error_code && (
                        <p className="text-red-300">{delivery.last_error_code}</p>
                      )}
                    </div>
                    <div>
                      {retryable ? (
                        <AdminPwaControls
                          action="retry_delivery"
                          deliveryId={delivery.id}
                        />
                      ) : (
                        <span className="text-xs text-neutral-700">Nessuna azione</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
          Dispositivi registrati
        </p>
        <h2 className="mt-3 text-2xl font-medium">Salute degli endpoint</h2>

        {subscriptions.length === 0 ? (
          <p className="mt-5 text-sm text-neutral-500">Nessun endpoint registrato.</p>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {subscriptions.map((subscription) => (
              <article
                key={subscription.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-neutral-100">
                        {subscription.device_label || "Dispositivo senza nome"}
                      </p>
                      <span
                        className={
                          subscription.active
                            ? "rounded-full border border-green-900 bg-green-950/40 px-2 py-1 text-[10px] text-green-300"
                            : "rounded-full border border-neutral-700 px-2 py-1 text-[10px] text-neutral-500"
                        }
                      >
                        {subscription.active ? "attivo" : "inattivo"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-neutral-400">
                      {profileName(profileById.get(subscription.user_id))}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-neutral-600">
                      {subscription.locale || "-"} · {subscription.timezone || "-"}
                      <br />
                      Ultima attività: {formatDate(subscription.last_seen_at)}
                      <br />
                      Errori consecutivi: {subscription.failure_count}
                    </p>
                    {subscription.last_error_code && (
                      <p className="mt-2 text-xs text-red-300">
                        {subscription.last_error_code} · {formatDate(subscription.last_error_at)}
                      </p>
                    )}
                  </div>
                  {subscription.active && (
                    <AdminPwaControls
                      action="disable_subscription"
                      subscriptionId={subscription.id}
                    />
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
          Registro amministrativo
        </p>
        <h2 className="mt-3 text-2xl font-medium">Ultime operazioni manuali</h2>

        {actions.length === 0 ? (
          <p className="mt-5 text-sm text-neutral-500">Nessuna operazione manuale.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {actions.map((action) => (
              <div
                key={action.id}
                className="flex flex-col justify-between gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 md:flex-row md:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-200">
                    {actionLabel(action.action)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-600">
                    {profileName(
                      action.admin_user_id
                        ? profileById.get(action.admin_user_id)
                        : undefined
                    )}
                  </p>
                </div>
                <p className="text-xs text-neutral-500">{formatDate(action.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
