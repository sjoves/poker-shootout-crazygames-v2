import { useCallback, useEffect, useRef } from 'react';
import { Card, GameState } from '@/types/game';

const LOCK_MS = 500; // Max 500ms lock time

// ============= DEBUG INSTRUMENTATION =============
const isDebugInput = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debugInput');

interface SelectionDebugEvent {
  seq: number;
  action: string;
  cardId: string;
  reason?: string;
  selectedCount?: number;
  isLocked?: boolean;
  lockAge?: number;
  perfNow: number;
  dateNow: number;
  lastPickTime?: number;
  timeSinceLastPick?: number;
}

let selectionDebugSeq = 0;
const selectionDebugLog: SelectionDebugEvent[] = [];
const MAX_SELECTION_LOG = 100;

function logSelectionEvent(event: Omit<SelectionDebugEvent, 'seq' | 'perfNow' | 'dateNow'>) {
  if (!isDebugInput) return;
  const entry: SelectionDebugEvent = {
    ...event,
    seq: ++selectionDebugSeq,
    perfNow: performance.now(),
    dateNow: Date.now(),
  };
  selectionDebugLog.push(entry);
  if (selectionDebugLog.length > MAX_SELECTION_LOG) selectionDebugLog.shift();
  // eslint-disable-next-line no-console
  console.log(`[SELECTION ${entry.seq}] ${entry.action} | ${entry.cardId}`, entry);
}

// Expose debug log to console
if (isDebugInput && typeof window !== 'undefined') {
  (window as any).__selectionDebugLog = selectionDebugLog;
}
// ============= END DEBUG INSTRUMENTATION =============

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
      const timeSinceLastPick = now - lastPickTime;

      const snapshot = getState?.();
      const selectedCount = snapshot?.selectedCards.length ?? 0;

      // Debug: log every invocation
      logSelectionEvent({
        action: 'selectCard_enter',
        cardId: card.id,
        selectedCount,
        lastPickTime,
        timeSinceLastPick,
        isLocked: snapshot?.isSelectionLocked,
      });

      // Global synchronous gate (must be first)
      if (timeSinceLastPick < 400) {
        logSelectionEvent({ action: 'BLOCKED_time_gate', cardId: card.id, timeSinceLastPick, lastPickTime });
        return;
      }
      if (selectedCount >= 5) {
        logSelectionEvent({ action: 'BLOCKED_hand_full', cardId: card.id, selectedCount });
        return;
      }

      // Only advance lastPickTime when we are *actually* going to pick
      if (snapshot) {
        if (!snapshot.isPlaying || snapshot.isPaused) {
          logSelectionEvent({ action: 'BLOCKED_not_playing', cardId: card.id });
          return;
        }

        if (snapshot.isSelectionLocked) {
          const lockAge = snapshot.lastHandLengthChangeAt ? now - snapshot.lastHandLengthChangeAt : 0;
          if (lockAge <= 500) {
            logSelectionEvent({ action: 'BLOCKED_selection_locked', cardId: card.id, lockAge });
            return;
          }
        }

        if (snapshot.selectedCards.some((c) => c.id === card.id)) {
          logSelectionEvent({ action: 'BLOCKED_already_selected', cardId: card.id });
          return;
        }
      }

      // From here on, we consider it a "successful" pick attempt and block ghosts for 400ms
      lastPickTime = now;

      logSelectionEvent({
        action: 'ACCEPTED_pick',
        cardId: card.id,
        selectedCount,
        timeSinceLastPick,
      });

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


