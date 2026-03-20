'use client';

import dynamic from 'next/dynamic';

const FAQSection = dynamic(
  () => import('@/components/FAQSection').then((mod) => mod.FAQSection),
  {
    ssr: false,
    loading: () => (
      <section className="md:py-24 px-[0px] py-[24px]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`faq-skeleton-${index}`}
                className="backdrop-blur-lg bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 rounded-xl overflow-hidden"
              >
                <div className="px-4 md:px-6 py-4 md:py-5">
                  <div className="h-5 w-3/4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer rounded mb-2" style={{ backgroundSize: '200% 100%' }} />
                  <div className="h-4 w-20 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer rounded" style={{ backgroundSize: '200% 100%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
  }
);

export function LazyFAQSectionClient() {
  return <FAQSection limit={6} />;
}
