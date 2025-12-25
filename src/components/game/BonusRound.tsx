import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, HandResult } from '@/types/game';
import { FlippableCard } from './FlippableCard';
import { Button } from '@/components/ui/button';
import { evaluateHand } from '@/lib/pokerEngine';
import { ScorePanel } from './ScoreDisplay';

interface BonusRoundProps {
  deck: Card[];
  onSubmitHand: (cards: Card[], result: HandResult, timeRemaining: number) => void;
  onSkip: () => void;
  timeRemaining: number;
  pointMultiplier: number;
  score?: number;
  level?: number;
  onHome?: () => void;
  onRestart?: () => void;
  onPause?: () => void;
  isPaused?: boolean;
}

export function BonusRound({ 
  deck, 
  onSubmitHand, 
  onSkip, 
  timeRemaining, 
  pointMultiplier,
  score = 0,
  level,
  onHome,
  onRestart,
  onPause,
  isPaused
}: BonusRoundProps) {
  const [keptCards, setKeptCards] = useState<Card[]>([]);
  const [handResult, setHandResult] = useState<HandResult | null>(null);
  const [currentFlippedId, setCurrentFlippedId] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col h-full">
      {/* Score Panel - same as regular gameplay */}
      <ScorePanel
        score={score}
        timeDisplay={formatTime(timeRemaining)}
        progressLabel="Selected"
        progressValue={`${keptCards.length}/5`}
        level={level}
        onHome={onHome}
        onRestart={onRestart}
        onPause={onPause}
        isPaused={isPaused}
      />

      {/* Cards Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-7 gap-1.5 max-w-md mx-auto">
          {deck.slice(0, 35).map((card) => (
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
            className="flex-1 h-14 text-lg font-display border-primary bg-transparent hover:bg-primary/10 hover:text-foreground disabled:opacity-50 disabled:border-muted"
            size="lg"
          >
            Submit Hand
          </Button>
          <Button
            onClick={onSkip}
            variant="outline"
            className="border-primary bg-transparent hover:bg-primary/10 hover:text-foreground"
            size="lg"
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
