import { Card, HandResult, POKER_HANDS, RANK_VALUES, Rank, Suit, SUITS, RANKS } from '@/types/game';

// ============================================================================
// BITMASK-BASED HAND EVALUATION FOR PERFORMANCE
// ============================================================================
// Each card is represented as bits for O(1) hand detection:
// - Suit mask: 4 bits (one per suit) tracking which suits have cards
// - Rank mask: 13 bits (one per rank A-K) tracking which ranks are present
// - This allows Flush detection in a single bitwise operation
// - Straight detection uses precomputed straight patterns

// Precomputed straight patterns (bitmasks for A-5, 2-6, 3-7, ..., 10-A)
const STRAIGHT_PATTERNS = [
  0b1111000000001, // A-2-3-4-5 (wheel)
  0b0000000011111, // 2-3-4-5-6
  0b0000000111110, // 3-4-5-6-7
  0b0000001111100, // 4-5-6-7-8
  0b0000011111000, // 5-6-7-8-9
  0b0000111110000, // 6-7-8-9-10
  0b0001111100000, // 7-8-9-10-J
  0b0011111000000, // 8-9-10-J-Q
  0b0111110000000, // 9-10-J-Q-K
  0b1111100000000, // 10-J-Q-K-A
];

const ROYAL_PATTERN = 0b1111100000000; // 10-J-Q-K-A

// Bit position for each rank (2=0, 3=1, ..., A=12)
const RANK_TO_BIT: Record<number, number> = {
  2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: 12
};

// Suit index for bitmask operations
const SUIT_INDEX: Record<Suit, number> = {
  'hearts': 0,
  'diamonds': 1,
  'clubs': 2,
  'spades': 3
};

// Fast lookup table for rank frequency patterns
// Pattern key: sorted count array as string (e.g., "4,1" for four of a kind)
const RANK_PATTERN_HANDS: Record<string, number> = {
  '4,1': 2,   // Four of a Kind
  '3,2': 3,   // Full House
  '3,1,1': 6, // Three of a Kind
  '2,2,1': 7, // Two Pair
  '2,1,1,1': 8, // One Pair
  '1,1,1,1,1': 9, // High Card
};

interface BitmaskResult {
  suitMasks: number[];      // 4 masks, one per suit
  rankMask: number;         // Combined rank mask
  rankCounts: number[];     // Count of each rank (index by rank value - 2)
  isFlush: boolean;
  flushSuit: number;        // Which suit has the flush (-1 if none)
  flushRankMask: number;    // Rank mask for flush suit only
}

// Convert cards to bitmask representation - O(n) where n=5
function cardsToBitmask(cards: Card[]): BitmaskResult {
  const suitMasks = [0, 0, 0, 0]; // One per suit
  const rankCounts = new Array(13).fill(0);
  let rankMask = 0;
  
  for (const card of cards) {
    const suitIdx = SUIT_INDEX[card.suit];
    const rankBit = RANK_TO_BIT[card.value];
    
    suitMasks[suitIdx] |= (1 << rankBit);
    rankMask |= (1 << rankBit);
    rankCounts[rankBit]++;
  }
  
  // Check for flush - any suit with 5+ bits set
  let isFlush = false;
  let flushSuit = -1;
  let flushRankMask = 0;
  
  for (let i = 0; i < 4; i++) {
    const popCount = countBits(suitMasks[i]);
    if (popCount >= 5) {
      isFlush = true;
      flushSuit = i;
      flushRankMask = suitMasks[i];
      break;
    }
  }
  
  return { suitMasks, rankMask, rankCounts, isFlush, flushSuit, flushRankMask };
}

