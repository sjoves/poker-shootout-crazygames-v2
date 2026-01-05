import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Card, GameState, GameMode, HandResult, PowerUp } from '@/types/game';
import { INITIAL_GAME_STATE } from '@/hooks/game/gameConstants';
import { 
  evaluateHand, 
  createDeck, 
  shuffleDeck, 
  calculateTimeBonus, 
  calculateLeftoverPenalty,
  calculateStarRating,
  shouldTriggerBonusRound,
  getBetterHandMultiplier,
  calculateLevelGoal,
  getSSCLevelInfo
} from '@/lib/pokerEngine';

// ============================================================================
// ZUSTAND STORE WITH ATOMIC SLICES
// ============================================================================
// This store splits game state into isolated slices so components only
// re-render when their specific data changes.

// The store extends GameState to maintain full compatibility
interface GameActions {
  // Card actions - atomic, only updates card slice
  selectCard: (card: Card) => void;
  
  // Score actions
  updateScore: (points: number, hand: HandResult) => void;
  
  // Game control actions
  startGame: (mode: GameMode, forceBonus?: boolean, startLevel?: number, phaseOverride?: string) => void;
  pauseGame: () => void;
  setPaused: (paused: boolean) => void;
  endGame: () => void;
  resetGame: () => void;
  
  // Timer actions (called from external timer, doesn't trigger full re-render)
  updateTimer: (timeRemaining: number, timeElapsed: number) => void;
  
  // Hand submission
  submitHand: () => void;
  
  // Level progression
  nextLevel: () => void;
  startBonusRound: () => void;
  skipBonusRound: () => void;
  
  // Utility
  reshuffleUnselected: () => void;
  markExplainerSeen: () => void;
  
  // Power-ups (uses string IDs to match GameState interface)
  selectPowerUp: (powerUpId: string) => void;
  usePowerUp: (powerUpId: string) => void;
  dismissPowerUpSelection: () => void;
  claimReward: () => void;
  discardReward: () => void;
  swapPowerUp: (oldPowerUpId: string) => void;
}

// Full store type: GameState + Actions
type GameStore = GameState & GameActions;

// Helper to get reward tier
const getRewardTier = (points: number): 'bronze' | 'silver' | 'gold' => {
  if (points >= 500) return 'gold';
  if (points >= 300) return 'silver';
  return 'bronze';
};

// Default initial state with all required fields
const STORE_INITIAL_STATE: GameState = {
  ...INITIAL_GAME_STATE,
  // Ensure all optional fields have defaults
  bonusTimePoints: 0,
  pendingReward: null,
  rewardTier: null,
  showLootBox: false,
  inventoryFull: false,
  phaseOverride: undefined,
};

// Selection unlock timer (Zustand store variant)
let selectionUnlockTimer: ReturnType<typeof setTimeout> | null = null;

