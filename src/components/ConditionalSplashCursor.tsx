'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const SplashCursor = dynamic(() => import('@/components/SplashCursor'), {
  ssr: false,
});

export function ConditionalSplashCursor() {
  const pathname = usePathname();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (pathname !== '/') {
      setShouldRender(false);
      return;
    }

    const isDesktop = window.matchMedia('(min-width: 768px) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isDesktop || prefersReducedMotion) {
      setShouldRender(false);
      return;
    }

    const idleHandle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(() => setShouldRender(true), { timeout: 1200 })
        : window.setTimeout(() => setShouldRender(true), 450);

    return () => {
      if (typeof window.cancelIdleCallback === 'function' && typeof idleHandle === 'number') {
        window.cancelIdleCallback(idleHandle);
      } else {
        window.clearTimeout(idleHandle as number);
      }
    };
  }, [pathname]);

  if (!shouldRender) return null;

  return <SplashCursor />;
}
