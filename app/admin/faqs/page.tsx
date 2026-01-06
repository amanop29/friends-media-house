import { ManageFAQs } from '@/views/admin/ManageFAQs';

export const metadata = {
  title: 'Manage FAQs - Admin',
  description: 'Manage frequently asked questions',
  robots: { index: false, follow: false },
};

export default function ManageFAQsPage() {
  return <ManageFAQs />;
}
