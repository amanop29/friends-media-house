import { ManageGalleries } from '@/views/admin/ManageGalleries';

export const metadata = {
  title: 'Manage Galleries - Admin',
  description: 'Manage photo galleries',
  robots: { index: false, follow: false },
};

export default function ManageGalleriesPage() {
  return <ManageGalleries />;
}
