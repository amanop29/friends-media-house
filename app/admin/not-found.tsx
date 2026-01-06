"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/GlassCard';

export default function AdminNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0A0A0A]">
      <div className="relative z-10 w-full max-w-xl">
        <GlassCard className="p-8 md:p-12 text-center bg-gray-900/50 backdrop-blur-xl border-gray-800">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-block mb-6"
          >
            <div className="relative">
              <Shield className="w-20 h-20 text-[#C5A572] mx-auto" />
              <AlertCircle className="w-8 h-8 text-red-500 absolute -top-1 -right-1" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-[#C5A572]">
              404
            </h1>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              Admin Page Not Found
            </h2>
            <p className="text-gray-400 mb-8">
              This admin page doesn't exist or you don't have permission to access it.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/admin">
              <Button 
                size="lg"
                className="bg-[#C5A572] hover:bg-[#D4AF37] text-white"
              >
                <Home className="w-5 h-5 mr-2" />
                Admin Dashboard
              </Button>
            </Link>
          </motion.div>
        </GlassCard>
      </div>
    </div>
  );
}
