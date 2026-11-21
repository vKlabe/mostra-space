type DataErrorCardProps = {
  title?: string;
  message?: string;
  details?: string | null;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function DataErrorCard({
  title,
  message,
  details,
  actionHref,
  actionLabel,
  secondaryHref = "/dashboard",
  secondaryLabel,
}: DataErrorCardProps) {
  return (
    <section className="museum-card rounded-[var(--museum-radius-lg)] border-l-2 border-l-[var(--museum-danger)] p-5 sm:p-7">
      <div role="alert">
        <p className="museum-label mb-3 text-[var(--museum-danger)]"><T textKey="ux.state.error" fallback="Caricamento interrotto" /></p>
        <h2 className="font-editorial text-3xl font-medium">{title ?? <T textKey="ux.state.errorTitle" fallback="Questi dati non sono disponibili" />}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--museum-stone)]">
          {message ?? <T textKey="ux.state.errorMessage" fallback="Il caricamento dei dati richiesti si è interrotto." />}
        </p>
      </div>

      {details && (
        <details className="mt-5 rounded-xl border border-[var(--museum-border)] bg-black/20 px-4 py-3 text-sm text-[var(--museum-stone)]">
          <summary className="cursor-pointer font-medium text-[var(--museum-ivory-soft)]"><T textKey="ux.state.details" fallback="Dettagli tecnici" /></summary>
          <p className="mt-3 break-all text-xs leading-6">
            {details}
          </p>
        </details>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {actionHref && (
          <a
            href={actionHref}
            className="museum-button-primary min-h-11 rounded-xl px-5 py-2"
          >
            {actionLabel ?? <T textKey="ux.state.retry" fallback="Riprova" />}
          </a>
        )}

        {secondaryHref && (
          <a
            href={secondaryHref}
            className="museum-button-secondary min-h-11 rounded-xl px-5 py-2"
          >
            {secondaryLabel ?? <T textKey="ux.state.dashboard" fallback="Torna alla dashboard" />}
          </a>
        )}
      </div>
    </section>
  );
}
import T from "@/components/i18n/T";
