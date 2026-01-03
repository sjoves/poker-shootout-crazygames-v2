export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
}

export interface FallingCard extends Card {
  x: number;
  y: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  sway: number;
  swaySpeed: number;
}

export interface ConveyorCard extends Card {
  x: number;
  y: number;
  row: number;
  speed: number;
}

export type GameMode = 'classic_fc' | 'classic_cb' | 'blitz_fc' | 'blitz_cb' | 'ssc';

export type SSCPhase = 'static' | 'conveyor' | 'falling';

export interface PokerHand {
  name: string;
  basePoints: number;
  rank: number;
}

export interface HandResult {
  hand: PokerHand;
  cards: Card[];
  valueBonus: number;
  totalPoints: number;
}

export interface GameState {
  mode: GameMode;
  score: number;
  handsPlayed: number;
  cardsSelected: number;
  timeElapsed: number;
  timeRemaining: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  isLevelComplete: boolean;
  isBonusLevel: boolean;
  isBonusFailed: boolean;
  selectedCards: Card[];
  deck: Card[];
  usedCards: Card[];
  currentHand: HandResult | null;
  sscLevel: number;
  sscPhase: SSCPhase;
  sscRound: number;
  levelGoal: number;
  // Power-up system - earned from bonus rounds
  earnedPowerUps: string[];
  activePowerUps: string[];
  powerUpChoices: string[];
  showPowerUpSelection: boolean;
  // Classic mode scoring breakdown
  rawScore: number;
  timeBonus: number;
  leftoverPenalty: number;
  // Bonus round tracking
  bonusRoundCount: number;
  // Bonus round time bonus
  bonusTimePoints?: number;
  // SSC cumulative scoring
  levelScore: number;
  cumulativeScore: number;
  // Reshuffle trigger for visual re-deal in dynamic modes
  reshuffleTrigger: number;
  // Better-Hand multiplier system
  previousHandRank: number | null;
  betterHandStreak: number;
  currentMultiplier: number;
  // Star rating for level completion
  starRating: number;
  // SSC explainer shown flag
  hasSeenSSCExplainer: boolean;
}

export interface PowerUp {
  id: string;
  name: string;
  emoji: string;
  description: string;
  handType: string;
  tier: number; // 1 = common, 2 = uncommon, 3 = rare
  isReusable?: boolean;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  profile_id: string;
  game_mode: GameMode;
  score: number;
  ssc_level?: number;
  hands_played: number;
  best_hand?: string;
  time_seconds?: number;
  created_at: string;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  };
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// SSC Mode Scoring - new point values per user request
export const POKER_HANDS: PokerHand[] = [
  { name: 'Royal Flush', basePoints: 5000, rank: 1 },
  { name: 'Straight Flush', basePoints: 2500, rank: 2 },
  { name: 'Four of a Kind', basePoints: 1500, rank: 3 },
  { name: 'Full House', basePoints: 1000, rank: 4 },
  { name: 'Flush', basePoints: 750, rank: 5 },
  { name: 'Straight', basePoints: 500, rank: 6 },
  { name: 'Three of a Kind', basePoints: 300, rank: 7 },
  { name: 'Two Pair', basePoints: 150, rank: 8 },
  { name: 'One Pair', basePoints: 50, rank: 9 },
  { name: 'High Card', basePoints: 10, rank: 10 },
];

export const POWER_UPS: PowerUp[] = [
  { id: 'reshuffle', name: 'Reshuffle', emoji: '🔀', description: 'Shuffle and re-deal all cards on screen', handType: '', tier: 1, isReusable: true },
  { id: 'two_pair', name: 'Two Pair', emoji: '2️⃣', description: 'Instantly form a Two Pair hand', handType: 'Two Pair', tier: 1 },
  { id: 'three_kind', name: 'Three of a Kind', emoji: '3️⃣', description: 'Instantly form Three of a Kind', handType: 'Three of a Kind', tier: 1 },
  { id: 'add_time', name: 'Add Time', emoji: '⏰', description: 'Add 15 seconds to the clock', handType: '', tier: 1, isReusable: true },
  { id: 'straight', name: 'Straight', emoji: '➡️', description: 'Instantly form a Straight', handType: 'Straight', tier: 2 },
  { id: 'flush', name: 'Flush', emoji: '♦️', description: 'Instantly form a Flush', handType: 'Flush', tier: 2 },
  { id: 'full_house', name: 'Full House', emoji: '🏠', description: 'Instantly form a Full House', handType: 'Full House', tier: 2 },
  { id: 'four_kind', name: 'Four of a Kind', emoji: '4️⃣', description: 'Instantly form Four of a Kind', handType: 'Four of a Kind', tier: 3 },
  { id: 'straight_flush', name: 'Straight Flush', emoji: '🔥', description: 'Instantly form a Straight Flush', handType: 'Straight Flush', tier: 3 },
  { id: 'royal_flush', name: 'Royal Flush', emoji: '👑', description: 'Instantly form a Royal Flush', handType: 'Royal Flush', tier: 3 },
];
