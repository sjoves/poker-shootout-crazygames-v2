import { useCallback } from 'react';
import { GameState } from '@/types/game';
import { 
  createDeck, 
  shuffleDeck, 
  calculateLevelGoal,
  getSSCLevelInfo,
  createBonusFriendlyDeck,
} from '@/lib/pokerEngine';

export function useLevelProgression(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  resetHandResults: () => void
) {
  // Start a bonus round (called when pendingBonusRound is true)
  const startBonusRound = useCallback(() => {
    setState(prev => {
      const newBonusRoundCount = prev.bonusRoundCount + 1;
      const deck = createBonusFriendlyDeck(newBonusRoundCount);

      resetHandResults();
      
      return {
        ...prev,
        isBonusLevel: true,
        isBonusFailed: false,
        pendingBonusRound: false,
        bonusRoundCount: newBonusRoundCount,
        isPlaying: true,
        isPaused: false,
        isGameOver: false,
        score: 0,
        rawScore: 0,
        levelScore: 0,
        handsPlayed: 0,
        cardsSelected: 0,
        timeRemaining: 60,
        timeElapsed: 0,
        bonusTimePoints: 0,
        selectedCards: [],
        deck,
        usedCards: [],
        currentHand: null,
        isLevelComplete: false,
        powerUpChoices: [],
        showPowerUpSelection: false,
        previousHandRank: null,
        betterHandStreak: 0,
        currentMultiplier: 1,
        starRating: 0,
      };
    });
  }, [setState, resetHandResults]);

  // Proceed to next numbered level (called after bonus round or directly)
  const nextLevel = useCallback(() => {
    setState(prev => {
      const newLevel = prev.sscLevel + 1;
      const levelInfo = getSSCLevelInfo(newLevel);
      const deck = shuffleDeck(createDeck());

      resetHandResults();

      return {
        ...prev,
        sscLevel: newLevel,
        sscPhase: levelInfo.phase,
        sscRound: levelInfo.round,
        isBonusLevel: false,
        isBonusFailed: false,
        pendingBonusRound: false,
        levelGoal: calculateLevelGoal(newLevel),
        isPlaying: true,
        isPaused: false,
        isGameOver: false,
        score: 0,
        rawScore: 0,
        levelScore: 0,
        handsPlayed: 0,
        cardsSelected: 0,
        timeRemaining: 60,
        timeElapsed: 0,
        timeBonus: 0,
        leftoverPenalty: 0,
        bonusTimePoints: 0,
        selectedCards: [],
        deck,
        usedCards: [],
        currentHand: null,
        isLevelComplete: false,
        powerUpChoices: [],
        showPowerUpSelection: false,
        activePowerUps: [...prev.earnedPowerUps],
        previousHandRank: null,
        betterHandStreak: 0,
        currentMultiplier: 1,
        starRating: 0,
      };
    });
  }, [setState, resetHandResults]);

  const skipBonusRound = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLevelComplete: true,
      isBonusFailed: true,
    }));
  }, [setState]);

  return {
    startBonusRound,
    nextLevel,
    skipBonusRound,
  };
}
