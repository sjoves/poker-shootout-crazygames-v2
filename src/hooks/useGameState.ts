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
  shouldTriggerBonusRound,
  generateSpecificHand,
  createBonusFriendlyDeck,
  calculateStarRating,
  getBetterHandMultiplier
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
  isBonusFailed: false,
  selectedCards: [],
  deck: [],
  usedCards: [],
  currentHand: null,
  sscLevel: 1,
  sscPhase: 'static',
  sscRound: 1,
  levelGoal: 500,
  earnedPowerUps: [],
  activePowerUps: [],
  powerUpChoices: [],
  showPowerUpSelection: false,
  rawScore: 0,
  timeBonus: 0,
  leftoverPenalty: 0,
  bonusRoundCount: 0,
  pendingBonusRound: false,
  bonusTimePoints: 0,
  levelScore: 0,
  cumulativeScore: 0,
  reshuffleTrigger: 0,
  previousHandRank: null,
  betterHandStreak: 0,
  currentMultiplier: 1,
  starRating: 0,
  hasSeenSSCExplainer: false,
};

// Get available power-ups that haven't been earned yet
function getAvailablePowerUps(earnedPowerUps: string[], bonusRoundCount: number): string[] {
  // Filter to power-ups not yet earned
  const unearnedPowerUps = POWER_UPS.filter(p => !earnedPowerUps.includes(p.id));
  
  // Determine max tier based on bonus round count
  // Rounds 1-2: tier 1 only, Rounds 3-4: tier 1-2, Rounds 5+: all tiers
  let maxTier = 1;
  if (bonusRoundCount >= 3) maxTier = 2;
  if (bonusRoundCount >= 5) maxTier = 3;
  
  // Filter by tier
  const eligiblePowerUps = unearnedPowerUps.filter(p => p.tier <= maxTier);
  
  return eligiblePowerUps.map(p => p.id);
}

