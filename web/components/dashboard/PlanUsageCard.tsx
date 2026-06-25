import {
  bytesToMb,
  formatLimitValue,
  formatMb,
  getPlanLimits,
  getPlanUsagePercentage,
  normalizePlanName,
  type PlanName,
} from "@/lib/plans";
import CustomerPortalButton from "@/components/billing/CustomerPortalButton";

type PlanUsageCardProps = {
  plan: PlanName | string | null | undefined;
  galleriesCount: number;
  artworksCount: number;
  storageUsedBytes: number;
  monthlyRequestsCount: number;
  stripeSubscriptionStatus?: string | null;
  stripeCurrentPeriodEnd?: string | null;
  stripeCancelAtPeriodEnd?: boolean | null;
};

function UsageRow({
  label,
  current,
  limit,
  unit,
}: {
  label: string;
  current: number;
  limit: number | null;
  unit?: string;
}) {
  const percentage = getPlanUsagePercentage(current, limit);

  return (
    <div className="rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.34)] p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-[var(--museum-stone-muted)]">{label}</span>

        <span className="text-[var(--museum-ivory-soft)]">
          {unit === "mb"
            ? `${formatMb(current)} / ${formatMb(limit)}`
            : `${current} / ${formatLimitValue(limit)}`}
        </span>
      </div>

      {limit !== null && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(8,7,5,0.72)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--museum-bronze),var(--museum-bronze-light))]"
            style={{
              width: `${percentage}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function formatBillingDate(value?: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function PlanUsageCard({
  plan,
  galleriesCount,
  artworksCount,
  storageUsedBytes,
  monthlyRequestsCount,
  stripeSubscriptionStatus,
  stripeCurrentPeriodEnd,
  stripeCancelAtPeriodEnd,
}: PlanUsageCardProps) {
  const planName = normalizePlanName(plan);
  const limits = getPlanLimits(planName);
  const storageUsedMb = Number(bytesToMb(storageUsedBytes).toFixed(2));
  const billingDate = formatBillingDate(stripeCurrentPeriodEnd);
const hasPaidPlan = planName !== "free";
  const hasActiveStripeSubscription =
    stripeSubscriptionStatus === "active" ||
    stripeSubscriptionStatus === "trialing" ||
    stripeSubscriptionStatus === "past_due";

  return (
    <article className="museum-dashboard-card rounded-[1.75rem] p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="museum-label mb-3">
  Piano account
</p>

          <h2 className="font-editorial text-4xl font-medium text-[var(--museum-ivory)]">
  {limits.label}
</h2>

          <p className="mt-2 text-sm text-[var(--museum-stone)]">
  {limits.monthlyPriceLabel}
</p>
        </div>

        <div className="flex flex-wrap gap-3">
  <a
    href="/pricing"
    className="museum-button-secondary px-5 py-2.5"
  >
    Vedi piani e upgrade
  </a>

  {planName !== "free" && (
    <CustomerPortalButton className="museum-button-primary px-5 py-2.5">
      Gestisci abbonamento
    </CustomerPortalButton>
  )}
</div>
      </div>

            {hasPaidPlan && (
        <div className="mt-6 rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-4">
          <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-[var(--museum-ivory)]">
                Abbonamento Stripe
              </p>

              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--museum-stone-muted)]">
                {stripeSubscriptionStatus || "stato non disponibile"}
              </p>
            </div>

            {billingDate && (
              <p className="text-sm text-[var(--museum-ivory-soft)]">
                {stripeCancelAtPeriodEnd
                  ? `Attivo fino al ${billingDate}`
                  : `Rinnovo previsto il ${billingDate}`}
              </p>
            )}
          </div>

          {stripeCancelAtPeriodEnd && (
            <p className="mt-3 rounded-xl border border-[rgba(201,155,74,0.45)] bg-[rgba(201,155,74,0.08)] px-4 py-3 text-xs leading-5 text-[var(--museum-warning)]">
              Cancellazione programmata: il piano resta attivo fino alla fine
              del periodo già pagato.
            </p>
          )}

          {!hasActiveStripeSubscription && (
            <p className="mt-3 rounded-xl border border-[rgba(182,91,78,0.45)] bg-[rgba(182,91,78,0.08)] px-4 py-3 text-xs leading-5 text-[var(--museum-danger)]">
              L’abbonamento non risulta attivo. Se hai appena pagato, attendi
              qualche secondo e ricarica la pagina.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 space-y-5">
        <UsageRow
          label="Gallerie"
          current={galleriesCount}
          limit={limits.maxGalleries}
        />

        <UsageRow
          label="Opere"
          current={artworksCount}
          limit={limits.maxArtworksTotal}
        />

        <UsageRow
          label="Storage"
          current={storageUsedMb}
          limit={limits.maxStorageMb}
          unit="mb"
        />

        <UsageRow
          label="Richieste mese"
          current={monthlyRequestsCount}
          limit={limits.maxRequestsPerMonth}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--museum-border)] bg-[rgba(8,7,5,0.42)] p-4">
        <p className="text-xs leading-5 text-[var(--museum-stone)]">
          Runtime WebGL: massimo{" "}
          <span className="text-[var(--museum-ivory-soft)]">
            {formatLimitValue(limits.maxArtworksVisiblePerRoom)}
          </span>{" "}
          opere visibili/caricate per sala.
        </p>
      </div>
    </article>
  );
}