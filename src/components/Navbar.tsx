"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { getSettings, fetchSettings, type SiteSettings } from '../lib/settings';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [logo, setLogo] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load settings from localStorage first for immediate render
    const localSettings = getSettings();
    setSettings(localSettings);
    
    // Set logo from local settings first
    if (localSettings.logoUrl) {
      setLogo(localSettings.logoUrl);
    }
    
    // Then fetch from Supabase to get latest
    fetchSettings().then(supabaseSettings => {
      setSettings(supabaseSettings);
      // Update logo from Supabase settings
      if (supabaseSettings.logoUrl) {
        setLogo(supabaseSettings.logoUrl);
      }
    });
    setMounted(true);

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    const handleSettingsUpdate = (event: CustomEvent) => {
      setSettings(event.detail);
      // Also update logo when settings are updated
      if (event.detail.logoUrl) {
        setLogo(event.detail.logoUrl);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, []);

  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) return null;

  // Avoid rendering until mounted to prevent hydration mismatch
  if (!mounted || !settings) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 md:px-4 md:mt-4">
          <div className="h-20 mt-4 mx-1 px-3 rounded-full backdrop-blur-lg bg-white/50 dark:bg-black/20" />
        </div>
      </nav>
    );
  }

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Gallery', path: '/gallery' },
    { name: 'About Us', path: '/about' },
    { name: 'Reviews', path: '/reviews' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-transparent"
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-6 md:px-4 md:mt-4">
        <div className="flex items-center justify-between h-20 mt-4 mx-1 px-3 rounded-full backdrop-blur-lg bg-white/50 dark:bg-black/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/20 dark:border-white/10 md:mt-0 md:mx-0 md:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center shadow-lg overflow-hidden"
            >
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <span className="text-white text-sm font-bold">FMH</span>
              )}
            </motion.div>
            <span className="text-gray-900 dark:text-white tracking-wide font-medium group-hover:text-[#C5A572] transition-colors duration-200">
              {settings.siteName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className="relative group"
              >
                <span
                  className={cn(
                    'text-gray-900 dark:text-white transition-colors duration-200 font-medium',
                    pathname === link.path
                      ? 'text-[#C5A572]'
                      : 'group-hover:text-[#C5A572]'
                  )}
                >
                  {link.name}
                </span>
                <motion.div
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#C5A572]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: pathname === link.path ? 1 : 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.2 }}
                />
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full text-gray-900 dark:text-white hover:bg-white/20 dark:hover:bg-white/10 border border-[#C5A572]/60 dark:border-white/40 shadow-[0_0_12px_rgba(197,165,114,0.3)] text-[6px]"
              >
                <AnimatePresence mode="wait">
                  {theme === 'light' ? (
                    <motion.div
                      key="moon"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sun"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>

            <Link href="/contact" className="hidden md:block">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full px-6 py-2 h-auto shadow-[0_4px_14px_rgba(197,165,114,0.4)] hover:shadow-[0_6px_20px_rgba(197,165,114,0.6)] transition-all duration-200 border-2 border-white/30">
                  Book Now
                </Button>
              </motion.div>
            </Link>

            {/* Mobile Menu Button */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full text-gray-900 dark:text-white hover:bg-white/20 dark:hover:bg-white/10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <AnimatePresence mode="wait">
                  {mobileMenuOpen ? (
                    <motion.div
                      key="x"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="h-6 w-6" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="h-6 w-6" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-6 px-4 mx-4 my-2 backdrop-blur-lg bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl">
                <div className="flex flex-col gap-2">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link
                        href={link.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'block px-4 py-3 rounded-2xl font-medium transition-all duration-200',
                          pathname === link.path
                            ? 'bg-[#C5A572] text-white shadow-lg'
                            : 'text-gray-900 dark:text-white hover:bg-white/20 dark:hover:bg-white/10'
                        )}
                      >
                        {link.name}
                      </Link>
                    </motion.div>
                  ))}
                  
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3, delay: navLinks.length * 0.05 }}
                    className="h-px bg-white/20 dark:bg-white/10 my-2 origin-left"
                  />
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: navLinks.length * 0.05 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-2xl w-full py-3 h-auto shadow-[0_4px_14px_rgba(197,165,114,0.4)] hover:shadow-[0_6px_20px_rgba(197,165,114,0.6)] transition-all duration-200 border-2 border-white/30">
                        Book Now
                      </Button>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}