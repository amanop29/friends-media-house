import { Home } from '@/views/Home';

// Homepage inherits OG metadata from root layout
// Only needs to define its own title (optional)
export const metadata = {
  title: 'Home',
  description: 'Professional event photography and videography services. Capturing your special moments with creativity and excellence.',
};

export default function HomePage() {
  return <Home />;
}
