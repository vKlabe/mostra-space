import type { Metadata } from "next";
import { NO_INDEX_METADATA } from "@/lib/seo/site";

export const metadata: Metadata = NO_INDEX_METADATA;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
