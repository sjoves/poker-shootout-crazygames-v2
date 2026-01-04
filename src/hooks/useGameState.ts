import { useState, useEffect } from 'react';
import { GameState } from '@/types/game';
import { 
  useGameTimer,
  useCardSelection,
  usePowerUps,
  useHandSubmission,
  useGameControls,
  useLevelProgression,
  INITIAL_GAME_STATE,
  getRewardTier,
  getTierDisplayInfo,
  type RewardTier,
} from './game';

// Re-export for backward compatibility
export { getRewardTier, getTierDisplayInfo, type RewardTier };

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_GAME_STATE);

  // Compose smaller focused hooks
  const timerRef = useGameTimer(state, setState);
  const { selectCard } = useCardSelection(setState);
  const { 
    usePowerUp, 
    claimReward, 
    swapPowerUp, 
    discardReward, 
    selectPowerUp, 
    dismissPowerUpSelection 
  } = usePowerUps(setState);
  const { 
    submitHand, 
    submitBonusHand, 
    getHandResults, 
    resetHandResults 
  } = useHandSubmission(setState);
  const { 
    startGame, 
    pauseGame, 
    setPaused, 
    endGame, 
    resetGame, 
    reshuffleUnselected,
    markExplainerSeen
  } = useGameControls(setState, timerRef, resetHandResults);
  const { 
    startBonusRound, 
    nextLevel, 
    skipBonusRound 
  } = useLevelProgression(setState, resetHandResults);

  // Auto-submit hand when 5 cards selected
  useEffect(() => {
    if (state.selectedCards.length === 5 && state.isPlaying && !state.isGameOver) {
      const timer = setTimeout(() => {
        submitHand();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.selectedCards.length, state.isPlaying, state.isGameOver, submitHand]);

  return {
    state,
    startGame,
    selectCard,
    submitHand,
    submitBonusHand,
    skipBonusRound,
    selectPowerUp,
    dismissPowerUpSelection,
    usePowerUp,
    nextLevel,
    startBonusRound,
    reshuffleUnselected,
    pauseGame,
    setPaused,
    endGame,
    resetGame,
    getHandResults,
    markExplainerSeen,
    // Reward system
    claimReward,
    swapPowerUp,
    discardReward,
  };
}
