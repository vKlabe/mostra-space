type DataWarningCardProps = {
  title?: string;
  message: string;
  details?: string | null;
};

export default function DataWarningCard({
  title = "Dati incompleti",
  message,
  details,
}: DataWarningCardProps) {
  return (
    <div className="rounded-3xl border border-yellow-900 bg-yellow-950/20 p-6 text-neutral-50">
      <p className="mb-3 text-xs uppercase tracking-[0.25em] text-yellow-300">
        Attenzione
      </p>

      <h2 className="text-xl font-medium text-yellow-50">{title}</h2>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-yellow-100/80">
        {message}
      </p>

      {details && (
        <p className="mt-4 break-all rounded-2xl border border-yellow-900/70 bg-black/20 p-4 text-xs leading-6 text-yellow-100/60">
          {details}
        </p>
      )}
    </div>
  );
}