"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
  ArrowUp,
  ExternalLink,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { toast } from "sonner";
import { getSettings, getInstagramUrl, getYouTubeUrl, type SiteSettings } from "../lib/settings";

// Flip Card Component for Contact Info
function ContactFlipCard({
  icon: Icon,
  frontText,
  backText,
  actionLabel,
  onAction,
}: {
  icon: React.ElementType;
  frontText: string;
  backText: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      className="relative h-20 cursor-pointer perspective-1000"
      onHoverStart={() => setIsFlipped(true)}
      onHoverEnd={() => setIsFlipped(false)}
      style={{ perspective: "1000px" }}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front of card */}
        <div
          className="absolute inset-0 backdrop-blur-lg bg-[#2B2B2B]/5 dark:bg-black/20 border border-[#2B2B2B]/20 dark:border-white/10 rounded-lg p-3 flex items-center gap-3"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <span className="text-[#707070] dark:text-[#A0A0A0] text-xs md:text-sm truncate overflow-hidden flex-1 min-w-0">
            {frontText}
          </span>
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0 backdrop-blur-lg bg-[#C5A572]/20 dark:bg-[#C5A572]/10 border border-[#C5A572]/50 rounded-lg p-3"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex flex-col h-full justify-between">
            <span className="text-[#2B2B2B] dark:text-white text-xs md:text-sm break-words">
              {backText}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              className="flex items-center gap-2 text-[#C5A572] text-xs md:text-sm mt-2"
            >
              <Copy className="w-3 h-3 md:w-4 md:h-4" />
              {actionLabel}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Footer() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load settings only on client side to avoid hydration mismatch
    setSettings(getSettings());
    setMounted(true);

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    const handleSettingsUpdate = (event: CustomEvent) => {
      setSettings(event.detail);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("settingsUpdated", handleSettingsUpdate as EventListener);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("settingsUpdated", handleSettingsUpdate as EventListener);
    };
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCopyPhone = () => {
    if (!settings) return;
    navigator.clipboard.writeText(settings.phone);
    toast.success("Phone number copied to clipboard!");
  };

  const handleCopyEmail = () => {
    if (!settings) return;
    navigator.clipboard.writeText(settings.email);
    toast.success("Email copied to clipboard!");
  };

  const handleCopyAddress = () => {
    if (!settings) return;
    navigator.clipboard.writeText(settings.address);
    toast.success("Address copied to clipboard!");
  };

  // Show loading state until mounted
  if (!mounted || !settings) {
    return (
      <footer className="bg-[#FAFAFA] dark:bg-[#0F0F0F] border-t border-[#E5E5E5] dark:border-[#2B2B2B] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center text-[#707070] dark:text-[#A0A0A0]">
            Loading...
          </div>
        </div>
      </footer>
    );
  }

  const socialLinks = [
    {
      icon: Instagram,
      href: getInstagramUrl(settings.instagram),
      label: "Instagram",
      gradient: "from-purple-500 via-pink-500 to-orange-500",
      hoverColor: "group-hover:text-pink-500",
    },
    {
      icon: Youtube,
      href: getYouTubeUrl(settings.youtube),
      label: "YouTube",
      gradient: "from-red-500 to-red-600",
      hoverColor: "group-hover:text-red-500",
    },
    {
      icon: Mail,
      href: `mailto:${settings.email}`,
      label: "Email",
      gradient: "from-blue-500 to-blue-600",
      hoverColor: "group-hover:text-blue-500",
    },
  ];

  return (
    <footer className="relative mt-8 py-12 px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#C5A572]/10 to-[#C5A572]/20 dark:via-[#C5A572]/5 dark:to-[#C5A572]/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#C5A572]/5 to-[#C5A572]/30 dark:via-[#C5A572]/10 dark:to-[#C5A572]/25" />

      <div className="relative max-w-7xl mx-auto">
        <GlassCard className="p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_0.9fr_0.9fr_1.5fr] gap-12">
            {/* Brand */}
            <div>
              <Link href="/" className="flex items-center gap-3 mb-4 group">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center"
                >
                  <span className="text-white">FMH</span>
                </motion.div>
                <span className="text-[#2B2B2B] dark:text-white group-hover:text-[#C5A572] transition-colors">
                  {settings.siteName}
                </span>
              </Link>
              <p className="text-[#707070] dark:text-[#A0A0A0] mb-6">
                {settings.tagline}
              </p>

              {/* Floating Social Media Icons with Glow */}
              <div className="flex gap-4">
                {socialLinks.map((social, index) => {
                  const Icon = social.icon;
                  return (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      {/* Floating animation */}
                      <motion.div
                        animate={{
                          y: [0, -8, 0],
                        }}
                        transition={{
                          duration: 2 + index * 0.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        {/* Glow effect on hover */}
                        <motion.div
                          className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{
                            background: `linear-gradient(to bottom right, ${social.gradient})`,
                          }}
                        />

                        {/* Icon container */}
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 5 }}
                          whileTap={{ scale: 0.9 }}
                          className="relative w-12 h-12 rounded-full backdrop-blur-lg bg-[#2B2B2B]/10 dark:bg-black/20 border border-[#2B2B2B]/20 dark:border-white/20 flex items-center justify-center group-hover:border-[#C5A572] transition-all duration-300"
                        >
                          <Icon
                            className={`w-5 h-5 text-[#2B2B2B] dark:text-white transition-colors duration-300 ${social.hoverColor}`}
                          />
                        </motion.div>
                      </motion.div>
                    </motion.a>
                  );
                })}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-[#2B2B2B] dark:text-white mb-4">
                Quick Links
              </h3>
              <ul className="space-y-2">
                {[
                  { to: "/", label: "Home" },
                  { to: "/gallery", label: "Gallery" },
                  { to: "/about", label: "About Us" },
                  { to: "/reviews", label: "Reviews" },
                  { to: "/contact", label: "Contact" },
                ].map((link) => (
                  <li key={link.to}>
                    <Link
                      href={link.to}
                      className="text-[#707070] dark:text-[#A0A0A0] hover:text-[#C5A572] transition-colors inline-flex items-center gap-2 group"
                    >
                      <motion.span
                        whileHover={{ x: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        {link.label}
                      </motion.span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-[#2B2B2B] dark:text-white mb-4">Services</h3>
              <ul className="space-y-2 text-[#707070] dark:text-[#A0A0A0]">
                {[
                  "Wedding Photography",
                  "Pre-Wedding Shoots",
                  "Event Coverage",
                  "Cinematic Films",
                ].map((service, index) => (
                  <motion.li
                    key={service}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    {service}
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Interactive Contact Cards */}
            <div>
              <h3 className="text-[#2B2B2B] dark:text-white mb-4">Contact</h3>
              <div className="space-y-2">
                <ContactFlipCard
                  icon={MapPin}
                  frontText={settings.address.split(',').slice(0, 2).join(',')}
                  backText="Click to copy address"
                  actionLabel="Copy Address"
                  onAction={handleCopyAddress}
                />
                <ContactFlipCard
                  icon={Phone}
                  frontText={settings.phone}
                  backText="Click to copy phone number"
                  actionLabel="Copy Number"
                  onAction={handleCopyPhone}
                />
                <ContactFlipCard
                  icon={Mail}
                  frontText={settings.email}
                  backText="Click to copy email"
                  actionLabel="Copy Email"
                  onAction={handleCopyEmail}
                />
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-[#2B2B2B]/20 dark:border-white/10 text-center text-[#707070] dark:text-[#A0A0A0]">
            <p>&copy; 2026 {settings.siteName}. All rights reserved.</p>
          </div>
        </GlassCard>
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
            onClick={handleScrollToTop}
            className="fixed bottom-24 right-8 z-40 group"
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.9 }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-[#C5A572] blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300" />

            {/* Button */}
            <div className="relative w-14 h-14 rounded-full backdrop-blur-lg bg-[#C5A572] border-2 border-white/30 shadow-lg flex items-center justify-center text-white">
              <motion.div
                animate={{
                  y: [0, -4, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <ArrowUp className="w-6 h-6" />
              </motion.div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </footer>
  );
}