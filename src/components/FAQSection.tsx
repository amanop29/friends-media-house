"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { FAQ } from '../lib/mock-data';
import { getFAQs } from '../lib/faqs-store';
import { Button } from './ui/button';
import { cn } from './ui/utils';

interface FAQSectionProps {
  limit?: number; // Optional: limit number of FAQs shown
}

export function FAQSection({ limit }: FAQSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>('booking');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load FAQs from API
    const loadFAQs = async () => {
      try {
        const response = await fetch('/api/faqs');
        if (response.ok) {
          const data = await response.json();
          setFaqs(Array.isArray(data) ? data : data.faqs || []);
        } else {
          // Fallback to localStorage
          setFaqs(getFAQs());
        }
      } catch (error) {
        console.error('Error loading FAQs from API:', error);
        // Fallback to localStorage
        setFaqs(getFAQs());
      }
      setMounted(true);
    };

    loadFAQs();

    // Listen for FAQs updates
    const handleFAQsUpdate = (event: CustomEvent) => {
      setFaqs(event.detail);
    };

    window.addEventListener('faqsUpdated', handleFAQsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('faqsUpdated', handleFAQsUpdate as EventListener);
    };
  }, []);

  const categories = [
    { value: 'booking', label: 'Booking' },
    { value: 'pricing', label: 'Pricing' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'general', label: 'General' },
  ];

  const filteredFAQs = faqs
    .filter((faq) => faq.category === activeCategory)
    .sort((a, b) => a.order - b.order)
    .slice(0, limit || faqs.length);

  return (
    <section className="md:py-24 px-[0px] py-[24px]">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-[#C5A572]/10 border border-[#C5A572]/20">
            <HelpCircle className="w-5 h-5 text-[#C5A572]" />
            <span className="text-[#C5A572]">FAQ</span>
          </div>
          <h2 className="text-[#2B2B2B] dark:text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Frequently Asked Questions
          </h2>
          <p className="text-[#707070] dark:text-[#A0A0A0] max-w-2xl mx-auto">
            Find answers to common questions about our services, pricing, and delivery process.
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex gap-3 md:gap-4 mb-8 md:mb-12 flex-wrap justify-center"
        >
          {categories.map((category) => {
            // Use consistent styling on server, apply active state only after mount
            const isActive = mounted && activeCategory === category.value;
            return (
              <Button
                key={category.value}
                onClick={() => {
                  setActiveCategory(category.value);
                  setExpandedId(null);
                }}
                variant={isActive ? 'default' : 'outline'}
                className={
                  isActive
                    ? '!bg-[#C5A572] hover:!bg-[#B39563] !text-white rounded-full'
                    : 'rounded-full border-[#C5A572] text-[#C5A572] hover:bg-[#C5A572] hover:text-white'
                }
              >
                {category.label}
              </Button>
            );
          })}
        </motion.div>

        {/* FAQ Items */}
        <div className="max-w-4xl mx-auto space-y-4">
          {!mounted ? (
            // Skeleton loader while mounting
            Array.from({ length: limit || 4 }).map((_, i) => (
              <div key={i} className="backdrop-blur-lg bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 md:px-6 py-4 md:py-5">
                  <div className="h-5 w-3/4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer rounded mb-2" style={{ backgroundSize: '200% 100%' }} />
                  <div className="h-4 w-20 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer rounded" style={{ backgroundSize: '200% 100%' }} />
                </div>
              </div>
            ))
          ) : filteredFAQs.map((faq, index) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <GlassCard className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full px-4 md:px-6 py-4 md:py-5 flex items-start gap-4 text-left hover:bg-white/5 dark:hover:bg-black/10 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="text-[#2B2B2B] dark:text-white mb-1 pr-8">
                      {faq.question}
                    </h3>
                    <span className="inline-block px-2 py-1 rounded-full text-xs bg-[#C5A572]/10 text-[#C5A572] capitalize">
                      {faq.category}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-[#C5A572] transition-transform flex-shrink-0 mt-1',
                      expandedId === faq.id && 'rotate-180'
                    )}
                  />
                </button>
                
                <AnimatePresence>
                  {expandedId === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 md:px-6 pb-4 md:pb-5 pt-2">
                        <p className="text-[#707070] dark:text-[#A0A0A0] leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {limit && faqs.length > limit && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mt-8"
          >
            <p className="text-[#707070] dark:text-[#A0A0A0]">
              Have more questions?{' '}
              <Link href="/contact" className="text-[#C5A572] hover:underline">
                Contact us
              </Link>
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}