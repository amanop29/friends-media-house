"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Upload, 
  FolderOpen, 
  Star, 
  Settings,
  LogOut,
  Menu,
  X,
  MessageCircle,
  HelpCircle,
  Users
} from 'lucide-react';
import { cn } from './ui/utils';
import { GlassCard } from './GlassCard';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    // Clear session from localStorage directly as backup
    localStorage.removeItem('admin_session');
    // Use window.location for redirect to avoid Router context issues
    window.location.href = '/admin/login';
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Add Event', path: '/admin/add-event', icon: PlusCircle },
    { name: 'Upload Media', path: '/admin/upload', icon: Upload },
    { name: 'Manage Galleries', path: '/admin/galleries', icon: FolderOpen },
    { name: 'Leads', path: '/admin/leads', icon: Users },
    { name: 'Comments', path: '/admin/comments', icon: MessageCircle },
    { name: 'Reviews', path: '/admin/reviews', icon: Star },
    { name: 'Team', path: '/admin/team', icon: Users },
    { name: 'FAQs', path: '/admin/faqs', icon: HelpCircle },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-lg bg-white/10 dark:bg-black/20 border-b border-white/20 dark:border-white/10 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center">
            <span className="text-white text-sm">FMH</span>
          </div>
          <span className="text-[#2B2B2B] dark:text-white">Admin</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-full text-[#2B2B2B] dark:text-white"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 h-screen sticky top-0 p-4 bg-[#FAFAFA] dark:bg-[#0F0F0F] border-r border-white/20 dark:border-white/10">
        <GlassCard className="h-full flex flex-col p-6">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center">
                <span className="text-white">FMH</span>
              </div>
              <span className="text-[#2B2B2B] dark:text-white">Admin</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-[#C5A572] text-white'
                      : 'text-[#2B2B2B] dark:text-white hover:bg-white/10 dark:hover:bg-black/20'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="space-y-2 pt-6 border-t border-white/20 dark:border-white/10">
            {user && (
              <div className="px-4 py-2 mb-2">
                <p className="text-xs text-gray-400">Logged in as</p>
                <p className="text-sm text-[#C5A572] truncate">{user.email}</p>
              </div>
            )}
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-500/10"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="lg:hidden fixed top-16 left-0 bottom-0 w-64 z-50 p-4 bg-[#FAFAFA] dark:bg-[#0F0F0F] border-r border-white/20 dark:border-white/10 overflow-y-auto">
            <GlassCard className="h-full flex flex-col p-6">
              {/* Navigation */}
              <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-[#C5A572] text-white'
                          : 'text-[#2B2B2B] dark:text-white hover:bg-white/10 dark:hover:bg-black/20'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom Actions */}
              <div className="space-y-2 pt-6 border-t border-white/20 dark:border-white/10">
                {user && (
                  <div className="px-4 py-2 mb-2">
                    <p className="text-xs text-gray-400">Logged in as</p>
                    <p className="text-sm text-[#C5A572] truncate">{user.email}</p>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </Button>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </>
  );
}