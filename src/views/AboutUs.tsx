"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Film, Heart, Award, Users, Sparkles, Eye, Clock, CheckCircle } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export function AboutUs() {
  const [activeValue, setActiveValue] = useState(0);

  const values = [
    {
      icon: Heart,
      title: 'Passion',
      description: 'We pour our heart into every frame, treating each event as our own celebration.',
      color: 'from-red-500 to-pink-600',
    },
    {
      icon: Award,
      title: 'Excellence',
      description: 'Commitment to delivering premium quality that exceeds expectations every time.',
      color: 'from-yellow-500 to-orange-600',
    },
    {
      icon: Users,
      title: 'Connection',
      description: 'Building lasting relationships with our clients through trust and understanding.',
      color: 'from-blue-500 to-purple-600',
    },
    {
      icon: Sparkles,
      title: 'Innovation',
      description: 'Using cutting-edge AI technology and creative techniques to capture magic.',
      color: 'from-green-500 to-teal-600',
    },
  ];

  const stats = [
    { number: '500+', label: 'Events Covered', icon: Camera },
    { number: '10K+', label: 'Happy Clients', icon: Heart },
    { number: '50K+', label: 'Photos Delivered', icon: Film },
    { number: '8+', label: 'Years Experience', icon: Award },
  ];

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  React.useEffect(() => {
    const loadTeam = async () => {
      try {
        const response = await fetch('/api/team');
        if (!response.ok) {
          throw new Error(`Failed to fetch team: ${response.status}`);
        }
        const data = await response.json();
        const members = Array.isArray(data?.team) ? data.team : (Array.isArray(data) ? data : []);
        
        // Normalize shape for view and filter active members only
        const normalized = (members || [])
          .filter((m: any) => m.isActive !== false)
          .slice()
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
          .map((m: any) => ({
            name: m.name,
            role: m.role,
            image: m.photoUrl,
            specialty: m.specialty || '',
          }));
        setTeamMembers(normalized);
      } catch (err) {
        console.error('Failed to load team members:', err);
        setTeamMembers([]);
      } finally {
        setLoadingTeam(false);
      }
    };
    loadTeam();
  }, []);

  const timeline = [
    {
      year: '2016',
      title: 'The Beginning',
      description: 'Founded with a vision to revolutionize wedding photography in India.',
    },
    {
      year: '2018',
      title: 'Expansion',
      description: 'Grew our team and expanded services to cover all major cities.',
    },
    {
      year: '2021',
      title: 'AI Integration',
      description: 'Pioneered AI-powered face recognition for seamless photo delivery.',
    },
    {
      year: '2024',
      title: 'Industry Leaders',
      description: 'Recognized as one of India\'s top wedding media production houses.',
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden -mt-20 pt-20">
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1762644085617-39aa30dd9c52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwaG90b2dyYXBoeSUyMHRlYW18ZW58MXx8fHwxNzYyOTM1OTg2fDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="About Us Hero"
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay - fades from dark at top to page background at bottom */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 60%, var(--hero-fade-color) 100%)'
            }}
          />
          {/* Bottom edge blend */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background: 'linear-gradient(to top, var(--hero-fade-color) 0%, transparent 100%)'
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-6 max-w-4xl"
        >
          <h1 className="text-5xl md:text-6xl text-white mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
            Our Story
          </h1>
          <p className="text-xl text-white/90">
            Crafting Visual Memories with Passion, Excellence, and Innovation
          </p>
        </motion.div>
      </section>

      {/* Stats Section with Animation */}
      <section className="py-16 px-6 lg:px-8 -mt-16 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <GlassCard className="p-6 text-center h-full backdrop-blur-xl bg-white/20 dark:bg-black/30">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center"
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </motion.div>
                    <h3 className="text-3xl text-[#C5A572] mb-2">{stat.number}</h3>
                    <p className="text-[#707070] dark:text-[#A0A0A0]">{stat.label}</p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Content */}
      <section className="py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-4xl text-gray-900 dark:text-white mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                About Friends Media House
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Founded in 2016, Friends Media House has been at the forefront of wedding and event photography in India. We believe that every celebration tells a unique story, and our mission is to capture those precious moments with artistry, authenticity, and innovation.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Our team of passionate photographers and cinematographers combines years of experience with cutting-edge technology, including AI-powered face recognition, to deliver an unparalleled photography experience. We don't just take pictures; we create timeless memories that you'll cherish for generations.
              </p>
              <div className="space-y-3">
                {['Premium Quality Assured', 'AI-Powered Face Recognition', 'Same-Day Preview Available', 'Lifetime Cloud Storage'].map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-[#C5A572]" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative"
            >
              <div className="relative h-[500px] rounded-2xl overflow-hidden">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1588419344934-13f50aa8fc5f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYW1lcmElMjBlcXVpcG1lbnQlMjBzdHVkaW98ZW58MXx8fHwxNzYyODY2Mzg0fDA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Our Studio"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
              
              {/* Floating Elements */}
              <motion.div
                animate={{
                  y: [0, -20, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center shadow-2xl"
              >
                <Camera className="w-12 h-12 text-white" />
              </motion.div>

              <motion.div
                animate={{
                  y: [0, 20, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center shadow-2xl"
              >
                <Heart className="w-10 h-10 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team Section (moved up to stay visible right after About content) */}
      <section className="py-24 px-6 lg:px-8 bg-[#FAFAFA] dark:bg-[#0F0F0F]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Meet Our Team
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              The talented people behind the lens
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {(loadingTeam ? Array.from({ length: 4 }).map((_, i) => ({ skeleton: true, i })) : teamMembers).map((member: any, index: number) => (
              <motion.div
                key={member.skeleton ? `skeleton-${index}` : member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <GlassCard hover className="overflow-hidden group">
                  <div className="relative h-80 overflow-hidden">
                    {member.skeleton ? (
                      <div className="w-full h-full bg-black/10 dark:bg-white/10 animate-pulse" />
                    ) : (
                      <>
                        <ImageWithFallback
                          src={member.image}
                          alt={member.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end p-6">
                          <h3 className="text-white mb-1">{member.name}</h3>
                          <p className="text-[#C5A572] text-sm mb-1">{member.role}</p>
                          {member.specialty && (
                            <p className="text-white/70 text-sm">{member.specialty}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Values Section */}
      <section className="py-24 px-6 lg:px-8 bg-[#FAFAFA] dark:bg-[#0F0F0F]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Our Core Values
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon;
              const isActive = activeValue === index;
              
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  onHoverStart={() => setActiveValue(index)}
                >
                  <GlassCard
                    className={`p-8 text-center h-full cursor-pointer transition-all duration-300 ${
                      isActive ? 'scale-105 shadow-2xl' : ''
                    }`}
                  >
                    <motion.div
                      animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.5 }}
                      className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center"
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-gray-900 dark:text-white mb-3">{value.title}</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      {value.description}
                    </p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-24 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-gray-900 dark:text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Our Journey
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Milestones that shaped our story
            </p>
          </div>

          <div className="relative">
            {/* Timeline Line - Desktop: Center vertical, Mobile: Left vertical */}
            <div className="absolute left-6 lg:left-1/2 lg:transform lg:-translate-x-1/2 w-1 h-full bg-gradient-to-b from-[#C5A572] to-transparent" />

            <div className="space-y-12">
              {timeline.map((item, index) => (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className={`flex items-center gap-8 ${
                    index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                  } flex-row`}
                >
                  {/* Timeline Dot - Positioned on the left for mobile, center for desktop */}
                  <div className="relative flex-shrink-0 order-first lg:order-none">
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center shadow-lg z-10 relative"
                    >
                      <Clock className="w-6 h-6 text-white" />
                    </motion.div>
                  </div>

                  <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'} text-left`}>
                    <GlassCard className="p-6">
                      <h3 className="text-2xl text-[#C5A572] mb-2">{item.year}</h3>
                      <h4 className="text-gray-900 dark:text-white mb-2">{item.title}</h4>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">
                        {item.description}
                      </p>
                    </GlassCard>
                  </div>

                  <div className="flex-1 hidden lg:block" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-24 px-6 lg:px-8 pt-[96px] pr-[32px] pb-[48px] pl-[32px]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative h-[400px] rounded-2xl overflow-hidden"
            >
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1737756512868-c9bba3afba1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwdmlkZW9ncmFwaHl8ZW58MXx8fHwxNzYyODg3MjE4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="AI Technology"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              
              {/* Animated Scanning Effect */}
              <motion.div
                animate={{
                  y: [0, 400, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#C5A572] to-transparent opacity-70"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl text-gray-900 dark:text-white mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                AI-Powered Innovation
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                We've integrated cutting-edge AI face recognition technology into our workflow, making it effortless for you to find your photos among thousands of images.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-8">
                Simply scan your face, and our system instantly identifies all photos featuring you. No more endless scrolling – just your memories, delivered instantly.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: Eye, text: 'Advanced Face Detection' },
                  { icon: Sparkles, text: 'Instant Photo Retrieval' },
                  { icon: Clock, text: 'Same-Day Delivery' },
                ].map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={feature.text}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C5A572] to-[#8B7355] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">{feature.text}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
