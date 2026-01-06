import { Home } from '@/views/Home';
import { Metadata } from 'next';
import { getSettings } from '@/lib/settings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = getSettings();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://friendsmediahouse.com';
  const ogImage = settings.homeBannerUrl || `${baseUrl}/og-image.jpg`;

  return {
    title: 'Friends Media House | Professional Event Photography & Videography',
    description: 'Professional event photography and videography services. Capturing your special moments with creativity and excellence.',
    openGraph: {
      title: 'Friends Media House | Professional Event Photography & Videography',
      description: 'Professional event photography and videography services. Capturing your special moments with creativity and excellence.',
      url: baseUrl,
      siteName: 'Friends Media House',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: 'Friends Media House - Professional Event Photography',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Friends Media House',
      description: 'Professional event photography and videography services.',
      images: [ogImage],
    },
  };
}

export default function HomePage() {
  return <Home />;
}
