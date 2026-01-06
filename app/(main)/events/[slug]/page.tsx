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
  
  return {
    title: `${event.title} - ${event.coupleNames}`,
    description: `View photos and details from ${event.title} at ${event.location}. Captured by Friends Media House.`,
    openGraph: {
      title: `${event.title} - ${event.coupleNames}`,
      description: `View photos and details from ${event.title} at ${event.location}`,
      url: `${baseUrl}/events/${slug}`,
      siteName: 'Friends Media House',
      images: [
        {
          url: event.coverImage,
          width: 1200,
          height: 630,
          alt: `${event.title} - ${event.coupleNames}`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${event.title} - ${event.coupleNames}`,
      description: `View photos from ${event.title}`,
      images: [event.coverImage],
    },
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  return <EventDetail slug={slug} />;
}
