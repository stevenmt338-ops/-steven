import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundEngine } from '../utils/audio';

interface ConfirmationDialogProps {
  isOpen: boolean;
  wishText: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  errorMessage?: string | null;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  wishText,
  isSubmitting,
  onConfirm,
  onCancel,
  errorMessage,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Subtle midnight backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && onCancel()}
            className="absolute inset-0 bg-[#020817]/85 backdrop-blur-md"
          />

          {/* Minimal Prompt Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-[#48DFFF]/40 bg-[#030f24] p-6 sm:p-7 shadow-[0_0_40px_rgba(72,223,255,0.25)] text-center text-[#48DFFF]"
          >
            {/* Luminous crest icon */}
            <div className="w-10 h-10 rounded-full border border-[#48DFFF]/30 mx-auto mb-4 flex items-center justify-center bg-[#48DFFF]/5 shadow-[0_0_12px_rgba(72,223,255,0.2)]">
              <span className="text-sm">✦</span>
            </div>

            {/* Prompt exact title */}
            <h2 className="font-serif-tc text-lg sm:text-xl font-normal tracking-widest text-[#48DFFF] text-glow mb-1">
              這是你真正的願望嗎？
            </h2>
            <p className="font-cinzel text-xs text-[#48DFFF]/60 tracking-[0.2em] mb-5">
              Is this truly your wish?
            </p>

            {/* Wish preview excerpt */}
            <div className="p-3.5 mb-6 rounded-lg border border-[#48DFFF]/20 bg-[#020817]/70 text-left max-h-28 overflow-y-auto">
              <p className="text-xs sm:text-sm text-[#dcf8ff]/90 font-serif-tc italic leading-relaxed break-words">
                "{wishText}"
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 text-xs text-[#48DFFF] bg-[#48DFFF]/10 border border-[#48DFFF]/30 rounded-lg p-2.5">
                {errorMessage}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  soundEngine.playChime(1567.98);
                  onConfirm();
                }}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-full border border-[#48DFFF] bg-[#48DFFF]/15 text-[#48DFFF] text-xs sm:text-sm font-serif-tc tracking-widest hover:bg-[#48DFFF]/25 transition-all shadow-[0_0_15px_rgba(72,223,255,0.3)] disabled:opacity-50 cursor-pointer active:scale-98"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-[#48DFFF] border-t-transparent animate-spin" />
                    <span>願望飛向星空中…</span>
                  </span>
                ) : (
                  '是的，送出願望'
                )}
              </button>

              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-full text-xs text-[#48DFFF]/60 hover:text-[#48DFFF] transition-colors font-light tracking-wider disabled:opacity-30 cursor-pointer"
              >
                再修改一下
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