// Consolidated strict sequential lock (synchronous gate across all pick sources)
let lastPickTime = 0;
// Safety watchdog: ensures lock never stays on for more than 500ms
const scheduleUnlock = (set: (partial: Partial<GameState>) => void) => {
  if (selectionUnlockTimer) clearTimeout(selectionUnlockTimer);
  selectionUnlockTimer = setTimeout(() => {
    set({ isSelectionLocked: false, isProcessingSelection: false });
  }, 500); // Max 500ms lock time
};

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state from all slices
    ...INITIAL_GAME_STATE,
    
    // ========================================================================
    // ATOMIC CARD SELECTION - Only updates selectedCards and deck
    // ========================================================================
    selectCard: (card: Card) => {
      // Fast timing gate only - no lock mechanism
      const t = Date.now();
      if (t - lastPickTime < 50) return;
      
      const state = get();
      if (state.selectedCards.length >= 5) return;
      if (!state.isPlaying || state.isPaused) return;
      if (state.selectedCards.some((c) => c.id === card.id)) return;

      // Update gate immediately
      lastPickTime = t;

      const isBlitz = state.mode === 'blitz_fc' || state.mode === 'blitz_cb';
      const isSSC = state.mode === 'ssc';
      const shouldRecycle = isBlitz || isSSC;

      set({
        selectedCards: [...state.selectedCards, card],
        usedCards: shouldRecycle ? state.usedCards : [...state.usedCards, card],
        deck: state.deck.filter((c) => c.id !== card.id),
        cardsSelected: state.cardsSelected + 1,
      });
    },
    
    // ========================================================================
    // SCORE UPDATE - Isolated score slice update
    // ========================================================================
    updateScore: (points: number, hand: HandResult) => {
      set(state => ({
        score: state.score + points,
        rawScore: state.rawScore + points,
        levelScore: state.levelScore + points,
        cumulativeScore: state.cumulativeScore + points,
        currentHand: hand,
      }));
    },
    
    // ========================================================================
    // TIMER UPDATE - Minimal update, no card/score re-renders
    // ========================================================================
    updateTimer: (timeRemaining: number, timeElapsed: number) => {
      set({ timeRemaining, timeElapsed });
    },
    
    // ========================================================================
    // GAME CONTROLS
    // ========================================================================
    startGame: (mode: GameMode, forceBonus = false, startLevel = 1, phaseOverride?: string) => {
      const deck = shuffleDeck(createDeck());
      const isBlitz = mode === 'blitz_fc' || mode === 'blitz_cb';
      const isSSC = mode === 'ssc';
      
      let timeRemaining = 60;
      if (isBlitz) timeRemaining = 60;
      else if (isSSC) timeRemaining = 60;
      
      const levelGoal = isSSC ? calculateLevelGoal(startLevel) : 0;
      const levelInfo = isSSC ? getSSCLevelInfo(startLevel) : null;
      
      set({
        ...INITIAL_GAME_STATE,
        mode,
        deck,
        isPlaying: true,
        isPaused: false,
        isGameOver: false,
        isLevelComplete: false,
        isBonusLevel: forceBonus,
        timeRemaining,
        timeElapsed: 0,
        sscLevel: startLevel,
        sscPhase: levelInfo?.phase || 'sitting_duck',
        sscRound: levelInfo?.round || 1,
        levelGoal,
        phaseOverride,
      });
    },
    
    pauseGame: () => {
      set(state => ({ isPaused: !state.isPaused }));
    },
    
    setPaused: (paused: boolean) => {
      set({ isPaused: paused });
    },
    
    endGame: () => {
      const state = get();
      const leftoverPenalty = calculateLeftoverPenalty(state.deck);
      const timeBonus = calculateTimeBonus(state.timeElapsed);
      const finalScore = state.rawScore + timeBonus - leftoverPenalty;
      
      set({
        isGameOver: true,
        isPlaying: false,
        score: finalScore,
        timeBonus,
        leftoverPenalty,
      });
    },
    
    resetGame: () => {
      set(INITIAL_GAME_STATE);
    },
    
    // ========================================================================
    // HAND SUBMISSION - Only triggers when 5 cards selected
    // ========================================================================
    submitHand: () => {
      const state = get();
      if (state.selectedCards.length !== 5) return;

      const result = evaluateHand(state.selectedCards);
      
      const isBlitz = state.mode === 'blitz_fc' || state.mode === 'blitz_cb';
      const isSSC = state.mode === 'ssc';
      const inFinalStretch = (isBlitz || isSSC) && state.timeRemaining <= 10 && state.timeRemaining > 0;
      const finalStretchMultiplier = inFinalStretch ? 2 : 1;
      
      let betterHandMultiplier = 1;
      let newBetterHandStreak = 0;
      let newPreviousHandRank = result.hand.rank;
      
      if (isSSC && !state.isBonusLevel) {
        if (state.previousHandRank !== null && result.hand.rank < state.previousHandRank) {
          newBetterHandStreak = state.betterHandStreak + 1;
          betterHandMultiplier = getBetterHandMultiplier(newBetterHandStreak);
        } else if (state.previousHandRank !== null) {
          newBetterHandStreak = 0;
        }
      }
      
      let multipliedPoints = result.totalPoints;
      multipliedPoints = Math.floor(multipliedPoints * betterHandMultiplier);
      if (inFinalStretch) {
        multipliedPoints = Math.floor(multipliedPoints * finalStretchMultiplier);
      }
      
      const modifiedResult = { ...result, totalPoints: multipliedPoints };
      
      const newHandsPlayed = state.handsPlayed + 1;
      const newScore = state.score + multipliedPoints;
      const newLevelScore = state.levelScore + multipliedPoints;

      const shouldRecycle = isBlitz || isSSC;
      const recycledDeck = shouldRecycle 
        ? [...state.deck, ...state.selectedCards] 
        : state.deck;

      const isClassic = state.mode === 'classic_fc' || state.mode === 'classic_cb';
      const classicGameOver = isClassic && newHandsPlayed >= 10;

      // SSC level complete check
      if (state.mode === 'ssc' && newScore >= state.levelGoal) {
        const starRating = calculateStarRating(newScore, state.levelGoal);
        const shouldBonus = shouldTriggerBonusRound(state.sscLevel);
        set({
          score: newScore,
          rawScore: state.rawScore + multipliedPoints,
          levelScore: newLevelScore,
          cumulativeScore: state.cumulativeScore + multipliedPoints,
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
        });
        return;
      }

      // Classic game over
      if (classicGameOver) {
        const leftoverPenalty = calculateLeftoverPenalty(state.deck);
        const timeBonus = calculateTimeBonus(state.timeElapsed);
        const finalScore = state.rawScore + multipliedPoints + timeBonus - leftoverPenalty;
        
        set({
          score: finalScore,
          rawScore: state.rawScore + multipliedPoints,
          timeBonus,
          leftoverPenalty,
          handsPlayed: newHandsPlayed,
          selectedCards: [],
          currentHand: modifiedResult,
          isGameOver: true,
        });
        return;
      }

      // Normal hand submission
      set({
        score: newScore,
        rawScore: state.rawScore + multipliedPoints,
        levelScore: newLevelScore,
        cumulativeScore: state.cumulativeScore + multipliedPoints,
        handsPlayed: newHandsPlayed,
        selectedCards: [],
        currentHand: modifiedResult,
        deck: recycledDeck,
        isGameOver: false,
        previousHandRank: newPreviousHandRank,
        betterHandStreak: newBetterHandStreak,
        currentMultiplier: betterHandMultiplier,
      });
    },
    
    // ========================================================================
    // LEVEL PROGRESSION
    // ========================================================================
    nextLevel: () => {
      const state = get();
      const newLevel = state.sscLevel + 1;
      const levelInfo = getSSCLevelInfo(newLevel);
      const levelGoal = calculateLevelGoal(newLevel);
      const deck = shuffleDeck(createDeck());
      
      set({
        sscLevel: newLevel,
        sscPhase: levelInfo.phase,
        sscRound: levelInfo.round,
        levelGoal,
        levelScore: 0,
        score: 0,
        rawScore: 0,
        deck,
        selectedCards: [],
        usedCards: [],
        isLevelComplete: false,
        isBonusLevel: false,
        pendingBonusRound: false,
        timeRemaining: 60,
        timeElapsed: 0,
        currentHand: null,
        previousHandRank: null,
        betterHandStreak: 0,
        currentMultiplier: 1,
      });
    },
    
    startBonusRound: () => {
      const state = get();
      const deck = shuffleDeck(createDeck());
      
      set({
        isBonusLevel: true,
        isLevelComplete: false,
        pendingBonusRound: false,
        deck,
        selectedCards: [],
        timeRemaining: 30,
        timeElapsed: 0,
        bonusRoundCount: state.bonusRoundCount + 1,
      });
    },
    
    skipBonusRound: () => {
      set({
        pendingBonusRound: false,
        isLevelComplete: true,
      });
    },
    
    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================
    reshuffleUnselected: () => {
      set(state => ({
        deck: shuffleDeck(state.deck),
        reshuffleTrigger: state.reshuffleTrigger + 1,
      }));
    },
    
    markExplainerSeen: () => {
      set({ hasSeenSSCExplainer: true });
    },
    
    // ========================================================================
    // POWER-UPS (uses string IDs to match GameState interface)
    // ========================================================================
    selectPowerUp: (powerUpId: string) => {
      set(state => ({
        earnedPowerUps: [...state.earnedPowerUps, powerUpId],
        showPowerUpSelection: false,
        powerUpChoices: [],
      }));
    },
    
    usePowerUp: (powerUpId: string) => {
      set(state => ({
        activePowerUps: [...state.activePowerUps, powerUpId],
        earnedPowerUps: state.earnedPowerUps.filter(p => p !== powerUpId),
      }));
    },
    
    dismissPowerUpSelection: () => {
      set({
        showPowerUpSelection: false,
        powerUpChoices: [],
      });
    },
    
    claimReward: () => {
      const state = get();
      if (!state.pendingReward) return;
      
      if (state.earnedPowerUps.length >= 3) {
        set({ inventoryFull: true });
        return;
      }
      
      set({
        earnedPowerUps: [...state.earnedPowerUps, state.pendingReward],
        pendingReward: null,
        showLootBox: false,
        rewardTier: null,
      });
    },
    
    discardReward: () => {
      set({
        pendingReward: null,
        showLootBox: false,
        rewardTier: null,
        inventoryFull: false,
      });
    },
    
    swapPowerUp: (oldPowerUpId: string) => {
      const state = get();
      if (!state.pendingReward) return;
      
      set({
        earnedPowerUps: [
          ...state.earnedPowerUps.filter(p => p !== oldPowerUpId),
          state.pendingReward,
        ],
        pendingReward: null,
        showLootBox: false,
        rewardTier: null,
        inventoryFull: false,
      });
    },
  }))
);

