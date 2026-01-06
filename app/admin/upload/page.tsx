import { UploadMedia } from '@/views/admin/UploadMedia';

export const metadata = {
  title: 'Upload Media - Admin',
  description: 'Upload photos and videos',
  robots: { index: false, follow: false },
};

export default function UploadMediaPage() {
  return <UploadMedia />;
}
