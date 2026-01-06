import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/sonner';
import { getSettings } from '@/lib/settings';
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

// Get default OG image - will use home banner if available
function getOGImage() {
  try {
    const settings = getSettings();
    if (settings.homeBannerUrl) {
      return settings.homeBannerUrl;
    }
  } catch (error) {
    console.warn('Could not load settings for OG image:', error);
  }
  return '/og-image.jpg';
}

const ogImage = getOGImage();

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://friendsmediahouse.com'),
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
    url: 'https://friendsmediahouse.com',
    siteName: 'Friends Media House',
    title: 'Friends Media House | Professional Event Photography & Videography',
    description: 'Professional event photography and videography services.',
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'Friends Media House',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Friends Media House',
    description: 'Professional event photography and videography services.',
    images: [ogImage],
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
        </ThemeProvider>
      </body>
    </html>
  );
}
