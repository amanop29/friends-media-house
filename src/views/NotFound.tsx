"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from "framer-motion";
import { Home, Search, Image } from 'lucide-react';
import { Button } from '../components/ui/button';
import { GlassCard } from '../components/GlassCard';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-24">
      <div className="max-w-2xl w-full text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* 404 Large Number */}
          <div className="mb-8">
            <h1 
              className="text-[150px] md:text-[200px] leading-none text-[#C5A572] opacity-20"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              404
            </h1>
          </div>

          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-6 -mt-16"
          >
            <div className="w-24 h-24 mx-auto rounded-full bg-white/10 dark:bg-white/5 flex items-center justify-center">
              <Search className="w-12 h-12 text-[#C5A572]" />
            </div>
          </motion.div>

          {/* Title and Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h2 className="text-4xl md:text-5xl text-[#2B2B2B] dark:text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Page Not Found
            </h2>
            <p className="text-lg text-[#707070] dark:text-[#A0A0A0] mb-8 max-w-md mx-auto">
              Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <Link href="/">
              <Button className="!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full px-8 w-full sm:w-auto">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Link href="/gallery">
              <Button 
                variant="outline" 
                className="rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white px-8 w-full sm:w-auto"
              >
                <Image className="w-4 h-4 mr-2" />
                Browse Gallery
              </Button>
            </Link>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <GlassCard className="p-6">
              <p className="text-[#707070] dark:text-[#A0A0A0] mb-4">
                Here are some helpful links instead:
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/about" className="text-[#C5A572] hover:underline">
                  About Us
                </Link>
                <Link href="/reviews" className="text-[#C5A572] hover:underline">
                  Reviews
                </Link>
                <Link href="/contact" className="text-[#C5A572] hover:underline">
                  Contact
                </Link>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
