import { redirect } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { CommercePanel, CommerceTitle } from '@/components/commerce/CommerceUI';
import { actor } from '@/lib/commerce/server';
export const dynamic = 'force-dynamic';
export default async function PurchasesPage() {
  const current = await actor().catch(() => null);
  if (!current) redirect('/auth/login');
  return <DashboardShell title={<CommerceTitle mode="purchases" />} activeSection="acquisti" navMode={current.profile.role === "user" ? "community" : "creator"}><CommercePanel mode="buyer" /></DashboardShell>;
}
