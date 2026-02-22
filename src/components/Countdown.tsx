'use client';

import { useEffect, useState } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownProps {
  targetDate: Date;
  onComplete?: () => void;
}

interface FlipCardProps {
  value: number;
  label: string;
}

function FlipCard({ value, label }: FlipCardProps) {
  const [previousValue, setPreviousValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (value !== previousValue) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setPreviousValue(value);
        setIsFlipping(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, previousValue]);

  const formattedValue = value.toString().padStart(2, '0');
  const formattedPreviousValue = previousValue.toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-24 sm:w-24 sm:h-28 md:w-28 md:h-32 perspective-1000">
        {/* Background card */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-sm border border-[#C5A572]/30 shadow-2xl" />
        
        {/* Top half - previous value */}
        <div className="absolute inset-0 flex items-start justify-center pt-4 overflow-hidden rounded-t-xl">
          <div
            className={`text-4xl sm:text-5xl md:text-6xl font-bold text-[#C5A572] transition-all duration-300 ${
              isFlipping ? 'animate-flip-top' : ''
            }`}
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {isFlipping ? formattedPreviousValue : formattedValue}
          </div>
        </div>

        {/* Bottom half - current value */}
        <div className="absolute inset-0 flex items-end justify-center pb-4 overflow-hidden rounded-b-xl">
          <div
            className={`text-4xl sm:text-5xl md:text-6xl font-bold text-[#C5A572]/90 transition-all duration-300 ${
              isFlipping ? 'animate-flip-bottom' : ''
            }`}
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {formattedValue}
          </div>
        </div>

        {/* Divider line */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C5A572]/50 to-transparent transform -translate-y-1/2" />

        {/* Glow effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#C5A572]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Label */}
      <span className="text-xs sm:text-sm md:text-base text-white/80 uppercase tracking-widest font-light">
        {label}
      </span>
    </div>
  );
}

export function Countdown({ targetDate, onComplete }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
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

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const interval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      // Check if countdown is complete
      if (
        newTimeLeft.days === 0 &&
        newTimeLeft.hours === 0 &&
        newTimeLeft.minutes === 0 &&
        newTimeLeft.seconds === 0 &&
        !isComplete
      ) {
        setIsComplete(true);
        onComplete?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete, isComplete]);

  return (
    <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 group">
      <FlipCard value={timeLeft.days} label="Days" />
      <FlipCard value={timeLeft.hours} label="Hours" />
      <FlipCard value={timeLeft.minutes} label="Minutes" />
      <FlipCard value={timeLeft.seconds} label="Seconds" />
    </div>
  );
}
