import { ManageTeam } from '@/views/admin/ManageTeam';

export const metadata = {
  title: 'Manage Team - Admin',
  description: 'Manage the team members displayed on the About page',
  robots: { index: false, follow: false },
};

export default function ManageTeamPage() {
  return <ManageTeam />;
}
