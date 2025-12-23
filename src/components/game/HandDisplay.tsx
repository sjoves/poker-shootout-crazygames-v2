import { useState, useEffect } from 'react';
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
  const [visibleHand, setVisibleHand] = useState<HandResult | null>(null);

  // Show overlay for 0.5 seconds when a new hand result comes in
  useEffect(() => {
    if (currentHand) {
      setVisibleHand(currentHand);
      const timer = setTimeout(() => {
        setVisibleHand(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentHand]);

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
      
      {/* Hand result overlay - shows for 0.5 seconds */}
      <AnimatePresence>
        {visibleHand && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center z-20"
          >
            <div className="w-full py-4 bg-gradient-to-r from-primary/90 via-primary to-primary/90 shadow-[0_0_30px_hsl(var(--primary)/0.6)] border-y-2 border-primary-foreground/30">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <div className="text-2xl font-bold text-primary-foreground tracking-wide uppercase drop-shadow-lg">
                  {visibleHand.hand.name}
                </div>
                <motion.div 
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 400 }}
                  className="text-3xl font-bold text-gold drop-shadow-[0_0_10px_hsl(var(--gold)/0.8)]"
                >
                  +{visibleHand.totalPoints}
                </motion.div>
              </motion.div>
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
