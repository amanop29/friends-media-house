import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/sonner';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import '@/styles/globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-playfair',
});

// Base URL for absolute paths
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://friendsmediahouse.com';

// Get OG image from Supabase settings (server-side)
async function getOGImage(): Promise<string> {
  // Prefer service role, but allow public client so metadata works without the service key
  const client = supabaseAdmin ?? supabase;

  if (!client || typeof client.from !== 'function') {
    throw new Error('Supabase client not configured');
  }

  const { data, error } = await client
    .from('settings')
    .select('value')
    .eq('key', 'site_config')
    .single();

  if (error) {
    throw new Error(`Failed to fetch settings: ${error.message}`);
  }

  if (!data) {
    throw new Error('No settings data found in database');
  }

  const settings = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;

  if (!settings.homeBannerUrl) {
    throw new Error('homeBannerUrl not found in settings');
  }

  // Ensure absolute URL
  if (settings.homeBannerUrl.startsWith('http')) {
    return settings.homeBannerUrl;
  }

  return `${siteUrl}${settings.homeBannerUrl.startsWith('/') ? '' : '/'}${settings.homeBannerUrl}`;
}

// Generate metadata dynamically to fetch OG image from Supabase
export async function generateMetadata(): Promise<Metadata> {
  let ogImage: string | undefined;

  try {
    ogImage = await getOGImage();
  } catch (error) {
    console.warn('OG Image: failed to load from Supabase', error);
  }

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: 'Friends Media House | Professional Event Photography & Videography',
      template: '%s | Friends Media House',
    },
    description: 'Professional event photography and videography services. Capturing your special moments with creativity and excellence.',
    keywords: ['event photography', 'videography', 'wedding photography', 'corporate events', 'media house'],
    authors: [{ name: 'Friends Media House' }],
    creator: 'Friends Media House',
    publisher: 'Friends Media House',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: siteUrl,
      siteName: 'Friends Media House',
      title: 'Friends Media House | Professional Event Photography & Videography',
      description: 'Professional event photography and videography services. Capturing your special moments with creativity and excellence.',
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: 'Friends Media House - Professional Event Photography & Videography',
              type: 'image/jpeg',
              secureUrl: ogImage,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@friendsmediahouse',
      title: 'Friends Media House | Professional Event Photography & Videography',
      description: 'Professional event photography and videography services. Capturing your special moments with creativity and excellence.',
      creator: '@friendsmediahouse',
      images: ogImage
        ? {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: 'Friends Media House - Professional Event Photography & Videography',
          }
        : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon-16x16.png',
      apple: '/apple-touch-icon.png',
    },
    manifest: '/site.webmanifest',
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable} overflow-x-hidden`}>
      <body className={`${inter.className} overflow-x-hidden min-h-screen`}>
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors />
          <SpeedInsights />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
