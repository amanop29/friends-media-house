'use client';

import { motion } from 'framer-motion';

interface BlurTextProps {
  text: string;
  delay?: number;
  duration?: number;
  className?: string;
}

export default function BlurText({
  text,
  delay = 0.08,
  duration = 0.7,
  className = '',
}: BlurTextProps) {
  const words = text.split(' ');

  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block"
          style={{ marginRight: '0.28em' }}
          initial={{ opacity: 0, filter: 'blur(12px)', y: 10 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{
            duration,
            delay: i * delay,
            ease: [0.25, 0.4, 0.25, 1],
          }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
