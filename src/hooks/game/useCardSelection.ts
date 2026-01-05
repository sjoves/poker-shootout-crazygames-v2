import { useCallback, useEffect, useRef } from 'react';
import { Card, GameState } from '@/types/game';

const LOCK_MS = 500; // Max 500ms lock time

// Consolidated strict sequential lock (synchronous gate across all pick sources)
let lastPickTime = 0;
export function useCardSelection(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  getState?: () => GameState
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

      const snapshot = getState?.();

      // Global synchronous gate (must be first)
      if (now - lastPickTime < 400 || (snapshot?.selectedCards.length ?? 0) >= 5) return;

      // Only advance lastPickTime when we are *actually* going to pick
      if (snapshot) {
        if (!snapshot.isPlaying || snapshot.isPaused) return;

        if (snapshot.isSelectionLocked) {
          const lockAge = snapshot.lastHandLengthChangeAt ? now - snapshot.lastHandLengthChangeAt : 0;
          if (lockAge <= 500) return; // lock is still valid
        }

        if (snapshot.selectedCards.some((c) => c.id === card.id)) return;
      }

      // From here on, we consider it a "successful" pick attempt and block ghosts for 400ms
      lastPickTime = now;

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[useCardSelection] selectCard called', {
          id: card.id,
          t: now,
          lastPickTime,
        });
      }

      setState((prev) => {
        // Hard cap
        if (prev.selectedCards.length >= 5) return prev;

        // Safety check: if hand is incomplete but lock is stuck, force unlock
        if (prev.isSelectionLocked) {
          const lockAge = prev.lastHandLengthChangeAt ? now - prev.lastHandLengthChangeAt : 0;
          if (lockAge <= 500) return prev; // Lock is still valid
          // else: lock is stale; continue and re-lock below
        }

        // Atomic selection gate
        if (!prev.isPlaying || prev.isPaused) {
          // If selection can't proceed, ensure we don't deadlock
          return prev.isSelectionLocked || prev.isProcessingSelection
            ? { ...prev, isSelectionLocked: false, isProcessingSelection: false }
            : prev;
        }

        // Duplicate card? ignore
        if (prev.selectedCards.some((c) => c.id === card.id)) return prev;

        // Lock immediately before any other logic
        const nextStateBase = {
          ...prev,
          isSelectionLocked: true,
          isProcessingSelection: true,
          lastHandLengthChangeAt: now,
        };

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

      // Timed release (always runs)
      if (unlockTimerRef.current) window.clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = window.setTimeout(() => {
        setState((prev) => ({
          ...prev,
          isSelectionLocked: false,
          isProcessingSelection: false,
        }));
      }, LOCK_MS);
    },
    [setState, getState]
  );

  return { selectCard };
}


