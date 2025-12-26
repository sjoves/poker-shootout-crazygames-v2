import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, HandResult } from '@/types/game';
import { FlippableCard } from './FlippableCard';
import { Button } from '@/components/ui/button';
import { evaluateHand } from '@/lib/pokerEngine';
import { ScorePanel } from './ScoreDisplay';
import { StarIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

type IntroPhase = 'instructions' | 'ready' | 'begin' | 'playing';

interface BonusRoundProps {
  deck: Card[];
  onSubmitHand: (cards: Card[], result: HandResult, timeRemaining: number) => void;
  onSkip: () => void;
  timeRemaining: number;
  pointMultiplier: number;
  score?: number;
  level?: number;
  bonusRoundNumber?: number;
  onHome?: () => void;
  onRestart?: () => void;
  onPause?: () => void;
  isPaused?: boolean;
  onIntroComplete?: () => void;
}

export function BonusRound({ 
  deck, 
  onSubmitHand, 
  onSkip, 
  timeRemaining, 
  pointMultiplier,
  score = 0,
  level,
  bonusRoundNumber = 1,
  onHome,
  onRestart,
  onPause,
  isPaused,
  onIntroComplete
}: BonusRoundProps) {
  const [keptCards, setKeptCards] = useState<Card[]>([]);
  const [handResult, setHandResult] = useState<HandResult | null>(null);
  const [currentFlippedId, setCurrentFlippedId] = useState<string | null>(null);
  const [introPhase, setIntroPhase] = useState<IntroPhase>('instructions');

  // Calculate number of cards based on bonus round number (10, 20, 30, 40, 50, max 52)
  // Ensure at least 1 for the multiplier (handles bonusRoundNumber being 0)
  const effectiveBonusRound = Math.max(bonusRoundNumber, 1);
  const cardCount = Math.min(effectiveBonusRound * 10, 52);
  // Calculate grid columns based on card count
  const gridCols = cardCount <= 10 ? 5 : cardCount <= 20 ? 5 : 7;

  // Intro sequence timing
  useEffect(() => {
    if (introPhase === 'instructions') {
      const timer = setTimeout(() => setIntroPhase('ready'), 2500);
      return () => clearTimeout(timer);
    }
    if (introPhase === 'ready') {
      const timer = setTimeout(() => setIntroPhase('begin'), 1200);
      return () => clearTimeout(timer);
    }
    if (introPhase === 'begin') {
      const timer = setTimeout(() => {
        setIntroPhase('playing');
        onIntroComplete?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [introPhase, onIntroComplete]);

  // Evaluate hand when 5 cards are kept
  useEffect(() => {
    if (keptCards.length === 5) {
      const result = evaluateHand(keptCards);
      setHandResult(result);
    } else {
      setHandResult(null);
    }
  }, [keptCards]);

  const handleFlip = useCallback((cardId: string) => {
    setCurrentFlippedId(cardId);
  }, []);

  const handleKeep = useCallback((card: Card) => {
    if (keptCards.length >= 5) return;
    setKeptCards(prev => [...prev, card]);
    setCurrentFlippedId(null);
  }, [keptCards.length]);

  const handleUnkeep = useCallback((card: Card) => {
    setKeptCards(prev => prev.filter(c => c.id !== card.id));
  }, []);

  const handleSubmit = () => {
    if (keptCards.length === 5 && handResult) {
      onSubmitHand(keptCards, handResult, timeRemaining);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const keptCardIds = keptCards.map(c => c.id);
  const canSubmit = keptCards.length === 5;

  // Show intro overlays before gameplay
  if (introPhase !== 'playing') {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <AnimatePresence mode="wait">
          {introPhase === 'instructions' && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -30 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-center p-8 bg-card/95 backdrop-blur-md border-2 border-accent rounded-2xl shadow-2xl max-w-sm mx-4"
            >
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <StarIcon className="w-16 h-16 text-accent mx-auto mb-4" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-display text-accent mb-3"
              >
                BONUS ROUND!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg text-foreground mb-2"
              >
                Flip cards to build your best hand!
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-sm text-muted-foreground"
              >
                Earn points + time bonus for speed!
              </motion.p>
              {pointMultiplier > 1 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-sm text-primary mt-2 font-bold"
                >
                  {pointMultiplier}x Points Active!
                </motion.p>
              )}
            </motion.div>
          )}

          {introPhase === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-center"
            >
              <motion.h1
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="text-6xl font-display text-accent drop-shadow-lg"
              >
                Ready?
              </motion.h1>
            </motion.div>
          )}

          {introPhase === 'begin' && (
            <motion.div
              key="begin"
              initial={{ opacity: 0, scale: 0.3, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 2 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
              className="text-center"
            >
              <motion.h1
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.4 }}
                className="text-7xl font-display text-primary drop-shadow-lg"
              >
                BEGIN!
              </motion.h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Score Panel - same as regular gameplay */}
      <ScorePanel
        score={score}
        timeDisplay={formatTime(timeRemaining)}
        progressLabel="Selected"
        progressValue={`${keptCards.length}/5`}
        isBonusRound={true}
        onHome={onHome}
        onRestart={onRestart}
        onPause={onPause}
        isPaused={isPaused}
      />

      {/* Cards Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className={cn(
          "gap-1.5 max-w-md mx-auto grid",
          gridCols === 5 ? "grid-cols-5" : "grid-cols-7"
        )}>
          {deck.slice(0, cardCount).map((card) => (
            <FlippableCard
              key={card.id}
              card={card}
              isKept={keptCardIds.includes(card.id)}
              isFlippedExternal={currentFlippedId === card.id}
              onFlip={handleFlip}
              onKeep={handleKeep}
              onUnkeep={handleUnkeep}
              disabled={keptCards.length >= 5 && !keptCardIds.includes(card.id)}
            />
          ))}
        </div>
      </div>

      {/* Hand Result Preview */}
      {handResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/80 backdrop-blur-sm border-t border-border p-3 text-center max-w-md mx-auto w-full"
        >
          <p className="text-lg font-display text-primary">
            {handResult.hand.name}
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              Hand: {handResult.totalPoints * pointMultiplier} pts
              {pointMultiplier > 1 && (
                <span className="text-accent ml-1">({pointMultiplier}x)</span>
              )}
            </p>
            <p className="text-accent">
              + Time Bonus: {timeRemaining * 10} pts ({timeRemaining}s × 10)
            </p>
            <p className="text-foreground font-bold border-t border-border pt-1 mt-1">
              Total: {(handResult.totalPoints * pointMultiplier) + (timeRemaining * 10)} pts
            </p>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="p-4">
        <div className="flex gap-3 max-w-md mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            variant="outline"
            className="flex-1 h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground disabled:opacity-50 disabled:border-primary/50"
            size="lg"
          >
            Submit Hand
          </Button>
          <Button
            onClick={onSkip}
            variant="outline"
            className="h-14 border-primary bg-transparent hover:bg-primary/10 hover:text-foreground"
            size="lg"
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
