'use client';

import { CSSProperties } from 'react';

interface ShinyTextProps {
  text: string;
  speed?: number;
  className?: string;
}

export default function ShinyText({ text, speed = 5, className = '' }: ShinyTextProps) {
  return (
    <span
      className={`animate-shiny-text inline-block bg-clip-text text-transparent ${className}`}
      style={
        {
          backgroundImage:
            'linear-gradient(120deg, rgba(197,165,114,0.45) 0%, rgba(232,213,181,1) 30%, rgba(255,245,220,0.9) 50%, rgba(232,213,181,0.8) 70%, rgba(197,165,114,0.45) 100%)',
          backgroundSize: '250% 100%',
          '--shiny-speed': `${speed}s`,
        } as CSSProperties
      }
    >
      {text}
    </span>
  );
}