// Fast bit counting (Hamming weight)
function countBits(n: number): number {
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  return (((n + (n >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
}

// Check if a rank mask contains a straight pattern - O(1) with 10 comparisons
function hasStraight(rankMask: number): boolean {
  for (const pattern of STRAIGHT_PATTERNS) {
    if ((rankMask & pattern) === pattern) return true;
  }
  return false;
}

// Check for royal flush pattern
function hasRoyal(rankMask: number): boolean {
  return (rankMask & ROYAL_PATTERN) === ROYAL_PATTERN;
}

// Get sorted frequency pattern for rank-based hands
function getFrequencyPattern(rankCounts: number[]): string {
  return rankCounts.filter(c => c > 0).sort((a, b) => b - a).join(',');
}

// Legacy helper for compatibility - still needed for specific card extraction
function getValueCounts(cards: Card[]): Map<number, Card[]> {
  const counts = new Map<number, Card[]>();
  cards.forEach(card => {
    const existing = counts.get(card.value) || [];
    counts.set(card.value, [...existing, card]);
  });
  return counts;
}

function getSuitCounts(cards: Card[]): Map<Suit, Card[]> {
  const counts = new Map<Suit, Card[]>();
  cards.forEach(card => {
    const existing = counts.get(card.suit) || [];
    counts.set(card.suit, [...existing, card]);
  });
  return counts;
}

// Optimized hand evaluation using bitmasks
export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length !== 5) {
    return {
      hand: POKER_HANDS[9], // High Card
      cards,
      valueBonus: cards.reduce((sum, c) => sum + c.value, 0),
      totalPoints: 5 + cards.reduce((sum, c) => sum + c.value, 0)
    };
  }

  const bitmask = cardsToBitmask(cards);
  const valueBonus = cards.reduce((sum, c) => sum + c.value, 0);
  
  let hand = POKER_HANDS[9]; // Default: High Card

  // Check from highest to lowest using bitmask operations
  if (bitmask.isFlush && hasRoyal(bitmask.flushRankMask)) {
    hand = POKER_HANDS[0]; // Royal Flush
  } else if (bitmask.isFlush && hasStraight(bitmask.flushRankMask)) {
    hand = POKER_HANDS[1]; // Straight Flush
  } else {
    // Check rank-based hands using frequency pattern
    const pattern = getFrequencyPattern(bitmask.rankCounts);
    const patternHandIndex = RANK_PATTERN_HANDS[pattern];
    
    if (patternHandIndex === 2) {
      hand = POKER_HANDS[2]; // Four of a Kind
    } else if (patternHandIndex === 3) {
      hand = POKER_HANDS[3]; // Full House
    } else if (bitmask.isFlush) {
      hand = POKER_HANDS[4]; // Flush
    } else if (hasStraight(bitmask.rankMask)) {
      hand = POKER_HANDS[5]; // Straight
    } else if (patternHandIndex !== undefined) {
      hand = POKER_HANDS[patternHandIndex];
    }
  }

  return {
    hand,
    cards,
    valueBonus,
    totalPoints: hand.basePoints + valueBonus
  };
}

// Legacy functions kept for backward compatibility but now use bitmask internally
function isFlush(cards: Card[]): boolean {
  return cardsToBitmask(cards).isFlush;
}

function isStraight(cards: Card[]): boolean {
  return hasStraight(cardsToBitmask(cards).rankMask);
}

function isRoyalFlush(cards: Card[]): boolean {
  const bm = cardsToBitmask(cards);
  return bm.isFlush && hasRoyal(bm.flushRankMask);
}

function isStraightFlush(cards: Card[]): boolean {
  const bm = cardsToBitmask(cards);
  return bm.isFlush && hasStraight(bm.flushRankMask);
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({
        id: `${rank}-${suit}`,
        suit,
        rank,
        value: RANK_VALUES[rank]
      });
    });
  });
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function calculateTimeBonus(seconds: number): number {
  // Classic Mode: 1000 bonus points for 1 minute or under
  // After 1 minute, deduct 1 point per second
  if (seconds <= 60) {
    return 1000;
  }
  // Deduct 1 point per second over 60 seconds (can go negative)
  return -(seconds - 60);
}

export function calculateLeftoverPenalty(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.value * 10, 0);
}

// SSC Level structure:
// IMPORTANT: Bonus rounds are separate from numbered levels.
// Cycle 1 (Levels 1-12): 9-level rotation (Sitting Duck 1-3, Conveyor 4-6, Falling 7-9, then repeats 10-12 as Sitting Duck)
// Cycle 2+ (Level 13 onwards): 12-level rotation with Orbit
// - Sitting Duck: 13-15, 25-27, etc.
// - Conveyor: 16-18, 28-30, etc.
// - Falling: 19-21, 31-33, etc.
// - Orbit: 22-24, 34-36, etc.
// Bonus rounds occur AFTER every 3 levels but don't count as levels.

