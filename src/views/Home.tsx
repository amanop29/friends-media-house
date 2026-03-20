import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { EventCoverPlaceholder } from '@/components/EventCoverPlaceholder';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { HomeHeroClient } from '@/components/home/HomeHeroClient';
import { LazyFAQSectionClient } from '@/components/home/LazyFAQSectionClient';
import { getHomeBannerUrls, DEFAULT_SETTINGS, type SiteSettings } from '@/lib/settings';

interface FeaturedEvent {
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
}

interface HomeProps {
  initialSettings?: SiteSettings;
  initialFeaturedEvents?: FeaturedEvent[];
}

export function Home({ initialSettings, initialFeaturedEvents = [] }: HomeProps) {
  const settings = initialSettings || DEFAULT_SETTINGS;
  const bannerImages = getHomeBannerUrls(settings);

  return (
    <div className="min-h-screen">
      <HomeHeroClient tagline={settings.tagline} bannerImages={bannerImages} />

      <section className="py-[48px] lg:px-8 px-[32px]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Featured Work
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Explore some of our most memorable moments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {initialFeaturedEvents.length > 0 ? (
              initialFeaturedEvents.map((event, index) => (
                <Link key={event.id} href={`/events/${event.slug || event.id}`}>
                  <GlassCard hover className="overflow-hidden group">
                    <div className="relative h-64 overflow-hidden bg-[#0f0f0f]">
                      {event.coverImage ? (
                        <ImageWithFallback
                          src={event.coverThumbnail || event.coverImage}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          eager={index < 3}
                          fetchPriority={index < 3 ? 'high' : 'auto'}
                          fallback={
                            <EventCoverPlaceholder
                              title={event.title}
                              subtitle={event.coupleNames}
                              className="h-full w-full"
                            />
                          }
                        />
                      ) : (
                        <EventCoverPlaceholder
                          title={event.title}
                          subtitle={event.coupleNames}
                          className="h-full w-full"
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end p-6">
                        <h3 className="text-white mb-2">{event.title}</h3>
                        <p className="text-white/80 text-sm">{event.coupleNames}</p>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No featured events available</p>
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <Link href="/gallery">
              <Button variant="outline" className="rounded-full px-8 border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white">
                View All Events <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <LazyFAQSectionClient />

      <section className="md:py-6 lg:px-8 bg-[#FAFAFA] dark:bg-[#0F0F0F] px-[32px] py-[0px]">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-8 md:p-12 lg:p-16 text-center">
            <h2 className="text-gray-900 dark:text-white mb-4 md:mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
              Ready to Capture Your Special Moments?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6 md:mb-8 max-w-2xl mx-auto">
              Let us create beautiful memories that you'll treasure for a lifetime. Book your event with Friends Media House today.
            </p>
            <Link href="/contact">
              <Button className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full px-6 md:px-8 py-4 md:py-6">
                Book Your Event Now
              </Button>
            </Link>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
