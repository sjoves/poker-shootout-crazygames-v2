import { useCallback, useEffect, useRef } from 'react';
import { Card, GameState } from '@/types/game';

const LOCK_MS = 800;

export function useCardSelection(
  setState: React.Dispatch<React.SetStateAction<GameState>>
) {
  const unlockTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) window.clearTimeout(unlockTimerRef.current);
    };
  }, []);

  const selectCard = useCallback(
    (card: Card) => {
      const now = Date.now();

      setState((prev) => {
        // Atomic selection gate ("synchronous queue")
        if (prev.isSelectionLocked || prev.selectedCards.length >= 5) return prev;
        if (!prev.isPlaying || prev.isPaused) return prev;

        // Lock immediately before any other logic
        const nextStateBase = {
          ...prev,
          isSelectionLocked: true,
          // Keep these for compatibility/diagnostics
          isProcessingSelection: true,
          lastHandLengthChangeAt: now,
        };

        // Duplicate card? Keep lock (released by timeout) but don't mutate hand.
        if (prev.selectedCards.some((c) => c.id === card.id)) return nextStateBase;

        const isBlitz = prev.mode === 'blitz_fc' || prev.mode === 'blitz_cb';
        const isSSC = prev.mode === 'ssc';
        const shouldRecycle = isBlitz || isSSC;

        return {
          ...nextStateBase,
          selectedCards: [...prev.selectedCards, card],
          usedCards: shouldRecycle ? prev.usedCards : [...prev.usedCards, card],
          deck: prev.deck.filter((c) => c.id !== card.id),
          cardsSelected: prev.cardsSelected + 1,
        };
      });

      // Timed release (must run after we attempted selection)
      if (unlockTimerRef.current) window.clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = window.setTimeout(() => {
        setState((prev) =>
          prev.isSelectionLocked || prev.isProcessingSelection
            ? { ...prev, isSelectionLocked: false, isProcessingSelection: false }
            : prev
        );
      }, LOCK_MS);
    },
    [setState]
  );

  return { selectCard };
}

