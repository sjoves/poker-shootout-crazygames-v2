import React, { useCallback, useRef, useEffect } from 'react';
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

// Show at most 50% of the deck (26 cards), arranged in 5 columns x 5 rows = 25 cards max
const MAX_VISIBLE_CARDS = 25;
const GRID_COLUMNS = 5;
const BUSY_MS = 300;

export function StaticGrid({ deck, selectedCardIds, onSelectCard }: StaticGridProps) {
  const visibleCards = deck.slice(0, MAX_VISIBLE_CARDS);
  const isMobile = useIsMobile();
  const { playSound } = useAudio();

  // Busy flag to prevent multi-touch / ghost taps
  const busyUntilRef = useRef<number>(0);
  // Track hidden cards via ref (reset when deck resets)
  const hiddenCardsRef = useRef<Set<string>>(new Set());
  const prevDeckLengthRef = useRef<number>(deck.length);

  // Reset hidden cards when deck resets (new game)
  useEffect(() => {
    if (deck.length > prevDeckLengthRef.current + 10) {
      // Deck grew significantly — probably a new game
      hiddenCardsRef.current.clear();
    }
    prevDeckLengthRef.current = deck.length;
  }, [deck.length]);

  // Sitting Duck: larger cards on both mobile + desktop
  const cardSize = isMobile ? 'sdm' : 'sd';

  const handleCardPointerDown = useCallback(
    (card: Card, el: HTMLElement, e: React.PointerEvent) => {
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

      // Already selected / already hidden
      if (selectedCardIds.includes(card.id) || hiddenCardsRef.current.has(card.id)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      busyUntilRef.current = now + BUSY_MS;
      hiddenCardsRef.current.add(card.id);

      // Stop all event propagation first
      e.stopPropagation();
      (e.nativeEvent as any)?.stopImmediatePropagation?.();

      // Immediate feedback: kill the card instantly
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';

      playSound('cardSelect');
      onSelectCard(card);

      // No Ghost Taps: prevent click synthesis after pointerdown
      e.preventDefault();
    },
    [onSelectCard, playSound, selectedCardIds]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
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
        {visibleCards.map((card) => {
          const isSelected = selectedCardIds.includes(card.id);

          return (
            <div
              key={card.id}
              onPointerDown={(e) => handleCardPointerDown(card, e.currentTarget as HTMLElement, e)}
              style={{
                willChange: 'transform, opacity',
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
        })}
      </div>
    </motion.div>
  );
}

