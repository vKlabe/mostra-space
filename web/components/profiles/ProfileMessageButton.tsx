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
      className="mt-3 block rounded-full border border-[var(--museum-bronze)] px-5 py-2 text-center text-sm font-medium text-[var(--museum-ivory)] transition hover:bg-[var(--museum-bronze)] hover:text-black"
    >
      <T textKey="messages.profile.action" fallback="Messaggio" />
    </Link>
  );
}
