'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function AdminContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  
  // Don't check auth for login page
  const isLoginPage = pathname === '/admin/login';

  // Force dark mode for admin panel
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
      }
    };
  }, []);
  
  // Redirect to login if not authenticated (only if not already on login page)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      // Use replace to avoid creating history entry
      window.location.replace('/admin/login');
    }
  }, [isAuthenticated, isLoading, isLoginPage]);

  // Show loading while checking auth
  if (isLoading && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C5A572] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Login page - no sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Not authenticated - show loading while redirecting
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C5A572] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Authenticated - show admin layout with sidebar
  return (
    <div className="flex h-screen bg-gray-950">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminContent>{children}</AdminContent>
    </AuthProvider>
  );
}
