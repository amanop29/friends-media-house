"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, Camera, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/GlassCard';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-[#F5F5F5] to-[#E8E8E8] dark:from-[#0A0A0A] dark:via-[#1A1A1A] dark:to-[#0F0F0F]" />
      
      {/* Floating Elements */}
      <motion.div
        className="absolute top-20 left-20 w-32 h-32 bg-[#C5A572]/10 dark:bg-[#C5A572]/5 rounded-full blur-3xl"
        animate={{
          y: [0, 30, 0],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-40 h-40 bg-[#C5A572]/10 dark:bg-[#C5A572]/5 rounded-full blur-3xl"
        animate={{
          y: [0, -40, 0],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-2xl">
        <GlassCard className="p-8 md:p-12 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="inline-block mb-6"
          >
            <div className="relative">
              <FileQuestion className="w-24 h-24 text-[#C5A572] mx-auto" />
              <motion.div
                className="absolute inset-0 bg-[#C5A572]/20 rounded-full blur-2xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-4 bg-gradient-to-r from-[#C5A572] via-[#D4AF37] to-[#C5A572] bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-black dark:text-white mb-4">
              Page Not Found
            </h2>
            <p className="text-gray-800 dark:text-gray-300 mb-8 text-lg">
              Oops! The page you're looking for seems to have wandered off. 
              <br />
              Let's get you back on track.
            </p>
          </motion.div>

          {/* Animated Icon Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center gap-4 mb-8"
          >
            {[Camera, Search, FileQuestion].map((Icon, index) => (
              <motion.div
                key={index}
                initial={{ y: 0 }}
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.3,
                }}
                className="w-12 h-12 rounded-full bg-[#C5A572]/10 dark:bg-[#C5A572]/20 flex items-center justify-center"
              >
                <Icon className="w-6 h-6 text-[#C5A572]" />
              </motion.div>
            ))}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/">
              <Button 
                size="lg"
                className="group bg-gradient-to-r from-[#C5A572] to-[#8B7355] hover:from-[#D4AF37] hover:to-[#C5A572] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Home className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Back to Home
              </Button>
            </Link>
            
            <Link href="/gallery">
              <Button 
                size="lg"
                variant="outline"
                className="group border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white transition-all duration-300"
              >
                <Camera className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                View Gallery
              </Button>
            </Link>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"
          >
            <p className="text-sm text-gray-700 dark:text-gray-400 mb-3">
              Popular pages:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { href: '/about', label: 'About Us' },
                { href: '/contact', label: 'Contact' },
                { href: '/reviews', label: 'Reviews' },
              ].map((link, index) => (
                <Link key={index} href={link.href}>
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block px-4 py-2 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-black dark:text-white hover:bg-[#C5A572] hover:text-white transition-colors cursor-pointer"
                  >
                    {link.label}
                  </motion.span>
                </Link>
              ))}
            </div>
          </motion.div>
        </GlassCard>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 text-center"
        >
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-gray-800 dark:text-gray-300 hover:text-[#C5A572] dark:hover:text-[#C5A572] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Go back to previous page</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
