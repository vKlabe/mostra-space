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
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-neutral-400">{label}</span>

        <span className="text-neutral-200">
          {unit === "mb"
            ? `${formatMb(current)} / ${formatMb(limit)}`
            : `${current} / ${formatLimitValue(limit)}`}
        </span>
      </div>

      {limit !== null && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-950">
          <div
            className="h-full rounded-full bg-white"
            style={{
              width: `${percentage}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function PlanUsageCard({
  plan,
  galleriesCount,
  artworksCount,
  storageUsedBytes,
  monthlyRequestsCount,
}: PlanUsageCardProps) {
  const planName = normalizePlanName(plan);
  const limits = getPlanLimits(planName);
  const storageUsedMb = Number(bytesToMb(storageUsedBytes).toFixed(2));

  return (
    <article className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
            Piano account
          </p>

          <h2 className="text-2xl font-medium">{limits.label}</h2>

          <p className="mt-2 text-sm text-neutral-500">
            {limits.monthlyPriceLabel}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
  <a
    href="/pricing"
    className="rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
  >
    Vedi piani e upgrade
  </a>

  {planName !== "free" && (
    <CustomerPortalButton>
      Gestisci abbonamento
    </CustomerPortalButton>
  )}
</div>
      </div>

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

      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
        <p className="text-xs leading-5 text-neutral-500">
          Runtime WebGL: massimo{" "}
          <span className="text-neutral-300">
            {formatLimitValue(limits.maxArtworksVisiblePerRoom)}
          </span>{" "}
          opere visibili/caricate per sala.
        </p>
      </div>
    </article>
  );
}