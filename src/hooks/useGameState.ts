import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, GameMode, GameState, HandResult, SSCPhase, POWER_UPS } from '@/types/game';
import { 
  createDeck, 
  shuffleDeck, 
  evaluateHand, 
  calculateTimeBonus, 
  calculateLeftoverPenalty,
  calculateLevelGoal,
  getSSCLevelInfo,
  generateSpecificHand,
  createBonusFriendlyDeck
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
  isLevelComplete: false,
  isBonusLevel: false,
  selectedCards: [],
  deck: [],
  usedCards: [],
  currentHand: null,
  sscLevel: 1,
  sscPhase: 'static',
  sscRound: 1,
  pointMultiplier: 1,
  levelGoal: 1000,
  unlockedPowerUps: [],
  activePowerUps: [],
  rawScore: 0,
  timeBonus: 0,
  leftoverPenalty: 0,
  bonusRoundCount: 0,
  bonusTimePoints: 0,
  levelScore: 0,
  cumulativeScore: 0,
};

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handResultsRef = useRef<HandResult[]>([]);

  const startGame = useCallback((mode: GameMode, forceBonus: boolean = false, startLevel: number = 1) => {
    const isBlitz = mode === 'blitz_fc' || mode === 'blitz_cb';
    const isSSC = mode === 'ssc';
    
    // Use startLevel for SSC mode (for replay functionality)
    const level = isSSC ? startLevel : 1;
    
    const unlockedPowerUps = isSSC 
      ? POWER_UPS.filter(p => p.unlockedAtLevel <= level).map(p => p.id)
      : [];
    
    const levelInfo = isSSC ? getSSCLevelInfo(level) : null;
    const isBonusLevel = forceBonus || (levelInfo?.isBonus || false);
    const initialBonusCount = isBonusLevel ? 1 : 0;
    
    // Use bonus-friendly deck for bonus rounds
    const deck = isBonusLevel ? createBonusFriendlyDeck(initialBonusCount) : shuffleDeck(createDeck());

    setState({
      ...INITIAL_STATE,
      mode,
      deck,
      isPlaying: true,
      timeRemaining: isBlitz ? 60 : (isSSC ? 60 : 9999),
      sscLevel: level,
      sscPhase: levelInfo?.phase || 'static',
      sscRound: levelInfo?.round || 1,
      pointMultiplier: forceBonus ? 2 : (levelInfo?.pointMultiplier || 1),
      isBonusLevel,
      levelGoal: isSSC ? calculateLevelGoal(level) : 0,
      unlockedPowerUps,
      activePowerUps: [...unlockedPowerUps],
      bonusRoundCount: initialBonusCount,
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
      
      // For Blitz and SSC, cards recycle back into the deck so players never run out
      // Classic modes remove cards from the deck
      const isBlitz = prev.mode === 'blitz_fc' || prev.mode === 'blitz_cb';
      const isSSC = prev.mode === 'ssc';
      const shouldRecycle = isBlitz || isSSC;
      
      // Remove from deck for now (recycling happens after hand submission)
      const newDeck = prev.deck.filter(c => c.id !== card.id);

      return {
        ...prev,
        selectedCards: newSelectedCards,
        usedCards: shouldRecycle ? prev.usedCards : newUsedCards, // Only track used cards for non-recycling modes
        deck: newDeck,
        cardsSelected: prev.cardsSelected + 1,
      };
    });
  }, []);

  const submitHand = useCallback(() => {
    setState(prev => {
      if (prev.selectedCards.length !== 5) return prev;

      const result = evaluateHand(prev.selectedCards);
      
      // Check if in final stretch (last 10 seconds for Blitz/SSC)
      const isBlitz = prev.mode === 'blitz_fc' || prev.mode === 'blitz_cb';
      const isSSC = prev.mode === 'ssc';
      const inFinalStretch = (isBlitz || isSSC) && prev.timeRemaining <= 10 && prev.timeRemaining > 0;
      const finalStretchMultiplier = inFinalStretch ? 2 : 1;
      
      // Apply point multiplier for SSC mode + final stretch bonus
      let multipliedPoints = result.totalPoints;
      if (isSSC) {
        multipliedPoints = Math.floor(multipliedPoints * prev.pointMultiplier);
      }
      if (inFinalStretch) {
        multipliedPoints = Math.floor(multipliedPoints * finalStretchMultiplier);
      }
      
      const modifiedResult = {
        ...result,
        totalPoints: multipliedPoints,
      };
      
      handResultsRef.current.push(modifiedResult);

      const newHandsPlayed = prev.handsPlayed + 1;
      const newRawScore = prev.rawScore + multipliedPoints;
      const newScore = prev.score + multipliedPoints;
      const newLevelScore = prev.levelScore + multipliedPoints;
      const newCumulativeScore = prev.cumulativeScore + multipliedPoints;

      // Determine if cards should be recycled back into deck
      const shouldRecycle = isBlitz || isSSC;
      
      // Recycle cards back into deck for Blitz and SSC modes
      const recycledDeck = shouldRecycle 
        ? [...prev.deck, ...prev.selectedCards] 
        : prev.deck;

      // Check if game ends for Classic modes (after 10 hands = 50 cards used, 2 remaining)
      const isClassic = prev.mode === 'classic_fc' || prev.mode === 'classic_cb';
      const classicGameOver = isClassic && newHandsPlayed >= 10;

      // For SSC, check if level is complete
      if (prev.mode === 'ssc' && newScore >= prev.levelGoal) {
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
          deck: recycledDeck,
        };
      }

      // If classic game is over, calculate bonuses and penalties
      if (classicGameOver) {
        const leftoverPenalty = calculateLeftoverPenalty(prev.deck);
        const timeBonus = calculateTimeBonus(prev.timeElapsed);
        // Allow negative scores
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
      };
    });
  }, []);

  const submitBonusHand = useCallback((cards: Card[], result: HandResult, timeRemaining: number) => {
    setState(prev => {
      // Apply point multiplier for bonus round
      const multipliedPoints = Math.floor(result.totalPoints * prev.pointMultiplier);
      
      // Calculate time bonus: 10 points per second remaining
      const timeBonusPoints = timeRemaining * 10;
      
      const modifiedResult = {
        ...result,
        totalPoints: multipliedPoints,
      };
      
      handResultsRef.current.push(modifiedResult);

      const totalPoints = multipliedPoints + timeBonusPoints;
      const newScore = prev.score + totalPoints;
      const newRawScore = prev.rawScore + totalPoints;
      const newLevelScore = prev.levelScore + totalPoints;
      const newCumulativeScore = prev.cumulativeScore + totalPoints;

      // Bonus round completes after one hand submission
      return {
        ...prev,
        score: newScore,
        rawScore: newRawScore,
        levelScore: newLevelScore,
        cumulativeScore: newCumulativeScore,
        handsPlayed: prev.handsPlayed + 1,
        selectedCards: [],
        currentHand: modifiedResult,
        isLevelComplete: true,
        bonusTimePoints: timeBonusPoints, // Store for display
      };
    });
  }, []);

  const skipBonusRound = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLevelComplete: true,
    }));
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
      const levelInfo = getSSCLevelInfo(newLevel);
      const newUnlocked = POWER_UPS.filter(p => p.unlockedAtLevel <= newLevel).map(p => p.id);

      // Increment bonus round count if entering a bonus level
      const newBonusRoundCount = levelInfo.isBonus ? prev.bonusRoundCount + 1 : prev.bonusRoundCount;
      
      // Use bonus-friendly deck for early bonus rounds
      const deck = levelInfo.isBonus 
        ? createBonusFriendlyDeck(newBonusRoundCount) 
        : shuffleDeck(createDeck());

      // Reset hand results for new level
      handResultsRef.current = [];

      // Preserve cumulative score, reset level score
      return {
        ...prev,
        sscLevel: newLevel,
        sscPhase: levelInfo.phase,
        sscRound: levelInfo.round,
        pointMultiplier: levelInfo.pointMultiplier,
        isBonusLevel: levelInfo.isBonus,
        levelGoal: calculateLevelGoal(newLevel),
        bonusRoundCount: newBonusRoundCount,
        // Reset level-specific values, preserve cumulative score
        score: 0,
        rawScore: 0,
        levelScore: 0,
        // cumulativeScore is preserved from prev
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
        unlockedPowerUps: newUnlocked,
        activePowerUps: [...newUnlocked],
      };
    });
  }, []);

  const reshuffleUnselected = useCallback(() => {
    setState(prev => {
      const shuffledDeck = shuffleDeck([...prev.deck]);
      return {
        ...prev,
        deck: shuffledDeck,
      };
    });
  }, []);

  const pauseGame = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  const setPaused = useCallback((paused: boolean) => {
    setState(prev => ({ ...prev, isPaused: paused }));
  }, []);

  const endGame = useCallback(() => {
    setState(prev => {
      let finalScore = prev.score;

      // Apply time bonus/penalty for Classic modes
      if (prev.mode === 'classic_fc' || prev.mode === 'classic_cb') {
        finalScore += calculateTimeBonus(prev.timeElapsed);
        // Apply leftover penalty for all Classic modes
        finalScore -= calculateLeftoverPenalty(prev.deck);
      }

      return {
        ...prev,
        score: finalScore, // Allow negative scores
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
    console.log('Timer effect running:', { isPlaying: state.isPlaying, isPaused: state.isPaused, isGameOver: state.isGameOver, mode: state.mode, timeRemaining: state.timeRemaining });
    
    if (state.isPlaying && !state.isPaused && !state.isGameOver) {
      console.log('Starting timer interval');
      timerRef.current = setInterval(() => {
        setState(prev => {
          const isBlitz = prev.mode === 'blitz_fc' || prev.mode === 'blitz_cb';
          const isSSC = prev.mode === 'ssc';
          
          console.log('Timer tick:', { isBlitz, isSSC, timeRemaining: prev.timeRemaining, mode: prev.mode });
          
          if (isBlitz || isSSC) {
            const newTimeRemaining = prev.timeRemaining - 1;
            if (newTimeRemaining <= 0) {
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
    } else {
      console.log('Timer NOT starting - conditions not met');
    }

    return () => {
      if (timerRef.current) {
        console.log('Clearing timer interval');
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
    submitBonusHand,
    skipBonusRound,
    usePowerUp,
    nextLevel,
    reshuffleUnselected,
    pauseGame,
    setPaused,
    endGame,
    resetGame,
    getHandResults,
  };
}
