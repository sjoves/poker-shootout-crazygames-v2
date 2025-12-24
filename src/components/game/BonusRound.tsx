import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, HandResult } from '@/types/game';
import { FlippableCard } from './FlippableCard';
import { Button } from '@/components/ui/button';
import { evaluateHand } from '@/lib/pokerEngine';
import { Target, Timer } from 'lucide-react';

interface BonusRoundProps {
  deck: Card[];
  onSubmitHand: (cards: Card[], result: HandResult) => void;
  onSkip: () => void;
  timeRemaining: number;
  pointMultiplier: number;
}

export function BonusRound({ deck, onSubmitHand, onSkip, timeRemaining, pointMultiplier }: BonusRoundProps) {
  const [keptCards, setKeptCards] = useState<Card[]>([]);
  const [handResult, setHandResult] = useState<HandResult | null>(null);

  // Evaluate hand when 5 cards are kept
  useEffect(() => {
    if (keptCards.length === 5) {
      const result = evaluateHand(keptCards);
      setHandResult(result);
    } else {
      setHandResult(null);
    }
  }, [keptCards]);

  const handleKeep = useCallback((card: Card) => {
    if (keptCards.length >= 5) return;
    setKeptCards(prev => [...prev, card]);
  }, [keptCards.length]);

  const handleUnkeep = useCallback((card: Card) => {
    setKeptCards(prev => prev.filter(c => c.id !== card.id));
  }, []);

  const handleSubmit = () => {
    if (keptCards.length === 5 && handResult) {
      onSubmitHand(keptCards, handResult);
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
      {/* Header */}
      <div className="text-center py-4">
        <div className="flex items-center justify-center gap-2 text-accent mb-2">
          <Target className="w-6 h-6" />
          <h2 className="text-2xl font-display">Bonus Round</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Flip cards to find the best poker hand
        </p>
      </div>

      {/* Timer and Selected Count */}
      <div className="flex justify-between items-center px-4 py-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Timer className="w-4 h-4" />
          <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
        </div>
        <div className="text-muted-foreground">
          Selected: <span className="text-foreground font-bold">{keptCards.length}/5</span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-7 gap-1.5 max-w-md mx-auto">
          {deck.slice(0, 26).map((card) => (
            <FlippableCard
              key={card.id}
              card={card}
              isKept={keptCardIds.includes(card.id)}
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
          className="bg-card/80 backdrop-blur-sm border-t border-border p-3 text-center"
        >
          <p className="text-lg font-display text-primary">
            {handResult.hand.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {handResult.totalPoints * pointMultiplier} points
            {pointMultiplier > 1 && (
              <span className="text-accent ml-1">({pointMultiplier}x bonus)</span>
            )}
          </p>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="p-4 bg-card/80 backdrop-blur-sm border-t border-border flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1"
          size="lg"
        >
          Submit Hand
        </Button>
        <Button
          onClick={onSkip}
          variant="outline"
          size="lg"
        >
          Skip
        </Button>
      </div>
    </div>
  );
}
