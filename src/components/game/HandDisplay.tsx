import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, HandResult } from '@/types/game';
import { PlayingCard, EmptyCardSlot } from './PlayingCard';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface HandDisplayProps {
  cards: Card[];
  maxCards?: number;
  currentHand?: HandResult | null;
  className?: string;
}

export function HandDisplay({ cards, maxCards = 5, currentHand, className }: HandDisplayProps) {
  const slots = Array(maxCards).fill(null);
  const [visibleHand, setVisibleHand] = useState<HandResult | null>(null);
  const isMobile = useIsMobile();

  // Show overlay for 0.75 seconds when a new hand result comes in
  useEffect(() => {
    if (currentHand) {
      setVisibleHand(currentHand);
      const timer = setTimeout(() => {
        setVisibleHand(null);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [currentHand]);

  // Use smaller cards on mobile, 'hand' size on desktop (30% smaller than lg)
  const cardSize = isMobile ? 'sm' : 'hand';

  return (
    <div className={cn('relative flex flex-col items-center gap-1 sm:gap-2 flex-shrink-0', className)}>
      <div className="bg-transparent rounded-2xl px-3 py-2 sm:px-4 sm:py-3 border border-primary">
        <div className="relative">
          <div className="flex gap-1 sm:gap-2 justify-center">
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
                      <PlayingCard card={card} size={cardSize} isDisabled animate={false} />
                    ) : (
                      <EmptyCardSlot size={cardSize} />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        
          {/* Hand result overlay - shows for 0.75 seconds */}
          <AnimatePresence>
            {visibleHand && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center z-20 rounded-xl overflow-hidden bg-gradient-to-br from-primary/95 via-primary/90 to-primary/95 shadow-[0_0_40px_hsl(var(--primary)/0.5)]"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                  className="text-center px-2"
                >
                  <div className="text-lg sm:text-2xl font-bold text-primary-foreground tracking-wide uppercase drop-shadow-lg">
                    {visibleHand.hand.name}
                  </div>
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 400 }}
                    className="text-2xl sm:text-4xl font-bold text-black drop-shadow-lg"
                  >
                    +{visibleHand.totalPoints}
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