// ============================================================================
// SELECTOR HOOKS - Components use these for granular subscriptions
// ============================================================================
// These selectors ensure components only re-render when their specific data changes

export const useScore = () => useGameStore(state => ({
  score: state.score,
  currentHand: state.currentHand,
  currentMultiplier: state.currentMultiplier,
}));

export const useSelectedCards = () => useGameStore(state => state.selectedCards);
export const useDeck = () => useGameStore(state => state.deck);

export const useGameProgress = () => useGameStore(state => ({
  mode: state.mode,
  isPlaying: state.isPlaying,
  isPaused: state.isPaused,
  isGameOver: state.isGameOver,
  isLevelComplete: state.isLevelComplete,
  isBonusLevel: state.isBonusLevel,
  sscLevel: state.sscLevel,
  sscPhase: state.sscPhase,
  levelGoal: state.levelGoal,
  handsPlayed: state.handsPlayed,
  starRating: state.starRating,
}));

export const usePowerUps = () => useGameStore(state => ({
  earnedPowerUps: state.earnedPowerUps,
  activePowerUps: state.activePowerUps,
  showPowerUpSelection: state.showPowerUpSelection,
  powerUpChoices: state.powerUpChoices,
  pendingReward: state.pendingReward,
  showLootBox: state.showLootBox,
  inventoryFull: state.inventoryFull,
}));

// Action selectors (these don't cause re-renders)
export const useGameActions = () => useGameStore(state => ({
  selectCard: state.selectCard,
  submitHand: state.submitHand,
  startGame: state.startGame,
  pauseGame: state.pauseGame,
  setPaused: state.setPaused,
  endGame: state.endGame,
  resetGame: state.resetGame,
  nextLevel: state.nextLevel,
  startBonusRound: state.startBonusRound,
  skipBonusRound: state.skipBonusRound,
  reshuffleUnselected: state.reshuffleUnselected,
  markExplainerSeen: state.markExplainerSeen,
  selectPowerUp: state.selectPowerUp,
  usePowerUp: state.usePowerUp,
  dismissPowerUpSelection: state.dismissPowerUpSelection,
  claimReward: state.claimReward,
  discardReward: state.discardReward,
  swapPowerUp: state.swapPowerUp,
}));

// Re-export types for convenience
export { getRewardTier };
