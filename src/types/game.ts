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
  selectedCards: Card[];
  deck: Card[];
  usedCards: Card[];
  currentHand: HandResult | null;
  sscLevel: number;
  sscPhase: SSCPhase;
  sscRound: number;
  
  levelGoal: number;
  unlockedPowerUps: string[];
  activePowerUps: string[];
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
}

export interface PowerUp {
  id: string;
  name: string;
  emoji: string;
  handType: string;
  unlockedAtLevel: number;
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

export const POKER_HANDS: PokerHand[] = [
  { name: 'Royal Flush', basePoints: 4000, rank: 1 },
  { name: 'Straight Flush', basePoints: 2400, rank: 2 },
  { name: 'Four of a Kind', basePoints: 1600, rank: 3 },
  { name: 'Full House', basePoints: 1000, rank: 4 },
  { name: 'Flush', basePoints: 600, rank: 5 },
  { name: 'Straight', basePoints: 400, rank: 6 },
  { name: 'Three of a Kind', basePoints: 240, rank: 7 },
  { name: 'Two Pair', basePoints: 160, rank: 8 },
  { name: 'One Pair', basePoints: 80, rank: 9 },
  { name: 'High Card', basePoints: 20, rank: 10 },
];

export const POWER_UPS: PowerUp[] = [
  { id: 'two_pair', name: 'Two Pair', emoji: '2️⃣', handType: 'Two Pair', unlockedAtLevel: 3 },
  { id: 'three_kind', name: 'Three of a Kind', emoji: '3️⃣', handType: 'Three of a Kind', unlockedAtLevel: 7 },
  { id: 'straight', name: 'Straight', emoji: '➡️', handType: 'Straight', unlockedAtLevel: 10 },
  { id: 'add_time', name: 'Add Time', emoji: '⏰', handType: '', unlockedAtLevel: 11, isReusable: true },
  { id: 'flush', name: 'Flush', emoji: '♦️', handType: 'Flush', unlockedAtLevel: 15 },
  { id: 'full_house', name: 'Full House', emoji: '🏠', handType: 'Full House', unlockedAtLevel: 20 },
  { id: 'four_kind', name: 'Four of a Kind', emoji: '4️⃣', handType: 'Four of a Kind', unlockedAtLevel: 25 },
  { id: 'straight_flush', name: 'Straight Flush', emoji: '🔥', handType: 'Straight Flush', unlockedAtLevel: 30 },
  { id: 'royal_flush', name: 'Royal Flush', emoji: '👑', handType: 'Royal Flush', unlockedAtLevel: 35 },
];
