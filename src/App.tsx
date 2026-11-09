import React, { useState, useEffect, useCallback } from 'react';
import { WinterScene3D } from './components/WinterScene3D';
import { IntroScreen } from './components/IntroScreen';
import { MagicalPaper } from './components/MagicalPaper';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { TransformationOverlay } from './components/TransformationOverlay';
import { FinalMessage } from './components/FinalMessage';
import { StarInspectionModal } from './components/StarInspectionModal';
import { ConstellationDock } from './components/ConstellationDock';
import { getVisitorId } from './utils/visitor';
import { WishItem, VisitorStatus, ExperienceStep } from './types';
import { soundEngine } from './utils/audio';

export default function App() {
  const [step, setStep] = useState<ExperienceStep>('intro');
  const [wishText, setWishText] = useState<string>('');
  const [animatingWishText, setAnimatingWishText] = useState<string>('');
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [visitorStatus, setVisitorStatus] = useState<VisitorStatus | null>(null);
  const [wishes, setWishes] = useState<WishItem[]>([]);
  const [selectedStar, setSelectedStar] = useState<WishItem | null>(null);

  // Hero star position in the 3D celestial sky
  const [heroStarPos, setHeroStarPos] = useState<[number, number, number] | null>(null);

  const visitorId = getVisitorId();

  // Fetch server status and constellation records
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/status?visitorId=${encodeURIComponent(visitorId)}`, {
        headers: { 'X-Visitor-Id': visitorId },
      });
      if (res.ok) {
        const data = await res.json();
        setVisitorStatus(data);
        if (data.lastWish) {
          setHeroStarPos(data.lastWish.position);
        }
      }
    } catch (err) {
      console.warn('Status check notice:', err);
    }
  }, [visitorId]);

  const fetchWishes = useCallback(async () => {
    try {
      const res = await fetch(`/api/wishes?visitorId=${encodeURIComponent(visitorId)}`, {
        headers: { 'X-Visitor-Id': visitorId },
      });
      if (res.ok) {
        const data = await res.json();
        setWishes(data.stars || []);
      }
    } catch (err) {
      console.warn('Wishes fetch notice:', err);
    }
  }, [visitorId]);

  useEffect(() => {
    fetchStatus();
    fetchWishes();
  }, [fetchStatus, fetchWishes]);

  // Handle intro completion
  const handleIntroComplete = useCallback(() => {
    setStep('paper');
  }, []);

  // Trigger Confirmation Modal
  const handleInitiateSubmission = useCallback(() => {
    setErrorMessage(null);
    setStep('confirming');
  }, []);

  // Submit wish to backend (real 3-wishes-per-7-days server enforcement)
  const handleConfirmSubmission = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/submit-wish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Visitor-Id': visitorId,
        },
        body: JSON.stringify({
          text: wishText,
          isPublic,
          visitorId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || '送出願望時發生錯誤，請稍候重試');
        setIsSubmitting(false);
        return;
      }

      // Save wish for the 2D dissolving phase, then clear input permanently so it NEVER re-appears
      setAnimatingWishText(wishText);
      setWishText('');
      setIsSubmitting(false);

      if (data.wish?.position) {
        setHeroStarPos(data.wish.position);
      }

      // Refresh wishes and status in background
      fetchStatus();
      fetchWishes();

      // Begin cinematic paper-to-star transformation
      setStep('transforming');
    } catch {
      setErrorMessage('無法連線至宇宙伺服器，請檢查網路狀態');
      setIsSubmitting(false);
    }
  };

  // Called by WinterScene3D when the star finishes its flight at the snowy mountain summit
  const handleTransformationComplete = useCallback(() => {
    setStep('star_arrived');
  }, []);

  // Focus on visitor's own star in the sky
  const handleFocusOwnStar = useCallback(() => {
    const own =
      wishes.find((w) => w.isOwner) ||
      (visitorStatus?.lastWish
        ? {
            id: visitorStatus.lastWish.id,
            position: visitorStatus.lastWish.position,
            brightness: 1.2,
            size: 1.2,
            createdAt: visitorStatus.lastWish.createdAt,
            isPublic: visitorStatus.lastWish.isPublic,
            isOwner: true,
            text: visitorStatus.lastWish.text,
          }
        : null);

    if (own) {
      setSelectedStar(own);
      soundEngine.playChime(1567.98);
    }
  }, [wishes, visitorStatus]);

  const totalRealWishes = visitorStatus?.totalWishes ?? wishes.length;

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#020817] text-[#48DFFF]">
      {/* 1. Immersive 3D Winter Environment (Three.js) - Persists across all phases */}
      <WinterScene3D
        wishes={wishes}
        selectedStarId={selectedStar?.id || null}
        onSelectStar={setSelectedStar}
        isTransforming={step === 'transforming'}
        onTransformationComplete={handleTransformationComplete}
        heroStarPos={heroStarPos}
        mode={
          step === 'intro' || step === 'paper' || step === 'confirming'
            ? 'paper'
            : step === 'transforming'
            ? 'transforming'
            : step === 'star_arrived'
            ? 'arrived'
            : 'explore'
        }
      />

      {/* 2. Cinematic Opening Intro (On first visit or reload) */}
      {step === 'intro' && (
        <IntroScreen onComplete={handleIntroComplete} />
      )}

      {/* 3. Main Screen — The Magical Paper */}
      {(step === 'paper' || step === 'confirming') && (
        <MagicalPaper
          wishText={wishText}
          setWishText={setWishText}
          isPublic={isPublic}
          setIsPublic={setIsPublic}
          onSubmitInitiate={handleInitiateSubmission}
          visitorStatus={visitorStatus}
          onExploreSky={() => setStep('explore')}
        />
      )}

      {/* 4. Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={step === 'confirming'}
        wishText={wishText}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmSubmission}
        onCancel={() => setStep('paper')}
        errorMessage={errorMessage}
      />

      {/* 5. Paper-To-Star Dissolve & Five-Pointed Star Birth */}
      {step === 'transforming' && (
        <TransformationOverlay
          wishText={animatingWishText}
          onHandoverTo3D={() => {
            // Handover to continuous 3D camera flight
          }}
        />
      )}

      {/* 6. Final Message: 「願いは星になる」 over Snowy Mountain Summit */}
      {step === 'star_arrived' && (
        <FinalMessage onExplore={() => setStep('explore')} />
      )}

      {/* 7. Star Details Modal */}
      <StarInspectionModal
        selectedStar={selectedStar}
        onClose={() => setSelectedStar(null)}
      />

      {/* 8. Ergonomic Collapsible Bottom Dock in Explore & Arrived Mode */}
      {(step === 'explore' || step === 'star_arrived') && (
        <ConstellationDock
          totalWishes={totalRealWishes}
          remainingSlots={visitorStatus?.remainingSlots ?? 3}
          onReturnToPaper={() => {
            setWishText('');
            setStep('paper');
          }}
          hasOwnStar={Boolean(visitorStatus?.lastWish || wishes.some((w) => w.isOwner))}
          onFocusOwnStar={handleFocusOwnStar}
        />
      )}
    </main>
  );
}
