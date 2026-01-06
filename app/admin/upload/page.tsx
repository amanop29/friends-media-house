import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Upload Media (moved)',
  description: 'This route has moved to Manage Galleries',
  robots: { index: false, follow: false },
};

export default function UploadMediaPage() {
  redirect('/admin/galleries');
}