export interface SSCLevelInfo {
  phase: 'sitting_duck' | 'conveyor' | 'falling' | 'orbit';
  round: number; // Which cycle we're in (1-indexed)
  difficultyMultiplier: number;
}

// Get level info for a numbered level (NOT bonus round)
export function getSSCLevelInfo(level: number): SSCLevelInfo {
  // Orbit mode starts at Level 13 (2nd cycle)
  const orbitStartLevel = 13;
  
  let phase: 'sitting_duck' | 'conveyor' | 'falling' | 'orbit';
  let round: number;
  
  if (level < orbitStartLevel) {
    // Cycle 1 (Levels 1-12): 9-level rotation (no Orbit)
    // Within cycle 1, it repeats the 9-level pattern
    const cyclePosition = ((level - 1) % 9) + 1; // 1-9
    
    if (cyclePosition <= 3) {
      phase = 'sitting_duck';
    } else if (cyclePosition <= 6) {
      phase = 'conveyor';
    } else {
      phase = 'falling';
    }
    
    round = 1;
  } else {
    // Cycle 2+: 12-level rotation with Orbit
    const levelInOrbitEra = level - orbitStartLevel + 1; // 1-indexed from Level 13
    const cyclePosition = ((levelInOrbitEra - 1) % 12) + 1; // 1-12
    
    if (cyclePosition <= 3) {
      phase = 'sitting_duck';
    } else if (cyclePosition <= 6) {
      phase = 'conveyor';
    } else if (cyclePosition <= 9) {
      phase = 'falling';
    } else {
      phase = 'orbit';
    }
    
    // Round 2 starts at Level 13
    round = 1 + Math.ceil(levelInOrbitEra / 12);
  }
  
  // Difficulty multiplier increases slightly each cycle
  const difficultyMultiplier = 1 + (round - 1) * 0.1;
  
  return {
    phase,
    round,
    difficultyMultiplier,
  };
}

// Check if a bonus round should occur AFTER completing a level
export function shouldTriggerBonusRound(levelJustCompleted: number): boolean {
  return levelJustCompleted > 0 && levelJustCompleted % 3 === 0;
}

export function getSSCPhase(level: number): 'sitting_duck' | 'conveyor' | 'falling' | 'orbit' {
  return getSSCLevelInfo(level).phase;
}

export function calculateLevelGoal(level: number): number {
  // Level 1 starts at 500 points
  // Increase point goal by 5% compounding per level (numbered levels only)
  const baseGoal = 500;
  return Math.floor(baseGoal * Math.pow(1.05, level - 1));
}

export function getSSCSpeed(level: number): number {
  const info = getSSCLevelInfo(level);
  
  if (info.phase === 'sitting_duck') return 0;
  
  // Base speeds for moving modes
  let baseSpeed: number;
  
  if (info.phase === 'conveyor') {
    baseSpeed = 1.2;
  } else if (info.phase === 'falling') {
    baseSpeed = 1.3;
  } else {
    // Orbit mode: 30% slower base speed for better playability (1.5 * 0.7 = 1.05)
    baseSpeed = 1.05;
  }
  
  // Speed scaling logic:
  // - Levels 1-10: No speed increase (use base speed)
  // - Levels 11+: 
  //   - Falling & Orbit modes: 0.5% linear increase per level (gentle progression)
  //   - Conveyor: 2% linear increase per level
  if (level >= 11) {
    const levelsAbove10 = level - 10;
    
    if (info.phase === 'falling' || info.phase === 'orbit') {
      // Falling and Orbit modes get slower acceleration (0.5% per level)
      const speedIncrease = 1 + (levelsAbove10 * 0.005);
      return baseSpeed * speedIncrease;
    } else {
      // Conveyor maintains original 2% scaling
      const speedIncrease = 1 + (levelsAbove10 * 0.02);
      return baseSpeed * speedIncrease;
    }
  }
  
  return baseSpeed;
}

