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
  title = "Errore caricamento dati",
  message = "Non siamo riusciti a recuperare correttamente i dati richiesti.",
  details,
  actionHref,
  actionLabel = "Riprova",
  secondaryHref = "/dashboard",
  secondaryLabel = "Torna alla dashboard",
}: DataErrorCardProps) {
  return (
    <div className="rounded-3xl border border-red-900 bg-red-950/30 p-6 text-neutral-50">
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-red-300">
        Errore dati
      </p>

      <h2 className="text-2xl font-medium">{title}</h2>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-red-100/80">
        {message}
      </p>

      {details && (
        <div className="mt-5 rounded-2xl border border-red-900/70 bg-black/30 p-4">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-red-300/80">
            Dettaglio tecnico
          </p>

          <p className="break-all text-xs leading-6 text-red-100/70">
            {details}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {actionHref && (
          <a
            href={actionHref}
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            {actionLabel}
          </a>
        )}

        {secondaryHref && (
          <a
            href={secondaryHref}
            className="rounded-full border border-red-800 px-5 py-2 text-sm text-red-100 transition hover:border-red-500"
          >
            {secondaryLabel}
          </a>
        )}
      </div>
    </div>
  );
}