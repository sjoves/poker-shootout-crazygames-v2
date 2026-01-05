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
  cardSize: 'sdm' | 'sd';
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

  // 5 columns on mobile, 6 on desktop
  const gridColumns = isMobile ? 5 : 6;
  const visibleCards = deck.slice(0, MAX_VISIBLE_CARDS);
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
    <div className="absolute inset-0 flex flex-col">
      {/* Top safe zone for scoreboard - responsive height */}
      <div className="shrink-0 h-16 sm:h-20 md:h-24" />
      
      {/* Fluid card field - expands to fill available space */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-2 sm:px-4 md:px-6 lg:px-8">
        <div
          className="grid w-full max-w-2xl lg:max-w-3xl"
          style={{
            gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
            gap: isMobile ? '0.25rem' : '0.5rem',
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
      
      {/* Bottom safe zone for hand display - responsive height */}
      <div className="shrink-0 h-32 sm:h-36 md:h-40" />
    </div>
  );
}
