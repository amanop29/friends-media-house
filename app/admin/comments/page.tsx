import { ManageComments } from '@/views/admin/ManageComments';

export const metadata = {
  title: 'Manage Comments - Admin',
  description: 'Manage photo comments',
  robots: { index: false, follow: false },
};

export default function ManageCommentsPage() {
  return <ManageComments />;
}
