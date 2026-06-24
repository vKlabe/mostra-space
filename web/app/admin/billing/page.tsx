import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type BillingProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  role: string | null;
  plan: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  stripe_price_id: string | null;
  stripe_current_period_end: string | null;
  stripe_cancel_at_period_end: boolean | null;
  stripe_cancel_at: string | null;
  stripe_canceled_at: string | null;
  stripe_last_event_type: string | null;
  stripe_last_event_at: string | null;
};

type WebhookEvent = {
  id: string;
  stripe_event_id: string;
  event_type: string;
  livemode: boolean;
  customer_id: string | null;
  subscription_id: string | null;
  user_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getDisplayName(profile: BillingProfile) {
  return (
    profile.display_name ||
    profile.full_name ||
    profile.email ||
    `Utente ${profile.id.slice(0, 8)}`
  );
}

function truncateId(value?: string | null) {
  if (!value) {
    return "—";
  }

  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

function getPlanBadgeClass(plan?: string | null) {
  if (plan === "institution") {
    return "border-purple-800 bg-purple-950/40 text-purple-200";
  }

  if (plan === "business") {
    return "border-blue-800 bg-blue-950/40 text-blue-200";
  }

  if (plan === "pro") {
    return "border-emerald-800 bg-emerald-950/40 text-emerald-200";
  }

  return "border-neutral-800 bg-neutral-950 text-neutral-400";
}

function getStatusBadgeClass(status?: string | null) {
  if (status === "active" || status === "trialing") {
    return "border-emerald-800 bg-emerald-950/40 text-emerald-200";
  }

  if (status === "past_due") {
    return "border-yellow-800 bg-yellow-950/40 text-yellow-200";
  }

  if (status === "canceled" || status === "unpaid") {
    return "border-red-800 bg-red-950/40 text-red-200";
  }

  return "border-neutral-800 bg-neutral-950 text-neutral-400";
}

function getWebhookStatusClass(status?: string | null) {
  if (status === "processed") {
    return "border-emerald-800 bg-emerald-950/40 text-emerald-200";
  }

  if (status === "failed") {
    return "border-red-800 bg-red-950/40 text-red-200";
  }

  if (status === "processing") {
    return "border-yellow-800 bg-yellow-950/40 text-yellow-200";
  }

  return "border-neutral-800 bg-neutral-950 text-neutral-400";
}

function StatCard({
  label,
  value,
  help,
}: {
  label: string;
  value: number | string;
  help: string;
}) {
  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-neutral-400">{help}</p>
    </div>
  );
}

export default async function AdminBillingPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: string | null }>();

  if (currentProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  const [profilesResult, webhookEventsResult] = await Promise.all([
    admin
      .from("profiles")
      .select(
        [
          "id",
          "email",
          "display_name",
          "full_name",
          "role",
          "plan",
          "stripe_customer_id",
          "stripe_subscription_id",
          "stripe_subscription_status",
          "stripe_price_id",
          "stripe_current_period_end",
          "stripe_cancel_at_period_end",
          "stripe_cancel_at",
          "stripe_canceled_at",
          "stripe_last_event_type",
          "stripe_last_event_at",
        ].join(", ")
      )
      .order("stripe_last_event_at", { ascending: false, nullsFirst: false })
      .limit(200),
    admin
      .from("stripe_webhook_events")
      .select(
        [
          "id",
          "stripe_event_id",
          "event_type",
          "livemode",
          "customer_id",
          "subscription_id",
          "user_id",
          "status",
          "error_message",
          "created_at",
          "processed_at",
        ].join(", ")
      )
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const billingProfiles = ((profilesResult.data || []) as unknown) as BillingProfile[];
const webhookEvents = ((webhookEventsResult.data || []) as unknown) as WebhookEvent[];

  const paidAccounts = billingProfiles.filter(
    (profile) => profile.plan && profile.plan !== "free"
  ).length;

  const activeSubscriptions = billingProfiles.filter((profile) =>
    ["active", "trialing", "past_due"].includes(
      profile.stripe_subscription_status || ""
    )
  ).length;

  const scheduledCancellations = billingProfiles.filter(
    (profile) => profile.stripe_cancel_at_period_end
  ).length;

  const failedWebhookEvents = webhookEvents.filter(
    (event) => event.status === "failed"
  ).length;

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 border-b border-neutral-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Billing overview
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
              Controllo rapido di piani, subscription Stripe, cancellazioni
              programmate e ultimi eventi webhook.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin"
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-white"
            >
              Torna admin
            </Link>

            <Link
              href="/pricing"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
            >
              Vedi pricing
            </Link>
          </div>
        </div>

        {(profilesResult.error || webhookEventsResult.error) && (
          <div className="rounded-3xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-200">
            {profilesResult.error && (
              <p>Errore profili: {profilesResult.error.message}</p>
            )}
            {webhookEventsResult.error && (
              <p>Errore webhook events: {webhookEventsResult.error.message}</p>
            )}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Account paganti"
            value={paidAccounts}
            help="Profili con piano diverso da Free."
          />
          <StatCard
            label="Subscription attive"
            value={activeSubscriptions}
            help="active, trialing o past_due."
          />
          <StatCard
            label="Cancellazioni"
            value={scheduledCancellations}
            help="Abbonamenti con cancel_at_period_end."
          />
          <StatCard
            label="Webhook falliti"
            value={failedWebhookEvents}
            help="Eventi Stripe da controllare."
          />
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50">
          <div className="border-b border-neutral-800 p-5">
            <h2 className="text-xl font-semibold text-white">
              Utenti e abbonamenti
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              Ultimi 200 profili, ordinati per ultimo evento Stripe.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-800 text-sm">
              <thead className="bg-neutral-950/80 text-left text-xs uppercase tracking-[0.16em] text-neutral-500">
                <tr>
                  <th className="px-5 py-4">Utente</th>
                  <th className="px-5 py-4">Piano</th>
                  <th className="px-5 py-4">Stato</th>
                  <th className="px-5 py-4">Periodo</th>
                  <th className="px-5 py-4">Cancellazione</th>
                  <th className="px-5 py-4">Stripe</th>
                  <th className="px-5 py-4">Ultimo evento</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800">
                {billingProfiles.map((profile) => (
                  <tr key={profile.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-medium text-white">
                        {getDisplayName(profile)}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {profile.email || "Email non disponibile"}
                      </p>
                      <p className="mt-1 text-xs text-neutral-600">
                        {profile.role || "role n/d"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getPlanBadgeClass(
                          profile.plan
                        )}`}
                      >
                        {profile.plan || "n/d"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                          profile.stripe_subscription_status
                        )}`}
                      >
                        {profile.stripe_subscription_status || "nessuna"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-neutral-300">
                      <p>
                        Fine periodo:{" "}
                        <span className="text-white">
                          {formatShortDate(profile.stripe_current_period_end)}
                        </span>
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {profile.stripe_cancel_at_period_end ? (
                        <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 px-3 py-2 text-xs leading-5 text-yellow-200">
                          Programmata
                          <br />
                          fino al{" "}
                          {formatShortDate(profile.stripe_current_period_end)}
                        </div>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs leading-5 text-neutral-400">
                      <p>cus: {truncateId(profile.stripe_customer_id)}</p>
                      <p>sub: {truncateId(profile.stripe_subscription_id)}</p>
                      <p>price: {truncateId(profile.stripe_price_id)}</p>
                    </td>

                    <td className="px-5 py-4 text-xs leading-5 text-neutral-400">
                      <p>{profile.stripe_last_event_type || "—"}</p>
                      <p>{formatDate(profile.stripe_last_event_at)}</p>
                    </td>
                  </tr>
                ))}

                {billingProfiles.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-neutral-500"
                    >
                      Nessun profilo trovato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-900/50">
          <div className="border-b border-neutral-800 p-5">
            <h2 className="text-xl font-semibold text-white">
              Ultimi eventi webhook Stripe
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              Gli ultimi 40 eventi ricevuti dalla route{" "}
              <code className="rounded bg-neutral-950 px-1.5 py-0.5 text-neutral-300">
                /api/stripe/webhook
              </code>
              .
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-800 text-sm">
              <thead className="bg-neutral-950/80 text-left text-xs uppercase tracking-[0.16em] text-neutral-500">
                <tr>
                  <th className="px-5 py-4">Evento</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Mode</th>
                  <th className="px-5 py-4">Stripe IDs</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Errore</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800">
                {webhookEvents.map((event) => (
                  <tr key={event.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-medium text-white">
                        {event.event_type}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {truncateId(event.stripe_event_id)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getWebhookStatusClass(
                          event.status
                        )}`}
                      >
                        {event.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-neutral-300">
                        {event.livemode ? "live" : "test"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs leading-5 text-neutral-400">
                      <p>cus: {truncateId(event.customer_id)}</p>
                      <p>sub: {truncateId(event.subscription_id)}</p>
                      <p>user: {truncateId(event.user_id)}</p>
                    </td>

                    <td className="px-5 py-4 text-xs leading-5 text-neutral-400">
                      <p>Ricevuto: {formatDate(event.created_at)}</p>
                      <p>Processato: {formatDate(event.processed_at)}</p>
                    </td>

                    <td className="max-w-sm px-5 py-4 text-xs leading-5 text-red-200">
                      {event.error_message || (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}

                {webhookEvents.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-neutral-500"
                    >
                      Nessun evento webhook ancora registrato. Dopo il prossimo
                      evento Stripe live, questa tabella si riempirà.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}