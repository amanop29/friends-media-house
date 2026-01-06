import { ManageLeads } from '@/views/admin/ManageLeads';

export const metadata = {
  title: 'Manage Leads - Admin',
  description: 'Manage contact form submissions',
  robots: { index: false, follow: false },
};

export default function ManageLeadsPage() {
  return <ManageLeads />;
}
