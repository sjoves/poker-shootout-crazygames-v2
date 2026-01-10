import { useCallback, useRef } from 'react';
import { Card, GameState, HandResult } from '@/types/game';
import { 
  evaluateHand, 
  calculateTimeBonus, 
  calculateLeftoverPenalty,
  calculateStarRating,
  shouldTriggerBonusRound,
  getBetterHandMultiplier
} from '@/lib/pokerEngine';
import { getRewardTier, selectRewardPowerUp } from './usePowerUps';

export function useHandSubmission(
  setState: React.Dispatch<React.SetStateAction<GameState>>
) {
  const handResultsRef = useRef<HandResult[]>([]);

  const submitHand = useCallback(() => {
    setState(prev => {
      if (prev.selectedCards.length !== 5) return prev;

      const result = evaluateHand(prev.selectedCards);
      
      // Check if in final stretch (last 10 seconds for Blitz/SSC)
      const isBlitz = prev.mode === 'blitz_fc' || prev.mode === 'blitz_cb';
      const isSSC = prev.mode === 'ssc';
      const inFinalStretch = (isBlitz || isSSC) && prev.timeRemaining <= 10 && prev.timeRemaining > 0;
      const finalStretchMultiplier = inFinalStretch ? 2 : 1;
      
      // Calculate Better-Hand multiplier for SSC mode
      let betterHandMultiplier = 1;
      let newBetterHandStreak = 0;
      let newPreviousHandRank = result.hand.rank;
      
      if (isSSC && !prev.isBonusLevel) {
        if (prev.previousHandRank !== null && result.hand.rank < prev.previousHandRank) {
          newBetterHandStreak = prev.betterHandStreak + 1;
          betterHandMultiplier = getBetterHandMultiplier(newBetterHandStreak);
        } else if (prev.previousHandRank !== null) {
          newBetterHandStreak = 0;
          betterHandMultiplier = 1;
        }
      }
      
      // Apply multipliers for display/live score
      let multipliedPoints = result.totalPoints;
      multipliedPoints = Math.floor(multipliedPoints * betterHandMultiplier);
      if (inFinalStretch) {
        multipliedPoints = Math.floor(multipliedPoints * finalStretchMultiplier);
      }
      
      const modifiedResult = {
        ...result,
        totalPoints: multipliedPoints,
      };
      
      handResultsRef.current.push(modifiedResult);

      const newHandsPlayed = prev.handsPlayed + 1;
      
      // For Blitz: rawScore stores BASE points (before final stretch multiplier)
      // This is used for final score calculation: rawScore × handsPlayed
      const basePointsForRaw = isBlitz 
        ? result.totalPoints  // Original points without final stretch multiplier
        : multipliedPoints;   // For other modes, use multiplied points
      
      const newRawScore = prev.rawScore + basePointsForRaw;
      const newScore = prev.score + multipliedPoints;
      const newLevelScore = prev.levelScore + multipliedPoints;
      const newCumulativeScore = prev.cumulativeScore + multipliedPoints;

      const shouldRecycle = isBlitz || isSSC;
      const recycledDeck = shouldRecycle 
        ? [...prev.deck, ...prev.selectedCards] 
        : prev.deck;

      const isClassic = prev.mode === 'classic_fc' || prev.mode === 'classic_cb';
      const classicGameOver = isClassic && newHandsPlayed >= 10;

      // For SSC, check if level is complete
      if (prev.mode === 'ssc' && newScore >= prev.levelGoal) {
        const starRating = calculateStarRating(newScore, prev.levelGoal);
        const shouldBonus = shouldTriggerBonusRound(prev.sscLevel);
        return {
          ...prev,
          score: newScore,
          rawScore: newRawScore,
          levelScore: newLevelScore,
          cumulativeScore: newCumulativeScore,
          handsPlayed: newHandsPlayed,
          selectedCards: [],
          currentHand: modifiedResult,
          isLevelComplete: true,
          pendingBonusRound: shouldBonus,
          deck: recycledDeck,
          previousHandRank: newPreviousHandRank,
          betterHandStreak: newBetterHandStreak,
          currentMultiplier: betterHandMultiplier,
          starRating,
        };
      }

      // If classic game is over, calculate bonuses and penalties
      if (classicGameOver) {
        const leftoverPenalty = calculateLeftoverPenalty(prev.deck);
        const timeBonus = calculateTimeBonus(prev.timeElapsed);
        const finalScore = newRawScore + timeBonus - leftoverPenalty;
        
        return {
          ...prev,
          score: finalScore,
          rawScore: newRawScore,
          timeBonus,
          leftoverPenalty,
          handsPlayed: newHandsPlayed,
          selectedCards: [],
          currentHand: modifiedResult,
          isGameOver: true,
        };
      }

      return {
        ...prev,
        score: newScore,
        rawScore: newRawScore,
        levelScore: newLevelScore,
        cumulativeScore: newCumulativeScore,
        handsPlayed: newHandsPlayed,
        selectedCards: [],
        currentHand: modifiedResult,
        deck: recycledDeck,
        isGameOver: false,
        previousHandRank: newPreviousHandRank,
        betterHandStreak: newBetterHandStreak,
        currentMultiplier: betterHandMultiplier,
      };
    });
  }, [setState]);

  const submitBonusHand = useCallback((cards: Card[], result: HandResult, timeRemaining: number) => {
    setState(prev => {
      const points = result.totalPoints;
      const timeBonusPoints = timeRemaining * 10;
      
      handResultsRef.current.push(result);

      const totalPoints = points + timeBonusPoints;
      const newScore = prev.score + totalPoints;
      const newRawScore = prev.rawScore + totalPoints;
      const newLevelScore = prev.levelScore + totalPoints;
      const newCumulativeScore = prev.cumulativeScore + totalPoints;

      const tier = getRewardTier(totalPoints);
      const rewardPowerUp = selectRewardPowerUp(totalPoints);

      return {
        ...prev,
        score: newScore,
        rawScore: newRawScore,
        levelScore: newLevelScore,
        cumulativeScore: newCumulativeScore,
        handsPlayed: prev.handsPlayed + 1,
        selectedCards: [],
        currentHand: result,
        isLevelComplete: true,
        bonusTimePoints: timeBonusPoints,
        pendingReward: rewardPowerUp,
        rewardTier: tier,
        showLootBox: rewardPowerUp !== null,
        inventoryFull: false,
        powerUpChoices: [],
        showPowerUpSelection: false,
      };
    });
  }, [setState]);

  const getHandResults = useCallback(() => handResultsRef.current, []);

  const resetHandResults = useCallback(() => {
    handResultsRef.current = [];
  }, []);

  return {
    submitHand,
    submitBonusHand,
    getHandResults,
    resetHandResults,
  };
}
