import React from 'react';
import { motion } from 'motion/react';
import { soundEngine } from '../utils/audio';

interface FinalMessageProps {
  onExplore: () => void;
}

export const FinalMessage: React.FC<FinalMessageProps> = ({ onExplore }) => {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none">
      {/* Delicate atmospheric glow */}
      <div className="absolute w-[450px] h-[350px] rounded-full bg-[#48DFFF]/5 blur-[120px] pointer-events-none" />

      {/* Main poetic text container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center max-w-lg"
      >
        {/* Japanese / Poetic phrase from brief */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="font-serif-tc text-3xl sm:text-4xl text-[#48DFFF] text-glow font-light tracking-[0.3em] mb-4"
        >
          願いは星になる
        </motion.h1>

        {/* English main message */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 0.9, y: 0 }}
          transition={{ duration: 1.2, delay: 0.8 }}
          className="font-cinzel text-sm sm:text-base tracking-[0.2em] text-[#dcf8ff] font-medium mb-3 uppercase"
        >
          Your wish is now part of something bigger.
        </motion.p>

        {/* Closing poetic line */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.65, y: 0 }}
          transition={{ duration: 1.2, delay: 1.4 }}
          className="text-xs sm:text-sm text-[#48DFFF]/70 font-light italic tracking-wider max-w-md mb-8 leading-relaxed"
        >
          “Somewhere in this endless universe, your little star will keep shining.”
        </motion.p>

        {/* Action Button: 「星空を見る」 */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 2.0 }}
          onClick={() => {
            soundEngine.playChime(1174.66);
            onExplore();
          }}
          className="pointer-events-auto group relative px-8 py-3 rounded-full border border-[#48DFFF] text-[#48DFFF] text-xs sm:text-sm tracking-[0.3em] font-medium shadow-[0_0_20px_rgba(72,223,255,0.25)] hover:shadow-[0_0_35px_rgba(72,223,255,0.5)] transition-all duration-300 active:scale-95 cursor-pointer bg-[#020817]/60"
        >
          <span className="relative z-10 flex items-center gap-2">
            <span>星空を見る</span>
          </span>
          <div className="absolute inset-0 bg-[#48DFFF]/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
        </motion.button>
      </motion.div>
    </div>
  );
};
