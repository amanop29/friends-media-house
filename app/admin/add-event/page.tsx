import { AddEvent } from '@/views/admin/AddEvent';

export const metadata = {
  title: 'Add Event - Admin',
  description: 'Add new event',
  robots: { index: false, follow: false },
};

export default function AddEventPage() {
  return <AddEvent />;
}
