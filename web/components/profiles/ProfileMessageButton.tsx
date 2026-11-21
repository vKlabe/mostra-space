import Link from "next/link";
import T from "@/components/i18n/T";

type ProfileMessageButtonProps = {
  profileId: string;
  canMessage: boolean;
};

export default function ProfileMessageButton({
  profileId,
  canMessage,
}: ProfileMessageButtonProps) {
  if (!canMessage) return null;

  return (
    <Link
      href={`/dashboard/social?messageProfile=${encodeURIComponent(profileId)}`}
      className="mt-3 inline-flex min-h-11 max-w-full items-center justify-center rounded-full border border-[var(--museum-bronze)] px-5 py-2 text-center text-sm font-medium text-[var(--museum-ivory)] transition hover:bg-[var(--museum-bronze)] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--museum-bronze-light)]"
    >
      <T textKey="messages.profile.action" fallback="Messaggio" />
    </Link>
  );
}
