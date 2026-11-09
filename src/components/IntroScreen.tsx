import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundEngine } from '../utils/audio';

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'dot' | 'title' | 'fadeout'>('dot');
  const titleCharacters = ['最', '後', '的', '願', '望'];

  useEffect(() => {
    // Phase 1: Center luminous point appears (0ms - 800ms)
    // Phase 2: Title and subtitle reveal (800ms - 3800ms)
    // Phase 3: Transition to main experience (4200ms)
    const t1 = setTimeout(() => {
      setPhase('title');
      soundEngine.playChime(880);
    }, 900);

    const t2 = setTimeout(() => {
      setPhase('fadeout');
    }, 4000);

    const t3 = setTimeout(() => {
      onComplete();
    }, 4800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'fadeout' && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020817] text-[#48DFFF] select-none overflow-hidden"
          role="region"
          aria-label="Cinematic Opening Intro"
        >
          {/* Subtle cosmic particle aura in background */}
          <div className="absolute w-[340px] h-[340px] rounded-full bg-[#48DFFF]/5 blur-[90px] pointer-events-none" />

          {/* Central light point */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={
              phase === 'dot'
                ? { scale: [0, 1.8, 1], opacity: [0, 1, 0.9] }
                : { scale: 12, opacity: 0 }
            }
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="absolute w-2 h-2 rounded-full bg-[#48DFFF] shadow-[0_0_20px_#48DFFF,0_0_40px_#48DFFF]"
          />

          {/* Title & Subtitles */}
          <div className="relative z-10 flex flex-col items-center text-center px-4">
            {/* Chinese Title characters animated one by one */}
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3">
              {titleCharacters.map((char, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
                  animate={
                    phase === 'title'
                      ? { opacity: 1, y: 0, filter: 'blur(0px)' }
                      : { opacity: 0 }
                  }
                  transition={{
                    duration: 0.8,
                    delay: 0.15 + index * 0.18,
                    ease: 'easeOut',
                  }}
                  className="font-serif-tc text-4xl sm:text-6xl tracking-widest text-[#48DFFF] text-glow font-light"
                >
                  {char}
                </motion.span>
              ))}
            </div>

            {/* English Title */}
            <motion.h2
              initial={{ opacity: 0, letterSpacing: '0.2em' }}
              animate={
                phase === 'title'
                  ? { opacity: 0.8, letterSpacing: '0.35em' }
                  : { opacity: 0 }
              }
              transition={{ duration: 1.2, delay: 1.2, ease: 'easeOut' }}
              className="font-cinzel text-xs sm:text-sm uppercase text-[#48DFFF]/80 tracking-[0.35em] mt-1 mb-6 font-medium"
            >
              THE LAST WISH
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={
                phase === 'title'
                  ? { opacity: 0.65, y: 0 }
                  : { opacity: 0 }
              }
              transition={{ duration: 1.0, delay: 1.7, ease: 'easeOut' }}
              className="text-xs sm:text-sm text-[#48DFFF]/60 max-w-md font-light italic tracking-wider"
            >
              “Every wish deserves a place in the universe.”
            </motion.p>
          </div>

          {/* Unobtrusive skip button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            whileHover={{ opacity: 0.9 }}
            onClick={onComplete}
            className="absolute bottom-8 text-xs font-light tracking-widest text-[#48DFFF]/60 hover:text-[#48DFFF] transition-opacity px-4 py-2"
          >
            跳過引導 · Skip
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
