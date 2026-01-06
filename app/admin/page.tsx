import { Dashboard } from '@/views/admin/Dashboard';

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Friends Media House Admin Dashboard',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminDashboardPage() {
  return <Dashboard />;
}
