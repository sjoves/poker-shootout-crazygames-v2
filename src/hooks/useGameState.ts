import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, GameMode, GameState, HandResult, SSCPhase, POWER_UPS } from '@/types/game';
import { 
  createDeck, 
  shuffleDeck, 
  evaluateHand, 
  calculateTimeBonus, 
  calculateLeftoverPenalty,
  calculateLevelGoal,
  getSSCPhase,
  generateSpecificHand
} from '@/lib/pokerEngine';

const INITIAL_STATE: GameState = {
  mode: 'classic_fc',
  score: 0,
  handsPlayed: 0,
  cardsSelected: 0,
  timeElapsed: 0,
  timeRemaining: 60,
  isPlaying: false,
  isPaused: false,
  isGameOver: false,
  selectedCards: [],
  deck: [],
  usedCards: [],
  currentHand: null,
  sscLevel: 1,
  sscPhase: 'static',
  levelGoal: 1000,
  unlockedPowerUps: [],
  activePowerUps: [],
};

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handResultsRef = useRef<HandResult[]>([]);

  const startGame = useCallback((mode: GameMode) => {
    const deck = shuffleDeck(createDeck());
    const isBlitz = mode === 'blitz_fc' || mode === 'blitz_cb';
    const isSSC = mode === 'ssc';
    
    const unlockedPowerUps = isSSC 
      ? POWER_UPS.filter(p => p.unlockedAtLevel <= 1).map(p => p.id)
      : [];

    setState({
      ...INITIAL_STATE,
      mode,
      deck,
      isPlaying: true,
      timeRemaining: isBlitz ? 60 : (isSSC ? 60 : 9999),
      sscLevel: 1,
      sscPhase: 'static',
      levelGoal: isSSC ? calculateLevelGoal(1) : 0,
      unlockedPowerUps,
      activePowerUps: [...unlockedPowerUps],
    });
    handResultsRef.current = [];
  }, []);

  const selectCard = useCallback((card: Card) => {
    setState(prev => {
      if (!prev.isPlaying || prev.isPaused || prev.selectedCards.length >= 5) {
        return prev;
      }
      
      // Check if card is already selected
      if (prev.selectedCards.some(c => c.id === card.id)) {
        return prev;
      }

      const newSelectedCards = [...prev.selectedCards, card];
      const newUsedCards = [...prev.usedCards, card];
      const newDeck = prev.deck.filter(c => c.id !== card.id);

      return {
        ...prev,
        selectedCards: newSelectedCards,
        usedCards: newUsedCards,
        deck: newDeck,
        cardsSelected: prev.cardsSelected + 1,
      };
    });
  }, []);

  const submitHand = useCallback(() => {
    setState(prev => {
      if (prev.selectedCards.length !== 5) return prev;

      const result = evaluateHand(prev.selectedCards);
      handResultsRef.current.push(result);

      const newHandsPlayed = prev.handsPlayed + 1;
      const newScore = prev.score + result.totalPoints;

      // Check if game ends for Classic modes (when deck runs out of cards for another hand)
      const isClassic = prev.mode === 'classic_fc' || prev.mode === 'classic_cb';
      const isGameOver = isClassic && prev.deck.length < 5;

      // For SSC, check if level is complete
      if (prev.mode === 'ssc') {
        if (newScore >= prev.levelGoal) {
          // Level complete - will be handled separately
        }
      }

      return {
        ...prev,
        score: newScore,
        handsPlayed: newHandsPlayed,
        selectedCards: [],
        currentHand: result,
        isGameOver,
      };
    });
  }, []);

  const usePowerUp = useCallback((powerUpId: string) => {
    setState(prev => {
      if (!prev.activePowerUps.includes(powerUpId)) return prev;

      const powerUp = POWER_UPS.find(p => p.id === powerUpId);
      if (!powerUp) return prev;

      if (powerUp.id === 'add_time') {
        return {
          ...prev,
          timeRemaining: prev.timeRemaining + 15,
        };
      }

      // Generate the specific hand
      const hand = generateSpecificHand(powerUp.handType, prev.deck);
      if (!hand) return prev;

      const newDeck = prev.deck.filter(c => !hand.some(h => h.id === c.id));
      const newActivePowerUps = powerUp.isReusable 
        ? prev.activePowerUps 
        : prev.activePowerUps.filter(id => id !== powerUpId);

      return {
        ...prev,
        selectedCards: hand,
        deck: newDeck,
        usedCards: [...prev.usedCards, ...hand],
        activePowerUps: newActivePowerUps,
      };
    });
  }, []);

  const nextLevel = useCallback(() => {
    setState(prev => {
      const newLevel = prev.sscLevel + 1;
      const deck = shuffleDeck(createDeck());
      const newPhase = getSSCPhase(newLevel);
      const newUnlocked = POWER_UPS.filter(p => p.unlockedAtLevel <= newLevel).map(p => p.id);

      return {
        ...prev,
        sscLevel: newLevel,
        sscPhase: newPhase,
        levelGoal: calculateLevelGoal(newLevel),
        score: 0,
        handsPlayed: 0,
        timeRemaining: 60,
        timeElapsed: 0,
        selectedCards: [],
        deck,
        usedCards: [],
        currentHand: null,
        unlockedPowerUps: newUnlocked,
        activePowerUps: [...newUnlocked],
      };
    });
  }, []);

  const pauseGame = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  const endGame = useCallback(() => {
    setState(prev => {
      let finalScore = prev.score;

      // Apply time bonus for Classic modes
      if (prev.mode === 'classic_fc' || prev.mode === 'classic_cb') {
        finalScore += calculateTimeBonus(prev.timeElapsed);
      }

      // Apply leftover penalty for Classic FC
      if (prev.mode === 'classic_fc') {
        finalScore -= calculateLeftoverPenalty(prev.deck);
      }

      return {
        ...prev,
        score: Math.max(0, finalScore),
        isPlaying: false,
        isGameOver: true,
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    handResultsRef.current = [];
    setState(INITIAL_STATE);
  }, []);

  const getHandResults = useCallback(() => handResultsRef.current, []);

  // Timer effect
  useEffect(() => {
    if (state.isPlaying && !state.isPaused && !state.isGameOver) {
      timerRef.current = setInterval(() => {
        setState(prev => {
          const isBlitz = prev.mode === 'blitz_fc' || prev.mode === 'blitz_cb';
          const isSSC = prev.mode === 'ssc';
          
          if (isBlitz || isSSC) {
            const newTimeRemaining = prev.timeRemaining - 1;
            if (newTimeRemaining <= 0) {
              return { ...prev, timeRemaining: 0, isGameOver: true, isPlaying: false };
            }
            return { ...prev, timeRemaining: newTimeRemaining, timeElapsed: prev.timeElapsed + 1 };
          }
          
          return { ...prev, timeElapsed: prev.timeElapsed + 1 };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.isPlaying, state.isPaused, state.isGameOver]);

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
    usePowerUp,
    nextLevel,
    pauseGame,
    endGame,
    resetGame,
    getHandResults,
  };
}
