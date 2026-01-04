import { useEffect, useRef, useCallback } from 'react';
import { useGameStore, useGameActions, useScore, useSelectedCards, useDeck, useGameProgress, usePowerUps } from '@/stores/gameStore';
import { evaluateHand } from '@/lib/pokerEngine';

/**
 * Drop-in replacement for useGameState that uses Zustand store internally.
 * This maintains the same API for backward compatibility while providing
 * atomic state updates and preventing unnecessary re-renders.
 */
export function useGameStateZustand() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeRemainingRef = useRef(60);
  const timeElapsedRef = useRef(0);
  const subscribersRef = useRef<Set<() => void>>(new Set());
  
  // Get state slices with selectors (only re-renders when slice changes)
  const scoreState = useScore();
  const selectedCards = useSelectedCards();
  const deck = useDeck();
  const progress = useGameProgress();
  const powerUpState = usePowerUps();
  
  // Get full state for compatibility (this will cause re-renders on any change)
  const fullState = useGameStore();
  
  // Get actions (these never cause re-renders)
  const actions = useGameActions();
  
  // Timer management
  useEffect(() => {
    if (progress.isPlaying && !progress.isPaused && !progress.isGameOver) {
      timerRef.current = setInterval(() => {
        const isBlitz = progress.mode === 'blitz_fc' || progress.mode === 'blitz_cb';
        const isSSC = progress.mode === 'ssc';
        
        if (isBlitz || isSSC) {
          timeRemainingRef.current -= 1;
          timeElapsedRef.current += 1;
          
          // Notify UI subscribers
          subscribersRef.current.forEach(cb => cb());
          
          if (timeRemainingRef.current <= 0) {
            // Time's up - update store
            useGameStore.setState({ 
              timeRemaining: 0, 
              timeElapsed: timeElapsedRef.current,
              isGameOver: true,
              isPlaying: false,
            });
          } else if (timeElapsedRef.current % 5 === 0) {
            // Sync to store every 5 seconds
            useGameStore.setState({ 
              timeRemaining: timeRemainingRef.current,
              timeElapsed: timeElapsedRef.current,
            });
          }
        } else {
          // Classic mode - count up
          timeElapsedRef.current += 1;
          subscribersRef.current.forEach(cb => cb());
          
          if (timeElapsedRef.current % 5 === 0) {
            useGameStore.setState({ timeElapsed: timeElapsedRef.current });
          }
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [progress.isPlaying, progress.isPaused, progress.isGameOver, progress.mode]);
  
  // Reset timer refs when game starts
  useEffect(() => {
    timeRemainingRef.current = fullState.timeRemaining;
    timeElapsedRef.current = fullState.timeElapsed;
  }, [fullState.timeRemaining, fullState.timeElapsed]);
  
  // Auto-submit hand when 5 cards selected (memoized evaluation)
  useEffect(() => {
    if (selectedCards.length === 5 && progress.isPlaying && !progress.isGameOver) {
      const timer = setTimeout(() => {
        actions.submitHand();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedCards.length, progress.isPlaying, progress.isGameOver, actions]);
  
  // Timer subscription for UI components
  const subscribe = useCallback((callback: () => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  const getTimeRemaining = useCallback(() => timeRemainingRef.current, []);
  const getTimeElapsed = useCallback(() => timeElapsedRef.current, []);
  
  // Hand results tracking (kept in ref to avoid re-renders)
  const handResultsRef = useRef<ReturnType<typeof evaluateHand>[]>([]);
  
  const getHandResults = useCallback(() => handResultsRef.current, []);
  const resetHandResults = useCallback(() => {
    handResultsRef.current = [];
  }, []);

  return {
    // State (for backward compatibility, returns full state object)
    state: fullState,
    
    // All actions
    ...actions,
    
    // Timer subscription
    timerSubscribe: subscribe,
    getTimeRemaining,
    getTimeElapsed,
    
    // Hand results
    getHandResults,
    
    // Additional compatibility methods
    submitBonusHand: (cards: any, result: any, timeRemaining: number) => {
      // Handle bonus hand submission
      const points = result.totalPoints;
      const timeBonusPoints = timeRemaining * 10;
      const totalPoints = points + timeBonusPoints;
      
      handResultsRef.current.push(result);
      
      useGameStore.setState(state => ({
        score: state.score + totalPoints,
        rawScore: state.rawScore + totalPoints,
        levelScore: state.levelScore + totalPoints,
        cumulativeScore: state.cumulativeScore + totalPoints,
        handsPlayed: state.handsPlayed + 1,
        selectedCards: [],
        currentHand: result,
        isLevelComplete: true,
        bonusTimePoints: timeBonusPoints,
      }));
    },
  };
}

// Export selectors for components that want granular updates
export { useScore, useSelectedCards, useDeck, useGameProgress, usePowerUps, useGameActions };
