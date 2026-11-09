import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundEngine } from '../utils/audio';

interface TransformationOverlayProps {
  wishText: string;
  onHandoverTo3D: () => void;
}

export const TransformationOverlay: React.FC<TransformationOverlayProps> = ({
  wishText,
  onHandoverTo3D,
}) => {
  const [phase, setPhase] = useState<'text_fade' | 'paper_dissolve' | 'star_formed' | 'handed_off'>('text_fade');
  const [showText, setShowText] = useState<boolean>(true);

  // Stable ref for handover callback to prevent effect re-runs
  const handoverRef = useRef(onHandoverTo3D);
  handoverRef.current = onHandoverTo3D;

  useEffect(() => {
    // Stage 1: Text illuminates and dissolves permanently within 450ms
    const t1 = setTimeout(() => {
      setShowText(false); // Text is destroyed permanently
      setPhase('paper_dissolve');
      soundEngine.playTransformation();
    }, 450);

    // Stage 2: Particles converge into the 5-pointed star (1800ms)
    const t2 = setTimeout(() => {
      setPhase('star_formed');
    }, 1800);

    // Stage 3: Hand off to 3D continuous flight at 2700ms
    const t3 = setTimeout(() => {
      setPhase('handed_off');
      handoverRef.current();
    }, 2700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []); // Run strictly ONCE on mount

  // 40 particles dissolving from the paper and converging into the 5-pointed star
  const particleCount = 40;
  const particles = Array.from({ length: particleCount }).map((_, i) => {
    const angle = (i / particleCount) * Math.PI * 2;
    const initialDist = 70 + (i % 4) * 35;
    const initialX = Math.cos(angle) * initialDist;
    const initialY = Math.sin(angle) * (initialDist * 0.6);
    return { id: i, angle, initialX, initialY };
  });

  return (
    <AnimatePresence>
      {phase !== 'handed_off' && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center select-none overflow-hidden"
        >
          <div className="relative flex flex-col items-center justify-center">
            {/* Luminous aura behind center */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.15 }}
              animate={
                phase === 'text_fade'
                  ? { scale: 1.1, opacity: 0.4 }
                  : phase === 'paper_dissolve'
                  ? { scale: [1.2, 0.7], opacity: [0.6, 0.9] }
                  : { scale: 1.6, opacity: 1 }
              }
              transition={{ duration: 1.0, ease: 'easeInOut' }}
              className="absolute w-80 h-80 rounded-full bg-[#48DFFF]/25 blur-3xl"
            />

            {/* Paper card disintegrating */}
            {phase !== 'star_formed' && (
              <motion.div
                initial={{ scale: 1, opacity: 1 }}
                animate={
                  phase === 'text_fade'
                    ? { scale: 1, opacity: 0.95 }
                    : {
                        scale: [1, 0.4, 0],
                        opacity: [0.95, 0.4, 0],
                        rotateX: [0, 45, 90],
                      }
                }
                transition={{ duration: 1.3, ease: 'easeInOut' }}
                className="w-[360px] sm:w-[440px] h-[220px] rounded-xl border border-[#48DFFF] bg-[#04122e]/90 p-6 flex flex-col justify-center items-center shadow-[0_0_50px_rgba(72,223,255,0.5)] backdrop-blur-sm"
              >
                {/* Wish text permanently fades out in stage 1 and is unmounted */}
                {showText && (
                  <motion.p
                    initial={{ opacity: 1, filter: 'blur(0px)' }}
                    animate={{ opacity: 0, filter: 'blur(8px)', scale: 1.05 }}
                    transition={{ duration: 0.42, ease: 'easeOut' }}
                    className="font-serif-tc text-sm sm:text-base text-[#ffffff] text-glow text-center italic line-clamp-3"
                  >
                    "{wishText}"
                  </motion.p>
                )}
              </motion.div>
            )}

            {/* Swirling particles converging to form the 5-pointed star */}
            {phase === 'paper_dissolve' &&
              particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{
                    x: p.initialX,
                    y: p.initialY,
                    opacity: 0.9,
                    scale: 1.2,
                  }}
                  animate={{
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: 0.4,
                  }}
                  transition={{
                    duration: 1.25,
                    delay: (p.id % 5) * 0.05,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  className="absolute w-2 h-2 rounded-full bg-[#ffffff] shadow-[0_0_8px_#48DFFF,0_0_16px_#48DFFF]"
                />
              ))}

            {/* The Clearly Recognizable Glowing Five-Pointed Star */}
            {phase === 'star_formed' && (
              <motion.div
                initial={{ scale: 0, rotate: -72, opacity: 0 }}
                animate={{ scale: [0, 1.4, 1], rotate: 0, opacity: 1 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
                className="relative flex items-center justify-center"
              >
                {/* 5-pointed star SVG */}
                <svg
                  viewBox="0 0 100 100"
                  className="w-20 h-20 text-white drop-shadow-[0_0_20px_#48DFFF] drop-shadow-[0_0_35px_#48DFFF]"
                  style={{ filter: 'drop-shadow(0 0 16px rgba(72,223,255,0.95))' }}
                >
                  <polygon
                    points="50,4 63,35 97,35 69,57 80,91 50,70 20,91 31,57 3,35 37,35"
                    fill="#ffffff"
                    stroke="#48DFFF"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Starburst rays */}
                <div className="absolute inset-0 -m-4 flex items-center justify-center pointer-events-none">
                  <div className="w-28 h-28 rounded-full bg-[#48DFFF]/40 blur-md animate-pulse" />
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
