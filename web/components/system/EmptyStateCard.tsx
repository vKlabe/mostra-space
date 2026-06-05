type EmptyStateCardProps = {
  eyebrow?: string;
  title: string;
  message?: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function EmptyStateCard({
  eyebrow = "Nessun dato",
  title,
  message,
  actionHref,
  actionLabel,
}: EmptyStateCardProps) {
  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 text-neutral-50">
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-neutral-500">
        {eyebrow}
      </p>

      <h2 className="text-2xl font-medium">{title}</h2>

      {message && (
        <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-400">
          {message}
        </p>
      )}

      {actionHref && actionLabel && (
        <div className="mt-6">
          <a
            href={actionHref}
            className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-100 transition hover:border-neutral-400"
          >
            {actionLabel}
          </a>
        </div>
      )}
    </div>
  );
}