type EmptyStateCardProps = {
  eyebrow?: string;
  title: string;
  message?: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function EmptyStateCard({
  eyebrow,
  title,
  message,
  actionHref,
  actionLabel,
}: EmptyStateCardProps) {
  return (
    <section className="museum-card rounded-[var(--museum-radius-lg)] p-5 sm:p-7">
      <p className="museum-label mb-3">
        {eyebrow ?? <T textKey="ux.state.empty" fallback="Da qui puoi iniziare" />}
      </p>

      <h2 className="font-editorial text-3xl font-medium text-[var(--museum-ivory)]">{title}</h2>

      {message && (
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--museum-stone)]">
          {message}
        </p>
      )}

      {actionHref && actionLabel && (
        <div className="mt-6">
          <a
            href={actionHref}
            className="museum-button-secondary min-h-11 rounded-xl px-5 py-2"
          >
            {actionLabel}
          </a>
        </div>
      )}
    </section>
  );
}
import T from "@/components/i18n/T";
