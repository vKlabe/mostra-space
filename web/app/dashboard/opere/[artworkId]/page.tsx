import { redirect } from "next/navigation";

type DashboardArtworkDetailPageProps = {
  params: Promise<{
    artworkId: string;
  }>;
};

export default async function DashboardArtworkDetailPage({
  params,
}: DashboardArtworkDetailPageProps) {
  await params;

  redirect("/dashboard/opere");
}