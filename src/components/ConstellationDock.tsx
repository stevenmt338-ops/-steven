import React, { useState } from 'react';
import { Volume2, VolumeX, ChevronDown, ChevronUp, Sparkles, Feather } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface ConstellationDockProps {
  totalWishes: number;
  remainingSlots?: number;
  onReturnToPaper: () => void;
  hasOwnStar: boolean;
  onFocusOwnStar: () => void;
}

export const ConstellationDock: React.FC<ConstellationDockProps> = ({
  totalWishes,
  remainingSlots = 3,
  onReturnToPaper,
  hasOwnStar,
  onFocusOwnStar,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [volume, setVolume] = useState(soundEngine.getVolume());

  const handleToggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    soundEngine.setVolume(v);
    if (isMuted && v > 0) {
      setIsMuted(false);
      soundEngine.setMuted(false);
    }
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none w-full max-w-[min(940px,94vw)] px-3">
      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="pointer-events-auto mb-2 px-3 py-1 rounded-full border border-[#48DFFF]/30 bg-[#030f24]/90 text-[11px] text-[#48DFFF]/80 hover:text-[#48DFFF] hover:border-[#48DFFF] transition-all flex items-center gap-1 shadow-[0_0_12px_rgba(72,223,255,0.15)] cursor-pointer backdrop-blur-md"
        aria-label={isCollapsed ? 'Expand navigation dock' : 'Collapse navigation dock'}
      >
        {isCollapsed ? (
          <>
            <ChevronUp size={12} />
            <span>展開控制 · Show Controls</span>
          </>
        ) : (
          <>
            <ChevronDown size={12} />
            <span>收起面板 · Cinema Mode</span>
          </>
        )}
      </button>

      {/* Main Glassmorphic Dock */}
      {!isCollapsed && (
        <div className="pointer-events-auto w-full rounded-2xl border border-[#48DFFF]/30 bg-[#030f24]/85 shadow-[0_0_30px_rgba(72,223,255,0.2)] backdrop-blur-md p-3 sm:px-6 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 text-[#48DFFF]">
          {/* Real Database Record Counter (No fabricated statistics) */}
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="w-2 h-2 rounded-full bg-[#48DFFF]" />
            <span className="font-serif-tc tracking-wider text-[#48DFFF]/90">
              群星記憶：<strong className="font-cinzel text-sm text-[#ffffff] font-semibold">{totalWishes}</strong> 顆真實願望
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {hasOwnStar && (
              <button
                onClick={onFocusOwnStar}
                className="px-3.5 py-1.5 rounded-full border border-[#48DFFF]/40 bg-[#48DFFF]/10 hover:bg-[#48DFFF]/20 text-xs text-[#48DFFF] transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(72,223,255,0.2)] active:scale-95"
              >
                <Sparkles size={12} />
                <span>凝望我的星辰</span>
              </button>
            )}

            <button
              onClick={onReturnToPaper}
              className="px-3.5 py-1.5 rounded-full border border-[#48DFFF]/40 hover:border-[#48DFFF] text-xs text-[#48DFFF]/85 hover:text-[#48DFFF] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Feather size={12} />
              <span>{remainingSlots > 0 ? `許下心願 (${remainingSlots}/3)` : '回到紙頁'}</span>
            </button>

            {/* Audio Controls */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#48DFFF]/20">
              <button
                onClick={handleToggleSound}
                className="w-8 h-8 rounded-full border border-[#48DFFF]/30 flex items-center justify-center text-[#48DFFF]/80 hover:text-[#48DFFF] hover:border-[#48DFFF] transition-colors cursor-pointer"
                title={isMuted ? '開啟環境聲效 (Audio On)' : '關閉聲效 (Mute)'}
                aria-label="Toggle Sound"
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>

              {!isMuted && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 accent-[#48DFFF] bg-[#020817] cursor-pointer hidden sm:block"
                  aria-label="Volume slider"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
