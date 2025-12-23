import { motion, AnimatePresence } from 'framer-motion';
import { Card, HandResult } from '@/types/game';
import { PlayingCard, EmptyCardSlot } from './PlayingCard';
import { cn } from '@/lib/utils';

interface HandDisplayProps {
  cards: Card[];
  maxCards?: number;
  currentHand?: HandResult | null;
  className?: string;
}

export function HandDisplay({ cards, maxCards = 5, currentHand, className }: HandDisplayProps) {
  const slots = Array(maxCards).fill(null);
  const isComplete = cards.length === maxCards;

  return (
    <div className={cn('relative flex flex-col items-center gap-3', className)}>
      <div className="flex gap-2 justify-center">
        <AnimatePresence mode="popLayout">
          {slots.map((_, index) => {
            const card = cards[index];
            return (
              <motion.div
                key={card?.id || `slot-${index}`}
                layout
                initial={{ scale: 0.5, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                {card ? (
                  <PlayingCard card={card} size="lg" isDisabled animate={false} />
                ) : (
                  <EmptyCardSlot size="lg" />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {/* Hand result overlay - only shows when hand is complete */}
      <AnimatePresence>
        {isComplete && currentHand && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl"
          >
            <div className="px-6 py-3 rounded-lg bg-card/90 border border-primary/40 shadow-lg text-center">
              <div className="text-xl font-bold text-primary">
                {currentHand.hand.name}
              </div>
              <div className="text-lg text-muted-foreground">
                +{currentHand.totalPoints}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="text-center">
        <span className="text-lg font-medium text-foreground">
          {cards.length}/{maxCards} Cards
        </span>
      </div>
    </div>
  );
}
