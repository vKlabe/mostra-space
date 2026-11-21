type DataWarningCardProps = {
  title?: string;
  message: string;
  details?: string | null;
};

export default function DataWarningCard({
  title,
  message,
  details,
}: DataWarningCardProps) {
  return (
    <section role="status" className="museum-card rounded-[var(--museum-radius-lg)] border-l-2 border-l-[var(--museum-warning)] p-5 sm:p-7">
      <p className="museum-label mb-3 text-[var(--museum-warning)]">
        <T textKey="ux.state.warning" fallback="Attenzione" />
      </p>

      <h2 className="font-editorial text-2xl font-medium">{title ?? <T textKey="ux.state.warningTitle" fallback="Alcuni dati sono incompleti" />}</h2>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--museum-stone)]">
        {message}
      </p>

      {details && (
        <p className="mt-4 break-all rounded-xl border border-[var(--museum-border)] bg-black/20 p-4 text-xs leading-6 text-[var(--museum-stone)]">
          {details}
        </p>
      )}
    </section>
  );
}
import T from "@/components/i18n/T";
