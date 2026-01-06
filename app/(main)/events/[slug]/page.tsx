import { EventDetail } from '@/views/EventDetail';
import { getEvents } from '@/lib/events-store';

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props) {
  // Fetch event data for metadata
  const { slug } = await params;
  const events = getEvents();
  const event = events.find(e => e.slug === slug || e.id === slug);
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://friendsmediahouse.com';
  
  if (!event) {
    return {
      title: 'Event Not Found',
      description: 'The requested event could not be found.',
    };
  }
  
  const eventUrl = `${baseUrl}/events/${slug}`;
  const eventTitle = `${event.title} - ${event.coupleNames}`;
  const eventDescription = `View photos and details from ${event.title} at ${event.location}. Captured by Friends Media House.`;
  const coverImage = event.coverImage || `${baseUrl}/og-image.jpg`;
  
  return {
    title: eventTitle,
    description: eventDescription,
    openGraph: {
      type: 'website',
      title: eventTitle,
      description: eventDescription,
      url: eventUrl,
      siteName: 'Friends Media House',
      images: [
        {
          url: coverImage,
          width: 1200,
          height: 630,
          alt: eventTitle,
          type: 'image/jpeg',
        },
      ],
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@friendsmediahouse',
      title: eventTitle,
      description: eventDescription,
      creator: '@friendsmediahouse',
      images: [coverImage],
    },
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  return <EventDetail slug={slug} />;
}
