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

// Max visible cards and columns are dynamic based on device
const MAX_VISIBLE_CARDS = 25; // Works for both 5x5 and 6x4+

// Memoized card slot - only re-renders when its specific card changes
interface CardSlotProps {
  card: Card;
  cardSize: 'sdm' | 'sdm-lg' | 'sd';
  onPointerDown: (card: Card, e: React.PointerEvent) => void;
}

const CardSlot = memo(
  function CardSlot({ card, cardSize, onPointerDown }: CardSlotProps) {
    return (
      <div
        onPointerDown={(e) => onPointerDown(card, e)}
        className="select-none cursor-pointer touch-none flex items-center justify-center"
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
  const isMobile = useIsMobile();
  const { playSound } = useAudio();

  // 4 columns on mobile (4 rows = 16 cards), 7 on desktop (3 rows)
  const gridColumns = isMobile ? 4 : 7;
  const maxVisibleCards = isMobile ? 16 : 21; // 4x4 on mobile, 7x3 on desktop
  const visibleCards = deck.slice(0, maxVisibleCards);
  const cardSize = isMobile ? 'sdm' : 'sd'; // sdm for 4-row layout on mobile

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
    <div className={`absolute inset-0 flex items-center justify-center px-2 sm:px-4 md:px-6 lg:px-8 ${isMobile ? '-mt-5' : ''}`}>
      <div
        className="grid w-full max-w-2xl lg:max-w-3xl justify-center"
        style={{
          gridTemplateColumns: `repeat(${gridColumns}, auto)`,
          gap: isMobile ? '0.525rem' : '0.75rem',
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