// Generate 3 random power-up choices from available pool
function generatePowerUpChoices(earnedPowerUps: string[], bonusRoundCount: number): string[] {
  const available = getAvailablePowerUps(earnedPowerUps, bonusRoundCount);
  
  if (available.length === 0) return [];
  if (available.length <= 3) return available;
  
  // Shuffle and take 3
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handResultsRef = useRef<HandResult[]>([]);

  const startGame = useCallback((mode: GameMode, forceBonus: boolean = false, startLevel: number = 1) => {
    const isBlitz = mode === 'blitz_fc' || mode === 'blitz_cb';
    const isSSC = mode === 'ssc';
    
    // Use startLevel for SSC mode (for replay functionality)
    const level = isSSC ? startLevel : 1;
    
    const levelInfo = isSSC ? getSSCLevelInfo(level) : null;
    // forceBonus is used for testing bonus rounds directly
    const isBonusLevel = forceBonus;
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
      isBonusLevel,
      levelGoal: isSSC ? calculateLevelGoal(level) : 0,
      earnedPowerUps: [],
      activePowerUps: [],
      powerUpChoices: [],
      showPowerUpSelection: false,
      bonusRoundCount: initialBonusCount,
      pendingBonusRound: false,
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
      
      // Calculate Better-Hand multiplier for SSC mode
      let betterHandMultiplier = 1;
      let newBetterHandStreak = 0;
      let newPreviousHandRank = result.hand.rank;
      
      if (isSSC && !prev.isBonusLevel) {
        // Check if current hand is better (lower rank number = better hand)
        if (prev.previousHandRank !== null && result.hand.rank < prev.previousHandRank) {
          // Hand is better than previous - increase streak
          newBetterHandStreak = prev.betterHandStreak + 1;
          betterHandMultiplier = getBetterHandMultiplier(newBetterHandStreak);
        } else if (prev.previousHandRank !== null) {
          // Hand is equal or worse - reset streak
          newBetterHandStreak = 0;
          betterHandMultiplier = 1;
        }
        // First hand of level - no multiplier yet
      }
      
      // Apply multipliers
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
        const starRating = calculateStarRating(newScore, prev.levelGoal);
        // Check if a bonus round should trigger after this level
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
        previousHandRank: newPreviousHandRank,
        betterHandStreak: newBetterHandStreak,
        currentMultiplier: betterHandMultiplier,
      };
    });
  }, []);

  const submitBonusHand = useCallback((cards: Card[], result: HandResult, timeRemaining: number) => {
    setState(prev => {
      const points = result.totalPoints;
      
      // Calculate time bonus: 10 points per second remaining
      const timeBonusPoints = timeRemaining * 10;
      
      handResultsRef.current.push(result);

      const totalPoints = points + timeBonusPoints;
      const newScore = prev.score + totalPoints;
      const newRawScore = prev.rawScore + totalPoints;
      const newLevelScore = prev.levelScore + totalPoints;
      const newCumulativeScore = prev.cumulativeScore + totalPoints;

      // Generate power-up choices for the player
      const newBonusRoundCount = prev.bonusRoundCount;
      const choices = generatePowerUpChoices(prev.earnedPowerUps, newBonusRoundCount);

      // Bonus round completes after one hand submission
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
        powerUpChoices: choices,
        showPowerUpSelection: choices.length > 0,
      };
    });
  }, []);

  const skipBonusRound = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLevelComplete: true,
      isBonusFailed: true, // Bonus round skipped/failed - but doesn't cause game over
    }));
  }, []);

  const selectPowerUp = useCallback((powerUpId: string) => {
    setState(prev => {
      if (!prev.powerUpChoices.includes(powerUpId)) return prev;
      
      const newEarnedPowerUps = [...prev.earnedPowerUps, powerUpId];
      const newActivePowerUps = [...prev.activePowerUps, powerUpId];
      
      return {
        ...prev,
        earnedPowerUps: newEarnedPowerUps,
        activePowerUps: newActivePowerUps,
        powerUpChoices: [],
        showPowerUpSelection: false,
      };
    });
  }, []);

  const dismissPowerUpSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      powerUpChoices: [],
      showPowerUpSelection: false,
    }));
  }, []);

  const usePowerUp = useCallback((powerUpId: string) => {
    setState(prev => {
      if (!prev.activePowerUps.includes(powerUpId)) return prev;

      const powerUp = POWER_UPS.find(p => p.id === powerUpId);
      if (!powerUp) return prev;

      // Remove power-up from both earned and active lists (consumed until won again)
      const newEarnedPowerUps = prev.earnedPowerUps.filter(id => id !== powerUpId);
      const newActivePowerUps = prev.activePowerUps.filter(id => id !== powerUpId);

      // Handle reshuffle power-up
      if (powerUp.id === 'reshuffle') {
        const shuffledDeck = shuffleDeck([...prev.deck]);
        return {
          ...prev,
          deck: shuffledDeck,
          reshuffleTrigger: prev.reshuffleTrigger + 1,
          earnedPowerUps: newEarnedPowerUps,
          activePowerUps: newActivePowerUps,
        };
      }

      if (powerUp.id === 'add_time') {
        return {
          ...prev,
          timeRemaining: prev.timeRemaining + 15,
          earnedPowerUps: newEarnedPowerUps,
          activePowerUps: newActivePowerUps,
        };
      }

      // Generate the specific hand
      const hand = generateSpecificHand(powerUp.handType, prev.deck);
      if (!hand) return prev;

      const newDeck = prev.deck.filter(c => !hand.some(h => h.id === c.id));

      return {
        ...prev,
        selectedCards: hand,
        deck: newDeck,
        usedCards: [...prev.usedCards, ...hand],
        earnedPowerUps: newEarnedPowerUps,
        activePowerUps: newActivePowerUps,
      };
    });
  }, []);

  // Start a bonus round (called when pendingBonusRound is true)
  const startBonusRound = useCallback(() => {
    setState(prev => {
      const newBonusRoundCount = prev.bonusRoundCount + 1;
      const deck = createBonusFriendlyDeck(newBonusRoundCount);
      
      handResultsRef.current = [];
      
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
        // Reset multiplier for bonus round
        previousHandRank: null,
        betterHandStreak: 0,
        currentMultiplier: 1,
        starRating: 0,
      };
    });
  }, []);

  // Proceed to next numbered level (called after bonus round or directly)
  const nextLevel = useCallback(() => {
    setState(prev => {
      // If we're coming from a bonus round, don't increment level
      // The level was already "completed" before the bonus round
      const newLevel = prev.isBonusLevel ? prev.sscLevel + 1 : prev.sscLevel + 1;
      const levelInfo = getSSCLevelInfo(newLevel);
      
      const deck = shuffleDeck(createDeck());

      handResultsRef.current = [];

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
  }, []);

  // Mark SSC explainer as seen
  const markExplainerSeen = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasSeenSSCExplainer: true,
    }));
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
  };
}
