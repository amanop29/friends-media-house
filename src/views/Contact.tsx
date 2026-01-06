"use client";
import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/ui/button';
import { FAQSection } from '../components/FAQSection';
import { getSettings, fetchSettings, DEFAULT_SETTINGS, type SiteSettings } from '../lib/settings';
import { 
  EventTypeSelect, 
  PhoneInput, 
  EmailInput, 
  ValidatedInput,
  ValidatedTextarea,
  validateEmail, 
  validatePhoneNumber 
} from '../components/FormValidation';
import { toast } from 'sonner';

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: '',
    message: '',
  });
  
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: '',
    message: '',
  });

  // Use DEFAULT_SETTINGS initially to avoid hydration mismatch
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load from localStorage first for immediate render
    setSettings(getSettings());
    // Then fetch from Supabase to get latest
    fetchSettings().then(setSettings);
    
    const handleSettingsUpdate = (event: CustomEvent) => {
      setSettings(event.detail);
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, []);

  const validateForm = () => {
    const newErrors = {
      name: '',
      email: '',
      phone: '',
      eventType: '',
      message: '',
    };
    
    let isValid = true;
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
    } else if (!validatePhoneNumber(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }
    
    if (!formData.eventType) {
      newErrors.eventType = 'Please select an event type';
      isValid = false;
    }
    
    // Message is now optional
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    const loadingToast = toast.loading('Sending your message...');

    try {
      // Call API endpoint to send emails via Resend
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          eventInterest: formData.eventType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Show success message and reset form
      toast.success('Message sent successfully! We\'ll get back to you soon.', { id: loadingToast });
      setFormData({
        name: '',
        email: '',
        phone: '',
        eventType: '',
        message: '',
      });
      setErrors({
        name: '',
        email: '',
        phone: '',
        eventType: '',
        message: '',
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message. Please try again.';
      toast.error(errorMessage, { id: loadingToast });
    }
  };

  return (
    <div className="min-h-screen md:pt-32 md:pb-24 md:px-6 lg:px-8 pt-[128px] pr-[32px] pb-[24px] pl-[32px] px-[32px] py-[48px]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 md:mb-12"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl text-[#2B2B2B] dark:text-white mb-3 md:mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Get In Touch
          </h1>
          <p className="text-[#707070] dark:text-[#A0A0A0] max-w-2xl mx-auto">
            Let's discuss how we can capture your special moments
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-full"
          >
            <GlassCard className="p-6 md:p-8">
              <h2 className="text-2xl text-[#2B2B2B] dark:text-white mb-6">Send us a message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <ValidatedInput
                  label="Full Name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(value) => setFormData({ ...formData, name: value })}
                  placeholder="Your full name"
                  error={errors.name}
                />

                <EmailInput
                  label="Email Address"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(value) => setFormData({ ...formData, email: value })}
                  error={errors.email}
                />

                <PhoneInput
                  label="Phone Number"
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  error={errors.phone}
                />

                <EventTypeSelect
                  value={formData.eventType}
                  onChange={(value) => setFormData({ ...formData, eventType: value })}
                  error={errors.eventType}
                  required
                />

                <ValidatedTextarea
                  label="Message"
                  id="message"
                  value={formData.message}
                  onChange={(value) => setFormData({ ...formData, message: value })}
                  placeholder="Tell us about your event..."
                  rows={6}
                  error={errors.message}
                />

                <Button
                  type="submit"
                  className="w-full bg-[#C5A572] hover:bg-[#B39563] text-white rounded-full py-6 gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
              </form>
            </GlassCard>
          </motion.div>

          {/* Contact Info & Map */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8 w-full"
          >
            {/* Contact Info */}
            <GlassCard className="p-6 md:p-8">
              <h2 className="text-2xl text-[#2B2B2B] dark:text-white mb-6">Contact Information</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[#2B2B2B] dark:text-white mb-1">Address</h3>
                    <p className="text-[#707070] dark:text-[#A0A0A0] whitespace-pre-line">
                      {settings.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[#2B2B2B] dark:text-white mb-1">Phone</h3>
                    <p className="text-[#707070] dark:text-[#A0A0A0]">
                      {settings.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[#2B2B2B] dark:text-white mb-1">Email</h3>
                    <p className="text-[#707070] dark:text-[#A0A0A0]">
                      {settings.email}
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 md:mt-24">
          <FAQSection />
        </div>
      </div>
    </div>
  );
}