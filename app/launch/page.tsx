'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { getSettings, fetchSettings, getInstagramUrl, type SiteSettings } from '@/lib/settings';
import { Instagram, Sparkles, Lock, ArrowRight, Loader2, ArrowLeftRight } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import ShinyText from '@/components/ShinyText';
import BlurText from '@/components/BlurText';

const Silk = dynamic(() => import('@/components/Silk'), { ssr: false });

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function LaunchPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSettings>(getSettings());
  const [activeLogoIndex, setActiveLogoIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwInput.trim()) return;
    setPwLoading(true);
    setPwError('');
    try {
      const res = await fetch('/api/launch-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwInput }),
      });
      if (res.ok) {
        router.push('/');
      } else {
        const data = await res.json();
        setPwError(data.error || 'Incorrect password');
      }
    } catch {
      setPwError('Something went wrong. Please try again.');
    } finally {
      setPwLoading(false);
    }
  };

  // Launch date: 19 March 2026 at 12:00 PM IST (UTC+5:30)
  const launchDate = new Date('2026-03-19T06:30:00Z');

  useEffect(() => {
    setMounted(true);
    fetchSettings().then(setSettings);

    const handleSettingsUpdate = (event: CustomEvent<SiteSettings>) => {
      setSettings(event.detail);
    };

    const calculateTimeLeft = (): TimeLeft => {
      const now = new Date().getTime();
      const target = launchDate.getTime();
      const difference = target - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, []);

  const logos = [settings.logoUrl, settings.secondLogoUrl].filter(
    (logoUrl): logoUrl is string => Boolean(logoUrl)
  );

  useEffect(() => {
    setActiveLogoIndex(0);

    if (logos.length < 2) return;

    const intervalId = window.setInterval(() => {
      setActiveLogoIndex((prev) => (prev + 1) % logos.length);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [logos.length]);

  const activeLogo = logos[activeLogoIndex] || '';
  const canSwitchLogos = logos.length > 1;

  const handleManualLogoSwitch = () => {
    if (!canSwitchLogos) return;
    setActiveLogoIndex((prev) => (prev + 1) % logos.length);
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#060608]">
      
      {/* Silk Shader Background */}
      <div className="absolute inset-0 opacity-60">
        {mounted && (
          <Silk
            speed={3}
            scale={1.5}
            color="#8B7340"
            noiseIntensity={1.2}
            rotation={0.2}
          />
        )}
      </div>

      {/* Subtle Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(6,6,8,0.8)_100%)]" />

      {/* Content Layer */}
      <div className="relative z-10 h-screen p-2 sm:p-3 flex flex-col">
        <div className="flex-1 flex flex-col w-full max-w-[1400px] mx-auto">
          
          {/* Bento Layout: Image Left + Content Right */}
          <div className="grid lg:grid-cols-2 gap-3 animate-fade-in-up flex-1 h-full">
            
            {/* Left — Glass Box with Centered Logo */}
            <SpotlightCard className="relative h-full min-h-[420px] rounded-[20px] overflow-hidden flex items-center justify-center bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]">

              {/* Top-left shine streak */}
              <div className="absolute top-0 left-0 w-[70%] h-[1px] bg-gradient-to-r from-white/40 via-white/10 to-transparent" />
              <div className="absolute top-0 left-0 w-[1px] h-[60%] bg-gradient-to-b from-white/30 via-white/10 to-transparent" />

              {/* Logo — Centered & Large */}
              {mounted && activeLogo && (
                <div className="relative flex items-center justify-center w-full h-full">
                  {/* Ambient glow behind logo */}
                  <div className="absolute w-80 h-80 rounded-full bg-[#C5A572]/20 blur-[90px]" />
                  <motion.div
                    className="absolute w-56 h-56 rounded-full bg-[#C5A572]/30 blur-[50px]"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {/* Logo */}
                  <div className="relative z-10 flex items-center gap-2">
                    <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
                      <AnimatePresence initial={false} mode="sync">
                        <motion.div
                          key={activeLogo}
                          className="absolute inset-0"
                          initial={{ opacity: 0, scale: 0.82, filter: 'blur(3px)' }}
                          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, scale: 1.02, filter: 'blur(3px)' }}
                          transition={{ duration: 0.85, ease: [0.25, 0.4, 0.25, 1] }}
                        >
                          <Image
                            src={activeLogo}
                            alt={settings.siteName}
                            fill
                            className="object-contain drop-shadow-[0_0_60px_rgba(197,165,114,0.9)]"
                            priority
                          />
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {canSwitchLogos && (
                      <button
                        type="button"
                        onClick={handleManualLogoSwitch}
                        className="absolute bottom-8 right-8 z-20 flex h-6 w-6 items-center justify-center rounded-sm text-white/35 transition-colors hover:text-[#C5A572]"
                        title="Swap logo"
                        aria-label="Swap logo"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </SpotlightCard>

            {/* Right — Content Box */}
            <SpotlightCard className="relative h-full min-h-[420px] flex flex-col justify-between rounded-[20px] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] p-6 sm:p-8 lg:p-12">
              
              {/* Top */}
              <div>
                <motion.p
                  className="text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-6 sm:mb-8"
                  style={{ fontFamily: 'var(--font-playfair), serif' }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                >
                  <ShinyText text={settings.tagline} speed={6} />
                </motion.p>

                <motion.h1
                  className="text-[clamp(2.2rem,6vw,4.5rem)] font-light text-white leading-[0.95] tracking-wide mb-6 sm:mb-8"
                  style={{ fontFamily: 'var(--font-playfair), serif' }}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.25 }}
                >
                  <BlurText text="Launching" delay={0.1} />{' '}
                  <span className="font-semibold italic text-transparent bg-clip-text bg-gradient-to-r from-[#C5A572] via-[#E8D5B5] to-[#C5A572]">
                    Soon..
                  </span>
                  {/* <Sparkles className="inline-block ml-2 w-5 h-5 sm:w-6 sm:h-6 text-[#C5A572]/50 align-middle animate-pulse" style={{ animationDuration: '2.5s' }} /> */}
                </motion.h1>

                {/* Countdown + Instagram */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.42 }}
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-5">
                    {[
                      { value: timeLeft.days, label: 'Days' },
                      { value: timeLeft.hours, label: 'Hrs' },
                      { value: timeLeft.minutes, label: 'Min' },
                      { value: timeLeft.seconds, label: 'Sec' },
                    ].map((unit, i) => (
                      <div key={unit.label} className="flex items-center gap-1.5 sm:gap-2">
                        {i > 0 && (
                          <span className="text-[#C5A572]/20 text-lg sm:text-xl font-extralight select-none">:</span>
                        )}
                        <div className="flex flex-col items-center min-w-[44px] sm:min-w-[56px]">
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={unit.value}
                              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-white tabular-nums tracking-tight leading-none block"
                              style={{ fontFamily: 'var(--font-playfair), serif' }}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                            >
                              {pad(unit.value)}
                            </motion.span>
                          </AnimatePresence>
                          <span className="text-[9px] sm:text-[10px] text-[#C5A572]/30 font-medium tracking-widest uppercase mt-1.5" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                            {unit.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Launch Date */}
                  <motion.p
                    className="text-[11px] sm:text-[12px] text-white/20 tracking-[0.2em] uppercase mb-5"
                    style={{ fontFamily: 'var(--font-playfair), serif' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.55 }}
                  >
                    <span className="text-[#C5A572]/40">✦</span>{' '}
                    19 March 2026{' '}
                    <span className="text-[#C5A572]/40">✦</span>
                  </motion.p>

                  {/* Instagram — right below countdown */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.65 }}
                  >
                    <Link
                      href={getInstagramUrl(settings.instagram)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-white/25 hover:text-[#C5A572] transition-colors duration-500"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                      <span className="text-[11px] tracking-[0.15em]" style={{ fontFamily: 'var(--font-playfair), serif' }}>{settings.instagram}</span>
                    </Link>
                  </motion.div>

                  {/* Enter Website via Password */}
                  <motion.div
                    className="mt-8 pt-6 border-t border-white/[0.06]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                  >
                    {!showPwForm ? (
                      <button
                        onClick={() => setShowPwForm(true)}
                        className="flex items-center gap-2 text-white/20 hover:text-[#C5A572]/60 transition-colors duration-300 text-[11px] tracking-[0.15em] uppercase"
                        style={{ fontFamily: 'var(--font-playfair), serif' }}
                      >
                        <Lock className="w-3 h-3" />
                        Enter Website
                      </button>
                    ) : (
                      <AnimatePresence>
                        <motion.form
                          onSubmit={handlePasswordSubmit}
                          className="flex flex-col gap-3"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <p className="text-[10px] text-white/25 tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--font-playfair), serif' }}>Enter Password to Access Site</p>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={pwInput}
                              onChange={(e) => { setPwInput(e.target.value); setPwError(''); }}
                              placeholder="Password"
                              autoFocus
                              className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C5A572]/50 transition-colors"
                              style={{ fontFamily: 'var(--font-playfair), serif' }}
                            />
                            <button
                              type="submit"
                              disabled={pwLoading || !pwInput.trim()}
                              className="px-4 py-2.5 rounded-lg bg-[#C5A572]/20 hover:bg-[#C5A572]/30 border border-[#C5A572]/30 text-[#C5A572] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            </button>
                          </div>
                          {pwError && (
                            <p className="text-red-400/70 text-[10px] tracking-wide">{pwError}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => { setShowPwForm(false); setPwError(''); setPwInput(''); }}
                            className="text-white/15 hover:text-white/30 text-[10px] tracking-widest uppercase transition-colors text-left"
                          >
                            Cancel
                          </button>
                        </motion.form>
                      </AnimatePresence>
                    )}
                  </motion.div>
                </motion.div>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </div>
    </div>
  );
}