// Get orbital speed for a specific ring (outer rings move faster)
export function getOrbitRingSpeed(level: number, ringIndex: number, totalRings: number): number {
  const baseSpeed = getSSCSpeed(level);
  // Ring speed multipliers for playability:
  // - Inner ring (0): 1.0x (anchor speed - slowest, most manageable)
  // - Middle ring (1): 1.15x (slightly faster)
  // - Outer ring (2): 1.3x (fastest, but still controllable)
  const ringMultipliers = [1.0, 1.15, 1.3];
  const ringMultiplier = ringMultipliers[ringIndex] || 1.0;
  return baseSpeed * ringMultiplier;
}

// Calculate star rating based on score vs goal
export function calculateStarRating(score: number, goal: number): number {
  if (score >= goal * 1.5) return 3;
  if (score >= goal * 1.25) return 2;
  if (score >= goal) return 1;
  return 0;
}

// Calculate Better-Hand multiplier
export function getBetterHandMultiplier(streak: number): number {
  if (streak <= 0) return 1;
  if (streak === 1) return 1.2;
  if (streak === 2) return 1.5;
  return 2; // 3+ consecutive better hands
}

// Calculate hand strength for tie-breaking (higher is better)
export function calculateHandStrength(cards: Card[]): number {
  if (cards.length !== 5) return 0;
  
  const valueCounts = getValueCounts(cards);
  const sortedValues = cards.map(c => c.value).sort((a, b) => b - a);
  const countArray = Array.from(valueCounts.entries()).sort((a, b) => {
    // Sort by count first, then by value
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return b[0] - a[0];
  });
  
  // Base strength from hand rank (higher rank hands have much higher base)
  let strength = 0;
  
  // Add kickers for tie-breaking (weighted by position)
  for (let i = 0; i < sortedValues.length; i++) {
    strength += sortedValues[i] * Math.pow(15, 4 - i);
  }
  
  // For pairs/sets, weight the matched cards more heavily
  if (countArray.length > 0) {
    const primaryValue = countArray[0][0];
    strength += primaryValue * 1000000;
    if (countArray.length > 1) {
      const secondaryValue = countArray[1][0];
      strength += secondaryValue * 10000;
    }
  }
  
  return strength;
}

