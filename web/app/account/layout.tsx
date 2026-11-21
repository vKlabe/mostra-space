import type { Metadata } from "next";
import { BlackWeekBanner } from "@/components/billing/BlackWeek";
import { NO_INDEX_METADATA } from "@/lib/seo/site";

export const metadata: Metadata = NO_INDEX_METADATA;

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BlackWeekBanner className="mx-auto max-w-[100rem] px-5 pt-16 lg:pl-80 lg:pr-8 lg:pt-6" />
      {children}
    </>
  );
}
