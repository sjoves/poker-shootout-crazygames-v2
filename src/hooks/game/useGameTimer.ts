import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { GameState } from '@/types/game';
import { calculateTimeBonus, calculateLeftoverPenalty, calculateStarRating, shouldTriggerBonusRound } from '@/lib/pokerEngine';

// Ref-based timer that doesn't cause re-renders on every tick
export function useGameTimer(
  state: GameState,
  setState: React.Dispatch<React.SetStateAction<GameState>>
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store time values in refs to avoid re-renders
  const timeRemainingRef = useRef(state.timeRemaining);
  const timeElapsedRef = useRef(state.timeElapsed);
  
  // Subscribers for UI components that need time updates
  const subscribersRef = useRef<Set<() => void>>(new Set());

  // Sync refs when state changes externally (new game, etc.)
  useEffect(() => {
    timeRemainingRef.current = state.timeRemaining;
    timeElapsedRef.current = state.timeElapsed;
  }, [state.timeRemaining, state.timeElapsed]);

  useEffect(() => {
    if (state.isPlaying && !state.isPaused && !state.isGameOver) {
      timerRef.current = setInterval(() => {
        const isBlitz = state.mode === 'blitz_fc' || state.mode === 'blitz_cb';
        const isSSC = state.mode === 'ssc';
        
        if (isBlitz || isSSC) {
          timeRemainingRef.current -= 1;
          timeElapsedRef.current += 1;
          
          // Notify subscribers (UI components)
          subscribersRef.current.forEach(cb => cb());
          
          if (timeRemainingRef.current <= 0) {
            // Game state changes - these DO need React updates
            if (isSSC && state.isBonusLevel) {
              setState(prev => ({ 
                ...prev, 
                timeRemaining: 0, 
                timeElapsed: timeElapsedRef.current,
                isLevelComplete: true, 
                isBonusFailed: true 
              }));
            } else if (isSSC && state.score >= state.levelGoal) {
              const starRating = calculateStarRating(state.score, state.levelGoal);
              const shouldBonus = shouldTriggerBonusRound(state.sscLevel);
              setState(prev => ({
                ...prev,
                timeRemaining: 0,
                timeElapsed: timeElapsedRef.current,
                isLevelComplete: true,
                pendingBonusRound: shouldBonus,
                starRating,
              }));
            } else {
              setState(prev => ({ 
                ...prev, 
                timeRemaining: 0, 
                timeElapsed: timeElapsedRef.current,
                isGameOver: true, 
                isPlaying: false 
              }));
            }
          } else {
            // Sync to state every second for precise timer display
            setState(prev => ({ 
              ...prev, 
              timeRemaining: timeRemainingRef.current,
              timeElapsed: timeElapsedRef.current 
            }));
          }
        } else {
          // Classic mode
          timeElapsedRef.current += 1;
          
          // Notify subscribers
          subscribersRef.current.forEach(cb => cb());
          
          const isClassic = state.mode === 'classic_fc' || state.mode === 'classic_cb';
          
          if (isClassic && timeElapsedRef.current >= 600) {
            const leftoverPenalty = calculateLeftoverPenalty(state.deck);
            const timeBonus = calculateTimeBonus(600);
            const finalScore = state.rawScore + timeBonus - leftoverPenalty;
            
            setState(prev => ({ 
              ...prev, 
              timeElapsed: 600,
              isGameOver: true, 
              isPlaying: false,
              score: finalScore,
              timeBonus,
              leftoverPenalty,
            }));
          } else {
            // Sync to state every second for precise timer display
            setState(prev => ({ ...prev, timeElapsed: timeElapsedRef.current }));
          }
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.isPlaying, state.isPaused, state.isGameOver, state.mode, state.isBonusLevel, state.score, state.levelGoal, state.sscLevel, state.deck, state.rawScore, setState]);

  // Subscribe function for UI components
  const subscribe = useCallback((callback: () => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  // Getters for current time values
  const getTimeRemaining = useCallback(() => timeRemainingRef.current, []);
  const getTimeElapsed = useCallback(() => timeElapsedRef.current, []);

  return {
    timerRef,
    subscribe,
    getTimeRemaining,
    getTimeElapsed,
    timeRemainingRef,
    timeElapsedRef,
  };
}

// Hook for UI components to subscribe to timer updates without causing full game re-renders
export function useTimerDisplay(
  subscribe: (cb: () => void) => () => void,
  getTimeRemaining: () => number,
  getTimeElapsed: () => number
) {
  const timeRemaining = useSyncExternalStore(
    subscribe,
    getTimeRemaining,
    getTimeRemaining
  );
  
  const timeElapsed = useSyncExternalStore(
    subscribe,
    getTimeElapsed,
    getTimeElapsed
  );
  
  return { timeRemaining, timeElapsed };
}