// Generate a hand of a specific type for power-ups
export function generateSpecificHand(handType: string, availableCards: Card[]): Card[] | null {
  const shuffled = shuffleDeck([...availableCards]);
  
  switch (handType) {
    case 'Two Pair': {
      const valueCounts = getValueCounts(shuffled);
      const pairs: Card[][] = [];
      for (const [, cards] of valueCounts) {
        if (cards.length >= 2) pairs.push(cards.slice(0, 2));
        if (pairs.length === 2) break;
      }
      if (pairs.length < 2) return null;
      const kicker = shuffled.find(c => !pairs[0].includes(c) && !pairs[1].includes(c));
      return kicker ? [...pairs[0], ...pairs[1], kicker] : null;
    }
    case 'Three of a Kind': {
      const valueCounts = getValueCounts(shuffled);
      for (const [, cards] of valueCounts) {
        if (cards.length >= 3) {
          const kickers = shuffled.filter(c => !cards.includes(c)).slice(0, 2);
          return [...cards.slice(0, 3), ...kickers];
        }
      }
      return null;
    }
    case 'Straight': {
      const sorted = [...new Map(shuffled.map(c => [c.value, c])).values()].sort((a, b) => a.value - b.value);
      for (let i = 0; i <= sorted.length - 5; i++) {
        const straight: Card[] = [];
        for (let j = 0; j < 5; j++) {
          if (sorted[i + j]?.value === sorted[i].value + j) {
            straight.push(sorted[i + j]);
          }
        }
        if (straight.length === 5) return straight;
      }
      return null;
    }
    case 'Flush': {
      const suitCounts = getSuitCounts(shuffled);
      for (const [, cards] of suitCounts) {
        if (cards.length >= 5) return cards.slice(0, 5);
      }
      return null;
    }
    case 'Full House': {
      const valueCounts = getValueCounts(shuffled);
      let threeOfKind: Card[] | null = null;
      let pair: Card[] | null = null;
      for (const [, cards] of valueCounts) {
        if (cards.length >= 3 && !threeOfKind) threeOfKind = cards.slice(0, 3);
        else if (cards.length >= 2 && !pair) pair = cards.slice(0, 2);
      }
      if (threeOfKind && pair) return [...threeOfKind, ...pair];
      return null;
    }
    case 'Four of a Kind': {
      const valueCounts = getValueCounts(shuffled);
      for (const [, cards] of valueCounts) {
        if (cards.length >= 4) {
          const kicker = shuffled.find(c => !cards.includes(c));
          return kicker ? [...cards.slice(0, 4), kicker] : null;
        }
      }
      return null;
    }
    case 'Straight Flush': {
      const suitCounts = getSuitCounts(shuffled);
      for (const [, cards] of suitCounts) {
        if (cards.length >= 5) {
          const sorted = [...cards].sort((a, b) => a.value - b.value);
          for (let i = 0; i <= sorted.length - 5; i++) {
            const straight: Card[] = [];
            for (let j = 0; j < 5; j++) {
              if (sorted[i + j]?.value === sorted[i].value + j) {
                straight.push(sorted[i + j]);
              }
            }
            if (straight.length === 5) return straight;
          }
        }
      }
      return null;
    }
    case 'Royal Flush': {
      const suitCounts = getSuitCounts(shuffled);
      for (const [, cards] of suitCounts) {
        const values = cards.map(c => c.value);
        if (values.includes(10) && values.includes(11) && values.includes(12) && values.includes(13) && values.includes(14)) {
          return cards.filter(c => [10, 11, 12, 13, 14].includes(c.value));
        }
      }
      return null;
    }
    default:
      return null;
  }
}

// Create a deck that guarantees at least Two Pair can be achieved
// Used for early bonus rounds to ensure players can get good hands
export function createBonusFriendlyDeck(bonusRoundNumber: number): Card[] {
  const deck = createDeck();
  
  // For early bonus rounds (1-3), ensure there are multiple pairs available
  if (bonusRoundNumber <= 3) {
    // Shuffle first
    const shuffled = shuffleDeck(deck);
    
    // Find cards that form at least 2 pairs and put them at the front
    const valueCounts = new Map<number, Card[]>();
    for (const card of shuffled) {
      const existing = valueCounts.get(card.value) || [];
      existing.push(card);
      valueCounts.set(card.value, existing);
    }
    
    // Collect pairs (values with 2+ cards)
    const pairCards: Card[] = [];
    const otherCards: Card[] = [];
    let pairsFound = 0;
    
    for (const [, cards] of valueCounts) {
      if (cards.length >= 2 && pairsFound < 3) {
        // Take 2 cards for the pair
        pairCards.push(cards[0], cards[1]);
        // Put remaining cards of this value in other
        otherCards.push(...cards.slice(2));
        pairsFound++;
      } else {
        otherCards.push(...cards);
      }
    }
    
    // Shuffle the other cards and combine
    const shuffledOthers = shuffleDeck(otherCards);
    
    // Place pair cards within the first portion of cards that will be shown
    // Interleave pair cards with some other cards for natural feel
    const cardCount = Math.min(bonusRoundNumber * 10, 52);
    const result: Card[] = [];
    
    // Distribute pair cards throughout the visible portion
    const pairPositions = [0, 2, 4, 6, 8, cardCount - 1].slice(0, pairCards.length);
    let pairIndex = 0;
    let otherIndex = 0;
    
    for (let i = 0; i < 52; i++) {
      if (pairPositions.includes(i) && pairIndex < pairCards.length) {
        result.push(pairCards[pairIndex++]);
      } else if (otherIndex < shuffledOthers.length) {
        result.push(shuffledOthers[otherIndex++]);
      } else if (pairIndex < pairCards.length) {
        result.push(pairCards[pairIndex++]);
      }
    }
    
    return result;
  }
  
  // For later bonus rounds, just use a regular shuffled deck
  return shuffleDeck(deck);
}
