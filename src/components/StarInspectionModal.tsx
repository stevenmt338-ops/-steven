import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WishItem } from '../types';

interface StarInspectionModalProps {
  selectedStar: WishItem | null;
  onClose: () => void;
}

export const StarInspectionModal: React.FC<StarInspectionModalProps> = ({
  selectedStar,
  onClose,
}) => {
  if (!selectedStar) return null;

  const dateFormatted = new Date(selectedStar.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none pointer-events-none">
        {/* Subtle backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#020817]/65 pointer-events-auto"
        />

        {/* Wish Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-sm rounded-2xl border border-[#48DFFF]/40 bg-[#030f24] p-6 shadow-[0_0_35px_rgba(72,223,255,0.25)] text-[#48DFFF] pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#48DFFF]/20">
            <div className="flex items-center gap-2">
              <span className="text-sm">✦</span>
              <span className="font-cinzel text-xs tracking-widest uppercase text-[#48DFFF]/80">
                {selectedStar.isOwner
                  ? '你的願望之星 · Your Wish'
                  : selectedStar.isPublic
                  ? '旅人的願望之星 · Star of a Wanderer'
                  : '靜默守護之星 · Silent Star'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full border border-[#48DFFF]/30 flex items-center justify-center text-xs text-[#48DFFF]/70 hover:text-[#48DFFF] hover:border-[#48DFFF] transition-colors cursor-pointer"
              aria-label="Close star details"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="py-2">
            {selectedStar.text ? (
              <p className="font-serif-tc text-sm sm:text-base text-[#dcf8ff] leading-relaxed italic break-words selection:bg-[#48DFFF]/30">
                "{selectedStar.text}"
              </p>
            ) : (
              <div className="text-center py-4">
                <p className="font-serif-tc text-xs sm:text-sm text-[#48DFFF]/70 leading-relaxed italic">
                  這是一顆靜默守護的願望之星。
                </p>
                <p className="text-[11px] text-[#48DFFF]/45 mt-1 font-light">
                  願望已被宇宙溫柔珍藏，願光芒引領前行。
                </p>
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="pt-4 mt-3 border-t border-[#48DFFF]/15 flex items-center justify-between text-[11px] text-[#48DFFF]/50 font-cinzel tracking-wider">
            <span>抵達星空 · {dateFormatted}</span>
            <span>
              座標: [{Math.round(selectedStar.position[0])}, {Math.round(selectedStar.position[1])}]
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
