import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { formatRemainingTime } from '../utils/visitor';
import { VisitorStatus } from '../types';
import { soundEngine } from '../utils/audio';

interface MagicalPaperProps {
  wishText: string;
  setWishText: (text: string) => void;
  isPublic: boolean;
  setIsPublic: (isPub: boolean) => void;
  onSubmitInitiate: () => void;
  visitorStatus: VisitorStatus | null;
  onExploreSky: () => void;
}

export const MagicalPaper: React.FC<MagicalPaperProps> = ({
  wishText,
  setWishText,
  isPublic,
  setIsPublic,
  onSubmitInitiate,
  visitorStatus,
  onExploreSky,
}) => {
  const [localRemainingMs, setLocalRemainingMs] = useState<number>(
    visitorStatus?.remainingMs || 0
  );

  // Sync remaining milliseconds from server and tick down locally every second
  useEffect(() => {
    if (visitorStatus) {
      setLocalRemainingMs(visitorStatus.remainingMs);
    }
  }, [visitorStatus]);

  useEffect(() => {
    if (localRemainingMs <= 0) return;
    const interval = setInterval(() => {
      setLocalRemainingMs((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [localRemainingMs]);

  const countdown = formatRemainingTime(localRemainingMs);

  const remainingSlots = visitorStatus?.remainingSlots !== undefined 
    ? visitorStatus.remainingSlots 
    : (visitorStatus?.canSubmit === false ? 0 : 3);
  const usedSlots = visitorStatus?.usedSlots !== undefined
    ? visitorStatus.usedSlots
    : (visitorStatus?.lastWish ? 1 : 0);

  const isCooldownActive = remainingSlots === 0 && localRemainingMs > 0;
  const isInputValid = wishText.trim().length > 0 && wishText.length <= 300;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isCooldownActive) return;
    const text = e.target.value;
    if (text.length <= 300) {
      setWishText(text);
    }
  };

  const handleCompleteClick = () => {
    if (!isInputValid || isCooldownActive) return;
    soundEngine.playChime(1174.66);
    onSubmitInitiate();
  };

  return (
    <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 py-8 select-none">
      {/* Restrained magical aura around the paper */}
      <div className="absolute w-[440px] sm:w-[600px] h-[480px] rounded-full bg-[#48DFFF]/5 blur-[100px] pointer-events-none" />

      {/* Header Prompt */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
        className="text-center mb-5 sm:mb-6 pointer-events-none"
      >
        <h1 className="font-serif-tc text-2xl sm:text-3xl tracking-widest text-[#48DFFF] text-glow font-normal">
          {isCooldownActive ? '你的願望已經抵達星空' : '你的願望是什麼？'}
        </h1>
        <p className="font-cinzel text-xs sm:text-sm tracking-[0.25em] text-[#48DFFF]/60 mt-1.5 uppercase">
          {isCooldownActive ? 'Your wishes have reached the stars.' : 'What is your wish?'}
        </p>

        {/* 3-Wishes-per-7-Days indicator pill */}
        <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full border border-[#48DFFF]/25 bg-[#020817]/70 text-[11px] text-[#48DFFF]/80">
          <span className="font-cinzel tracking-wider text-[#48DFFF]">
            七日週期願望 · {3 - remainingSlots} / 3 已許下
          </span>
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((idx) => {
              const isFilled = idx < usedSlots;
              return (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full ${
                    isFilled
                      ? 'bg-[#48DFFF] shadow-[0_0_6px_#48DFFF]'
                      : 'border border-[#48DFFF]/40'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Floating Ice-Blue Paper Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="relative w-full max-w-[420px] sm:max-w-[490px] animate-subtle-float"
      >
        {/* Soft blue shadow beneath paper */}
        <div className="absolute -inset-1 rounded-2xl bg-[#48DFFF]/10 blur-xl -z-10" />

        {/* Paper Sheet with realistic folded deckle edges and ice-blue glass texture */}
        <div className="relative rounded-xl border border-[#48DFFF]/40 bg-[#04122e]/85 shadow-[0_0_35px_rgba(72,223,255,0.18),inset_0_0_20px_rgba(72,223,255,0.06)] backdrop-blur-sm overflow-hidden p-6 sm:p-8">
          {/* Subtle paper fold watermark line */}
          <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
            <div className="absolute transform rotate-45 bg-[#48DFFF]/10 border-b border-[#48DFFF]/30 w-24 h-6 -top-3 -right-3" />
          </div>

          {/* Delicate paper corner folds */}
          <div className="absolute bottom-2 left-3 w-8 h-[1px] bg-[#48DFFF]/20" />
          <div className="absolute top-3 right-6 w-12 h-[1px] bg-[#48DFFF]/20" />

          {isCooldownActive ? (
            /* Cooldown state: all 3 wishes submitted within 7 days */
            <div className="flex flex-col items-center text-center py-4 text-[#48DFFF]">
              <div className="w-10 h-10 rounded-full border border-[#48DFFF]/40 flex items-center justify-center mb-4 bg-[#48DFFF]/10 shadow-[0_0_15px_rgba(72,223,255,0.3)]">
                <span className="text-lg">✦</span>
              </div>

              <p className="text-sm sm:text-base font-light text-[#48DFFF]/90 leading-relaxed mb-4">
                你在此七日週期內的三個願望，皆已化為深藍夜空中永恆的星宿。
              </p>

              {visitorStatus?.myWishes && visitorStatus.myWishes.length > 0 && (
                <div className="w-full space-y-2 mb-4 text-left max-h-36 overflow-y-auto">
                  {visitorStatus.myWishes.slice(0, 3).map((w, idx) => (
                    <div
                      key={w.id}
                      className="p-2.5 rounded-lg border border-[#48DFFF]/20 bg-[#020817]/60 text-xs"
                    >
                      <span className="text-[10px] text-[#48DFFF]/50 block mb-0.5">
                        星宿 {idx + 1} · {w.isPublic ? '公開' : '私密'}
                      </span>
                      <p className="italic text-[#dcf8ff] font-serif-tc line-clamp-2">
                        "{w.text}"
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="w-full border-t border-[#48DFFF]/20 pt-4 mb-2">
                <p className="text-xs tracking-wider text-[#48DFFF]/60 mb-2">
                  下一個願望名額釋放倒數 · Next wish slot opens in:
                </p>
                <div className="font-cinzel text-lg sm:text-xl font-medium tracking-widest text-[#48DFFF] text-glow">
                  {countdown.formatted}
                </div>
              </div>
            </div>
          ) : (
            /* Active writing area */
            <div className="flex flex-col">
              <label htmlFor="wish-input" className="sr-only">
                Write your wish here
              </label>

              <textarea
                id="wish-input"
                value={wishText}
                onChange={handleChange}
                placeholder="Write your wish here…"
                rows={5}
                maxLength={300}
                className="w-full bg-transparent resize-none border-none outline-none font-serif-tc text-sm sm:text-base text-[#dcf8ff] placeholder-[#48DFFF]/35 leading-relaxed selection:bg-[#48DFFF]/30 caret-[#48DFFF]"
                style={{
                  fontFeatureSettings: '"palt"',
                }}
              />

              {/* Character Counter & Privacy Toggle */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-[#48DFFF]/20 mt-3 text-xs">
                {/* Privacy preference */}
                <label className="flex items-center gap-2 cursor-pointer text-[#48DFFF]/75 hover:text-[#48DFFF] transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="accent-[#48DFFF] rounded w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[11px] sm:text-xs">
                    {isPublic ? '公開星辰 (星空旅人可見)' : '私密守護 (預設隱藏內容)'}
                  </span>
                </label>

                {/* Character counter */}
                <span
                  className={`text-[11px] tracking-wider self-end sm:self-auto ${
                    wishText.length >= 280
                      ? 'text-[#48DFFF]'
                      : 'text-[#48DFFF]/50'
                  }`}
                >
                  {wishText.length} / 300
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Button Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, delay: 0.4, ease: 'easeOut' }}
        className="mt-6 sm:mt-8 flex flex-col items-center gap-3"
      >
        {isCooldownActive ? (
          <button
            onClick={onExploreSky}
            className="group relative px-8 py-3 rounded-full border border-[#48DFFF] text-[#48DFFF] text-xs sm:text-sm tracking-[0.25em] font-medium overflow-hidden transition-all duration-300 hover:shadow-[0_0_25px_rgba(72,223,255,0.4)] active:scale-95 cursor-pointer bg-[#04122e]/60"
          >
            <span className="relative z-10 flex items-center gap-2">
              <span>星空を見る</span>
              <span className="text-[10px] tracking-normal opacity-70">· 漫遊星空</span>
            </span>
            <div className="absolute inset-0 bg-[#48DFFF]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleCompleteClick}
              disabled={!isInputValid}
              className={`group relative px-10 py-3 rounded-full border transition-all duration-300 overflow-hidden cursor-pointer ${
                isInputValid
                  ? 'border-[#48DFFF] text-[#48DFFF] shadow-[0_0_20px_rgba(72,223,255,0.25)] hover:shadow-[0_0_35px_rgba(72,223,255,0.5)] hover:scale-105 active:scale-95 bg-[#020817]/60'
                  : 'border-[#48DFFF]/30 text-[#48DFFF]/30 cursor-not-allowed bg-transparent'
              }`}
            >
              <span className="relative z-10 font-serif-tc text-sm sm:text-base tracking-[0.3em] font-medium">
                完成
              </span>
              {isInputValid && (
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-[#48DFFF]/20 to-transparent transition-transform" />
              )}
            </button>

            {usedSlots > 0 && (
              <button
                onClick={onExploreSky}
                className="px-5 py-2.5 rounded-full border border-[#48DFFF]/30 hover:border-[#48DFFF] text-xs text-[#48DFFF]/70 hover:text-[#48DFFF] transition-colors cursor-pointer"
              >
                凝望群星 · Explore Sky
              </button>
            )}
          </div>
        )}

        {/* Footer rule notice */}
        <p className="text-[11px] text-[#48DFFF]/40 tracking-wider text-center max-w-sm mt-1">
          每位旅人每七天週期可許下最多三個心願 · 每一顆星辰皆在宇宙中永恆閃耀
        </p>
      </motion.div>
    </div>
  );
};
