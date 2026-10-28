import { redirect } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { CommercePanel, CommerceTitle } from '@/components/commerce/CommerceUI';
import { actor } from '@/lib/commerce/server';
export const dynamic = 'force-dynamic';
export default async function SalesPage() {
  const current = await actor('seller').catch(() => null);
  if (!current) redirect('/auth/login');
  return <DashboardShell title={<CommerceTitle mode="sales" />} activeSection="vendite"><CommercePanel mode="seller" /></DashboardShell>;
}
