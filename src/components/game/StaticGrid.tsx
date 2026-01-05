import React, { useCallback, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/types/game';
import { PlayingCard } from './PlayingCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAudio } from '@/contexts/AudioContext';

interface StaticGridProps {
  deck: Card[];
  selectedCardIds: string[];
  onSelectCard: (card: Card) => void;
}

// Show at most 25 cards in a 5x5 grid
const MAX_VISIBLE_CARDS = 25;
const GRID_COLUMNS = 5;
const BUSY_MS = 80; // Fast response for same-spot clicking

// Memoized card slot - only re-renders when its specific card changes
interface CardSlotProps {
  card: Card;
  isSelected: boolean;
  cardSize: 'sdm' | 'sd';
  onPointerDown: (card: Card, e: React.PointerEvent) => void;
}

const CardSlot = memo(
  function CardSlot({ card, isSelected, cardSize, onPointerDown }: CardSlotProps) {
    return (
      <div
        onPointerDown={(e) => onPointerDown(card, e)}
        style={{
          cursor: isSelected ? 'not-allowed' : 'pointer',
          touchAction: 'none',
        }}
        className="select-none"
      >
        <PlayingCard
          card={card}
          isSelected={isSelected}
          isDisabled={isSelected}
          size={cardSize}
          animate={false}
          className="pointer-events-none"
        />
      </div>
    );
  },
  // Custom comparison: only re-render if card.id or isSelected changes
  (prev, next) =>
    prev.card.id === next.card.id &&
    prev.isSelected === next.isSelected &&
    prev.cardSize === next.cardSize
);

export function StaticGrid({ deck, selectedCardIds, onSelectCard }: StaticGridProps) {
  // Simply slice the first 25 cards - deck changes will auto-fill slots
  const visibleCards = deck.slice(0, MAX_VISIBLE_CARDS);
  const isMobile = useIsMobile();
  const { playSound } = useAudio();

  // Busy flag to prevent multi-touch / ghost taps
  const busyUntilRef = useRef<number>(0);

  // Sitting Duck: larger cards on both mobile + desktop
  const cardSize = isMobile ? 'sdm' : 'sd';

  const handleCardPointerDown = useCallback(
    (card: Card, e: React.PointerEvent) => {
      // Global hand guard
      if (selectedCardIds.length >= 5) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Prevent ghost taps: block if busy
      const now = performance.now();
      if (now < busyUntilRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Already selected
      if (selectedCardIds.includes(card.id)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      busyUntilRef.current = now + BUSY_MS;

      // Stop all event propagation
      e.stopPropagation();
      (e.nativeEvent as any)?.stopImmediatePropagation?.();

      // Optimistic: play sound immediately
      playSound('cardSelect');
      
      // Trigger selection (store update is synchronous)
      onSelectCard(card);

      // Prevent click synthesis after pointerdown
      e.preventDefault();
    },
    [onSelectCard, playSound, selectedCardIds]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 flex items-center justify-center"
      style={{ paddingTop: '5rem', paddingBottom: '9rem' }}
    >
      <div
        className="grid p-2 sm:p-4"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
          gap: isMobile ? '0.37rem' : '0.67rem',
        }}
      >
        {visibleCards.map((card, index) => (
          <CardSlot
            key={`slot-${index}`}
            card={card}
            isSelected={selectedCardIds.includes(card.id)}
            cardSize={cardSize}
            onPointerDown={handleCardPointerDown}
          />
        ))}
      </div>
    </motion.div>
  );
}
