'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HomeHeroClientProps {
  tagline: string;
  bannerImages: string[];
}

export function HomeHeroClient({ tagline, bannerImages }: HomeHeroClientProps) {
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const activeBannerImage = bannerImages[activeBannerIndex] || '';

  useEffect(() => {
    if (!activeBannerImage) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = activeBannerImage;
    link.fetchPriority = 'high';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [activeBannerImage]);

  useEffect(() => {
    if (bannerImages.length < 2) return;

    const intervalId = window.setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % bannerImages.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [bannerImages.length]);

  const showPreviousBanner = () => {
    if (bannerImages.length < 2) return;
    setActiveBannerIndex((prev) => (prev - 1 + bannerImages.length) % bannerImages.length);
  };

  const showNextBanner = () => {
    if (bannerImages.length < 2) return;
    setActiveBannerIndex((prev) => (prev + 1) % bannerImages.length);
  };

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="absolute inset-0">
        {activeBannerImage ? (
          <img
            key={activeBannerImage}
            src={activeBannerImage}
            alt={`Hero Banner ${activeBannerIndex + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-[#FAFAFA] dark:to-[#0F0F0F]" />

        {bannerImages.length > 1 && (
          <>
            <div className="absolute inset-y-0 left-4 z-10 hidden items-center md:flex">
              <button
                type="button"
                onClick={showPreviousBanner}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-md transition hover:border-[#C5A572]/60 hover:text-[#C5A572]"
                aria-label="Show previous banner"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>

            <div className="absolute inset-y-0 right-4 z-10 hidden items-center md:flex">
              <button
                type="button"
                onClick={showNextBanner}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-md transition hover:border-[#C5A572]/60 hover:text-[#C5A572]"
                aria-label="Show next banner"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
              {bannerImages.map((bannerUrl, index) => (
                <button
                  key={bannerUrl}
                  type="button"
                  onClick={() => setActiveBannerIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${index === activeBannerIndex ? 'w-8 bg-[#C5A572]' : 'w-2.5 bg-white/55 hover:bg-white/80'}`}
                  aria-label={`Show banner ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-20 md:bottom-24 left-1/2 z-10 w-full max-w-4xl -translate-x-1/2 px-6 text-center">
        <h1 className="text-5xl md:text-7xl text-white mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
          {tagline}
        </h1>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/gallery">
            <Button className="bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full px-8 py-6">
              Explore Gallery
            </Button>
          </Link>
          <Link href="/contact">
            <Button className="bg-white !text-gray-900 hover:bg-white/90 rounded-full px-8 py-6 shadow-lg transition-all duration-200">
              Book Now
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
