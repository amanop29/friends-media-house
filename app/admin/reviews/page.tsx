import { ManageReviews } from '@/views/admin/ManageReviews';

export const metadata = {
  title: 'Manage Reviews - Admin',
  description: 'Manage customer reviews',
  robots: { index: false, follow: false },
};

export default function ManageReviewsPage() {
  return <ManageReviews />;
}
