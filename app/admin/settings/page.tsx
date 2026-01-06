import { Settings } from '@/views/admin/Settings';

export const metadata = {
  title: 'Settings - Admin',
  description: 'Admin settings',
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return <Settings />;
}
