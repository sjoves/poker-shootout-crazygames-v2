import { useCallback, useEffect, useRef } from 'react';
import { Card, GameState } from '@/types/game';

const LOCK_MS = 500;

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
        // Hard guards: ignore inputs when not in a selectable state
        if (!prev.isPlaying || prev.isPaused || prev.selectedCards.length >= 5) return prev;

        // Global selection lock ("hammer" fix)
        if (prev.isProcessingSelection) return prev;

        // Hand-length recent-change lock (prevents rapid double-processing)
        if (prev.lastHandLengthChangeAt && now - prev.lastHandLengthChangeAt < LOCK_MS) return prev;

        // Check if card is already selected
        if (prev.selectedCards.some((c) => c.id === card.id)) return prev;

        const isBlitz = prev.mode === 'blitz_fc' || prev.mode === 'blitz_cb';
        const isSSC = prev.mode === 'ssc';
        const shouldRecycle = isBlitz || isSSC;

        return {
          ...prev,
          isProcessingSelection: true,
          lastHandLengthChangeAt: now,
          selectedCards: [...prev.selectedCards, card],
          usedCards: shouldRecycle ? prev.usedCards : [...prev.usedCards, card],
          deck: prev.deck.filter((c) => c.id !== card.id),
          cardsSelected: prev.cardsSelected + 1,
        };
      });

      // Release lock after the "hand add" animation window
      if (unlockTimerRef.current) window.clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = window.setTimeout(() => {
        setState((prev) => (prev.isProcessingSelection ? { ...prev, isProcessingSelection: false } : prev));
      }, LOCK_MS);
    },
    [setState]
  );

  return { selectCard };
}

