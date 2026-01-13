import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { cache } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/sonner';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import NextTopLoader from 'nextjs-toploader';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import '@/styles/globals.css';

// Optimize metadata fetching - cache for 1 hour
export const revalidate = 3600;

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

// Get OG image from Supabase settings (server-side) with caching
const getOGImage = cache(async (): Promise<string | null> => {
  try {
    // Prefer service role, but allow public client so metadata works without the service key
    const client = supabaseAdmin ?? supabase;

    if (!client || typeof client.from !== 'function') {
      console.warn('[OG Image] Supabase client not configured');
      return null;
    }

    const { data, error } = await client
      .from('settings')
      .select('value')
      .eq('key', 'site_config')
      .single();

    if (error) {
      // Don't log warning for expected "no rows" error
      if (!error.message?.includes('no rows')) {
        console.warn('[OG Image] Failed to fetch settings:', error.message);
      }
      return null;
    }

    if (!data) {
      return null;
    }

    const settings = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;

    if (!settings?.homeBannerUrl) {
      return null;
    }

    // Ensure absolute URL
    let imageUrl = settings.homeBannerUrl;
    if (!imageUrl.startsWith('http')) {
      imageUrl = `${siteUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }

    return imageUrl;
  } catch (err) {
    console.error('[OG Image] Unexpected error:', err);
    return null;
  }
});

// Generate metadata dynamically to fetch OG image from Supabase
export async function generateMetadata(): Promise<Metadata> {
  const ogImage = await getOGImage();
  const fbAppId = process.env.NEXT_PUBLIC_FB_APP_ID;

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
    other: fbAppId ? {
      'fb:app_id': fbAppId,
    } : {},
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
      <head>
        {/* DNS prefetch and preconnect for faster image loading */}
        <link rel="dns-prefetch" href="https://pub-3f6e9022e56e4c97a0e76f6886a03ff4.r2.dev" />
        <link rel="preconnect" href="https://pub-3f6e9022e56e4c97a0e76f6886a03ff4.r2.dev" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} overflow-x-hidden min-h-screen`}>
        <NextTopLoader
          color="#C5A572"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #C5A572,0 0 5px #C5A572"
        />
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
