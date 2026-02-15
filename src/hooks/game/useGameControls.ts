import { useCallback, useRef } from 'react';
import { GameMode, GameState } from '@/types/game';
import { 
  createDeck, 
  shuffleDeck, 
  calculateTimePenalty, 
  calculateLeftoverBonus,
  calculateBlitzFinalScore,
  calculateLevelGoal,
  getSSCLevelInfo,
  createBonusFriendlyDeck,
} from '@/lib/pokerEngine';
import { INITIAL_GAME_STATE } from './gameConstants';

export function useGameControls(
  setState: React.Dispatch<React.SetStateAction<GameState>>,
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  resetHandResults: () => void
) {
  const startGame = useCallback((mode: GameMode, forceBonus: boolean = false, startLevel: number = 1, phaseOverride?: string) => {
    const isBlitz = mode === 'blitz_fc' || mode === 'blitz_cb';
    const isSSC = mode === 'ssc';
    
    const level = isSSC ? startLevel : 1;
    const levelInfo = isSSC ? getSSCLevelInfo(level) : null;
    const isBonusLevel = forceBonus;
    const initialBonusCount = isBonusLevel ? 1 : 0;
    
    const deck = isBonusLevel ? createBonusFriendlyDeck(initialBonusCount) : shuffleDeck(createDeck());

    setState({
      ...INITIAL_GAME_STATE,
      mode,
      deck,
      isPlaying: true,
      timeRemaining: isBlitz ? 60 : (isSSC ? 60 : 9999),
      sscLevel: level,
      sscPhase: levelInfo?.phase || 'sitting_duck',
      sscRound: levelInfo?.round || 1,
      isBonusLevel,
      levelGoal: isSSC ? calculateLevelGoal(level) : 0,
      earnedPowerUps: [],
      activePowerUps: [],
      powerUpChoices: [],
      showPowerUpSelection: false,
      bonusRoundCount: initialBonusCount,
      pendingBonusRound: false,
      phaseOverride,
    });
    resetHandResults();
  }, [setState, resetHandResults]);

  const pauseGame = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, [setState]);

  const setPaused = useCallback((paused: boolean) => {
    setState(prev => ({ ...prev, isPaused: paused }));
  }, [setState]);

  const endGame = useCallback(() => {
    setState(prev => {
      const isBlitz = prev.mode === 'blitz_fc' || prev.mode === 'blitz_cb';
      const isClassic = prev.mode === 'classic_fc' || prev.mode === 'classic_cb';
      
      let finalScore = prev.score;
      let timePenalty = 0;
      let leftoverBonus = 0;

      if (isBlitz) {
        // Blitz: rawScore × handsPlayed × (handsPlayed / 10)
        finalScore = calculateBlitzFinalScore(prev.rawScore, prev.handsPlayed);
      } else if (isClassic) {
        timePenalty = calculateTimePenalty(prev.timeElapsed);
        leftoverBonus = calculateLeftoverBonus(prev.deck);
        finalScore = prev.rawScore - timePenalty + leftoverBonus;
      }

      return {
        ...prev,
        score: finalScore,
        timePenalty,
        leftoverBonus,
        isPlaying: false,
        isGameOver: true,
      };
    });
  }, [setState]);

  const resetGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    resetHandResults();
    setState(INITIAL_GAME_STATE);
  }, [setState, timerRef, resetHandResults]);

  const reshuffleUnselected = useCallback(() => {
    setState(prev => {
      const shuffledDeck = shuffleDeck([...prev.deck]);
      return {
        ...prev,
        deck: shuffledDeck,
      };
    });
  }, [setState]);

  const markExplainerSeen = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasSeenSSCExplainer: true,
    }));
  }, [setState]);

  return {
    startGame,
    pauseGame,
    setPaused,
    endGame,
    resetGame,
    reshuffleUnselected,
    markExplainerSeen,
  };
}
