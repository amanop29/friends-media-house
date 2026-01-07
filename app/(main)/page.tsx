import { Home } from '@/views/Home';
import { Metadata } from 'next';
import { getSettings } from '@/lib/settings';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// Base URL for building absolute links
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://friendsmediahouse.com';

// Fetch OG image from Supabase settings (server-side) with safe fallback
async function getHomeOGImage(): Promise<string | undefined> {
  const client = supabaseAdmin ?? supabase;

  if (!client || typeof client.from !== 'function') {
    return undefined;
  }

  const { data, error } = await client
    .from('settings')
    .select('value')
    .eq('key', 'site_config')
    .single();

  if (error || !data) {
    return undefined;
  }

  const settings = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
  const homeBannerUrl = settings?.homeBannerUrl as string | undefined;

  if (!homeBannerUrl) return undefined;

  // Ensure absolute URL for social previews
  if (homeBannerUrl.startsWith('http')) return homeBannerUrl;
  return `${siteUrl}${homeBannerUrl.startsWith('/') ? '' : '/'}${homeBannerUrl}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = getSettings();
  const baseUrl = siteUrl;

  // Try Supabase first so social share uses stored banner; fall back to local/defaults
  const ogImage = (await getHomeOGImage()) || settings.homeBannerUrl || `${baseUrl}/og-image.jpg`;

  return {
    metadataBase: new URL(baseUrl),
    title: 'Friends Media House | Professional Event Photography & Videography',
    description: 'Professional event photography and videography services. Capturing your special moments with creativity and excellence.',
    openGraph: {
      title: 'Friends Media House | Professional Event Photography & Videography',
      description: 'Professional event photography and videography services. Capturing your special moments with creativity and excellence.',
      url: baseUrl,
      siteName: 'Friends Media House',
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: 'Friends Media House - Professional Event Photography',
              type: 'image/jpeg',
              secureUrl: ogImage,
            },
          ]
        : [],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Friends Media House',
      description: 'Professional event photography and videography services.',
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default function HomePage() {
  return <Home />;
}
