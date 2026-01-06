'use client';

import { useEffect } from 'react';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Force dark mode for login page
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
      }
    };
  }, []);

  // Login page has its own full-screen layout, no sidebar
  return <>{children}</>;
}
