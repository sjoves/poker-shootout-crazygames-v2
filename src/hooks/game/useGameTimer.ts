import { useEffect, useRef } from 'react';
import { GameState } from '@/types/game';
import { calculateTimeBonus, calculateLeftoverPenalty, calculateStarRating, shouldTriggerBonusRound } from '@/lib/pokerEngine';

export function useGameTimer(
  state: GameState,
  setState: React.Dispatch<React.SetStateAction<GameState>>
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (state.isPlaying && !state.isPaused && !state.isGameOver) {
      timerRef.current = setInterval(() => {
        setState(prev => {
          const isBlitz = prev.mode === 'blitz_fc' || prev.mode === 'blitz_cb';
          const isSSC = prev.mode === 'ssc';
          
          if (isBlitz || isSSC) {
            const newTimeRemaining = prev.timeRemaining - 1;
            if (newTimeRemaining <= 0) {
              // For bonus rounds in SSC, time running out doesn't cause game over
              if (isSSC && prev.isBonusLevel) {
                return { 
                  ...prev, 
                  timeRemaining: 0, 
                  isLevelComplete: true, 
                  isBonusFailed: true 
                };
              }
              // For regular SSC levels, if goal is already met, complete the level instead of game over
              if (isSSC && prev.score >= prev.levelGoal) {
                const starRating = calculateStarRating(prev.score, prev.levelGoal);
                const shouldBonus = shouldTriggerBonusRound(prev.sscLevel);
                return {
                  ...prev,
                  timeRemaining: 0,
                  isLevelComplete: true,
                  pendingBonusRound: shouldBonus,
                  starRating,
                };
              }
              return { ...prev, timeRemaining: 0, isGameOver: true, isPlaying: false };
            }
            return { ...prev, timeRemaining: newTimeRemaining, timeElapsed: prev.timeElapsed + 1 };
          }
          
          // Classic mode: end game if time exceeds 10 minutes (600 seconds)
          const isClassic = prev.mode === 'classic_fc' || prev.mode === 'classic_cb';
          const newTimeElapsed = prev.timeElapsed + 1;
          
          if (isClassic && newTimeElapsed >= 600) {
            const leftoverPenalty = calculateLeftoverPenalty(prev.deck);
            const timeBonus = calculateTimeBonus(600);
            const finalScore = prev.rawScore + timeBonus - leftoverPenalty;
            
            return { 
              ...prev, 
              timeElapsed: 600,
              isGameOver: true, 
              isPlaying: false,
              score: finalScore,
              timeBonus,
              leftoverPenalty,
            };
          }
          
          return { ...prev, timeElapsed: newTimeElapsed };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.isPlaying, state.isPaused, state.isGameOver, setState]);

  return timerRef;
}
