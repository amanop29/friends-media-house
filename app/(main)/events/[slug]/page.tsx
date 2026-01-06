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
  
  return {
    title: event ? event.title : 'Event',
    description: event ? `View photos and details from ${event.title} - ${event.coupleNames}` : `View event photos and details`,
    openGraph: event ? {
      title: event.title,
      description: `View photos and details from ${event.title} - ${event.coupleNames}`,
      image: event.coverImage,
      imageWidth: 1200,
      imageHeight: 630,
      url: `${baseUrl}/events/${slug}`,
      type: 'website',
    } : undefined,
    twitter: event ? {
      card: 'summary_large_image',
      title: event.title,
      description: `View photos and details from ${event.title} - ${event.coupleNames}`,
      image: event.coverImage,
    } : undefined,
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  return <EventDetail slug={slug} />;
}
