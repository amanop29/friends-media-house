import { Home } from '@/views/Home';
import { DEFAULT_SETTINGS, type SiteSettings } from '@/lib/settings';
import { supabase, supabaseAdmin } from '@/lib/supabase';

type FeaturedEvent = {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  date: string;
  location?: string;
  category: string;
  coverImage: string;
  coverThumbnail?: string;
  coupleNames: string;
  isFeatured: boolean;
};

// Homepage inherits OG metadata from root layout
// Only needs to define its own title (optional)
export const metadata = {
  title: 'Home',
  description: 'Professional event photography and videography services. Capturing your special moments with creativity and excellence.',
};

// Revalidate every 60 seconds so updated settings appear quickly
export const revalidate = 60;

async function getHomeInitialData(): Promise<{
  settings: SiteSettings;
  featuredEvents: FeaturedEvent[];
}> {
  const client = supabaseAdmin ?? supabase;

  if (!client || typeof client.from !== 'function') {
    return {
      settings: DEFAULT_SETTINGS,
      featuredEvents: [],
    };
  }

  let settings: SiteSettings = DEFAULT_SETTINGS;
  try {
    const { data, error } = await client
      .from('settings')
      .select('value')
      .eq('key', 'site_config')
      .single();

    if (!error && data?.value) {
      const raw = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      settings = {
        ...DEFAULT_SETTINGS,
        ...raw,
      };
    }
  } catch {
    settings = DEFAULT_SETTINGS;
  }

  let featuredEvents: FeaturedEvent[] = [];
  try {
    const { data, error } = await client
      .from('events')
      .select('*')
      .eq('is_featured', true)
      .eq('is_visible', true)
      .order('date', { ascending: false })
      .limit(6);

    if (!error && data) {
      featuredEvents = data.map((event: any) => ({
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        date: event.date,
        location: event.location,
        category: event.custom_category || event.category,
        coverImage: event.cover_image || event.cover_image_url,
        coverThumbnail: event.cover_thumbnail || event.cover_image,
        coupleNames: event.couple_names,
        isFeatured: event.is_featured,
      }));
    }
  } catch {
    featuredEvents = [];
  }

  return { settings, featuredEvents };
}

export default async function HomePage() {
  const { settings, featuredEvents } = await getHomeInitialData();

  return <Home initialSettings={settings} initialFeaturedEvents={featuredEvents} />;
}
