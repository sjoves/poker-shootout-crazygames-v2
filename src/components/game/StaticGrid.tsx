import React, { useCallback, memo } from 'react';
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

// Memoized card slot - only re-renders when its specific card changes
interface CardSlotProps {
  card: Card;
  cardSize: 'sdm' | 'sd';
  onPointerDown: (card: Card, e: React.PointerEvent) => void;
}

const CardSlot = memo(
  function CardSlot({ card, cardSize, onPointerDown }: CardSlotProps) {
    return (
      <div
        onPointerDown={(e) => onPointerDown(card, e)}
        style={{
          cursor: 'pointer',
          touchAction: 'none',
        }}
        className="select-none"
      >
        <PlayingCard
          card={card}
          isSelected={false}
          isDisabled={false}
          size={cardSize}
          animate={false}
          className="pointer-events-none"
        />
      </div>
    );
  },
  // Only re-render if the card in this slot changes
  (prev, next) => prev.card.id === next.card.id && prev.cardSize === next.cardSize
);

export function StaticGrid({ deck, selectedCardIds, onSelectCard }: StaticGridProps) {
  const visibleCards = deck.slice(0, MAX_VISIBLE_CARDS);
  const isMobile = useIsMobile();
  const { playSound } = useAudio();

  const cardSize = isMobile ? 'sdm' : 'sd';

  // Simple handler - let the store handle all validation
  const handleCardPointerDown = useCallback(
    (card: Card, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.nativeEvent as any)?.stopImmediatePropagation?.();

      playSound('cardSelect');
      onSelectCard(card);
    },
    [onSelectCard, playSound]
  );

  return (
    <div
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
            cardSize={cardSize}
            onPointerDown={handleCardPointerDown}
          />
        ))}
      </div>
    </div>
  );
}
