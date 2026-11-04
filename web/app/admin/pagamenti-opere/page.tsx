import AdminShell from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { CommercePanel, CommerceTitle } from '@/components/commerce/CommerceUI';
export const dynamic = 'force-dynamic';
export default async function ArtworkPaymentsPage() {
  await requireAdmin();
  return <AdminShell title={<CommerceTitle mode="admin" />} activeSection="commerce"><CommercePanel mode="admin" /></AdminShell>;
}
