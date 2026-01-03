import { Card, HandResult, POKER_HANDS, RANK_VALUES, Rank, Suit, SUITS, RANKS } from '@/types/game';

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

function isFlush(cards: Card[]): boolean {
  const suits = getSuitCounts(cards);
  return Array.from(suits.values()).some(group => group.length >= 5);
}

function isStraight(cards: Card[]): boolean {
  const values = [...new Set(cards.map(c => c.value))].sort((a, b) => a - b);
  
  // Check for regular straight
  for (let i = 0; i <= values.length - 5; i++) {
    let consecutive = true;
    for (let j = 0; j < 4; j++) {
      if (values[i + j + 1] - values[i + j] !== 1) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) return true;
  }
  
  // Check for Ace-low straight (A-2-3-4-5)
  if (values.includes(14) && values.includes(2) && values.includes(3) && values.includes(4) && values.includes(5)) {
    return true;
  }
  
  return false;
}

function isRoyalFlush(cards: Card[]): boolean {
  const suits = getSuitCounts(cards);
  for (const [, suitCards] of suits) {
    if (suitCards.length >= 5) {
      const values = suitCards.map(c => c.value).sort((a, b) => a - b);
      if (values.includes(10) && values.includes(11) && values.includes(12) && values.includes(13) && values.includes(14)) {
        return true;
      }
    }
  }
  return false;
}

function isStraightFlush(cards: Card[]): boolean {
  const suits = getSuitCounts(cards);
  for (const [, suitCards] of suits) {
    if (suitCards.length >= 5 && isStraight(suitCards)) {
      return true;
    }
  }
  return false;
}

export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length !== 5) {
    return {
      hand: POKER_HANDS[9], // High Card
      cards,
      valueBonus: cards.reduce((sum, c) => sum + c.value, 0),
      totalPoints: 5 + cards.reduce((sum, c) => sum + c.value, 0)
    };
  }

  const valueCounts = getValueCounts(cards);
  const countValues = Array.from(valueCounts.values()).map(group => group.length).sort((a, b) => b - a);
  const valueBonus = cards.reduce((sum, c) => sum + c.value, 0);

  let hand = POKER_HANDS[9]; // Default: High Card

  // Check from highest to lowest
  if (isRoyalFlush(cards)) {
    hand = POKER_HANDS[0];
  } else if (isStraightFlush(cards)) {
    hand = POKER_HANDS[1];
  } else if (countValues[0] === 4) {
    hand = POKER_HANDS[2]; // Four of a Kind
  } else if (countValues[0] === 3 && countValues[1] === 2) {
    hand = POKER_HANDS[3]; // Full House
  } else if (isFlush(cards)) {
    hand = POKER_HANDS[4];
  } else if (isStraight(cards)) {
    hand = POKER_HANDS[5];
  } else if (countValues[0] === 3) {
    hand = POKER_HANDS[6]; // Three of a Kind
  } else if (countValues[0] === 2 && countValues[1] === 2) {
    hand = POKER_HANDS[7]; // Two Pair
  } else if (countValues[0] === 2) {
    hand = POKER_HANDS[8]; // One Pair
  }

  return {
    hand,
    cards,
    valueBonus,
    totalPoints: hand.basePoints + valueBonus
  };
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
// Levels follow strict 12-level rotation starting at cycle 4:
// 1-3 Static, 4-6 Conveyor, 7-9 Falling, 10-12 Orbit (Orbit starts at Level 37, cycle 4)
// Cycles 1-3 (Levels 1-36): 9-level rotation (Static, Conveyor, Falling)
// Cycles 4+: 12-level rotation (Static, Conveyor, Falling, Orbit)
// Bonus rounds occur AFTER every 3 levels but don't count as levels.

export interface SSCLevelInfo {
  phase: 'static' | 'conveyor' | 'falling' | 'orbit';
  round: number; // Which cycle we're in (1-indexed)
  difficultyMultiplier: number;
}

// Get level info for a numbered level (NOT bonus round)
export function getSSCLevelInfo(level: number): SSCLevelInfo {
  // Orbit mode starts at Level 37 (4th cycle)
  const orbitStartLevel = 37;
  
  let phase: 'static' | 'conveyor' | 'falling' | 'orbit';
  let round: number;
  
  if (level < orbitStartLevel) {
    // Cycles 1-3: 9-level rotation (no Orbit)
    const cyclePosition = ((level - 1) % 9) + 1; // 1-9
    
    if (cyclePosition <= 3) {
      phase = 'static';
    } else if (cyclePosition <= 6) {
      phase = 'conveyor';
    } else {
      phase = 'falling';
    }
    
    round = Math.ceil(level / 9);
  } else {
    // Cycles 4+: 12-level rotation with Orbit
    const levelInOrbitEra = level - orbitStartLevel + 1; // 1-indexed from Level 37
    const cyclePosition = ((levelInOrbitEra - 1) % 12) + 1; // 1-12
    
    if (cyclePosition <= 3) {
      phase = 'static';
    } else if (cyclePosition <= 6) {
      phase = 'conveyor';
    } else if (cyclePosition <= 9) {
      phase = 'falling';
    } else {
      phase = 'orbit';
    }
    
    // Round 4 starts at Level 37
    round = 3 + Math.ceil(levelInOrbitEra / 12);
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

export function getSSCPhase(level: number): 'static' | 'conveyor' | 'falling' | 'orbit' {
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
  
  if (info.phase === 'static') return 0;
  
  // Base speeds for moving modes
  let baseSpeed: number;
  
  if (info.phase === 'conveyor') {
    baseSpeed = 1.2;
  } else if (info.phase === 'falling') {
    // Falling mode: reduced speed (15% slower) for first cycle (levels 7-9)
    const isFirstFallingCycle = level >= 7 && level <= 9;
    baseSpeed = isFirstFallingCycle ? 1.53 : 1.8;
  } else {
    // Orbit mode: base speed of 1.5 (between conveyor and falling)
    baseSpeed = 1.5;
  }
  
  // Speed scaling logic:
  // - Levels 1-10: No speed increase (use base speed)
  // - Levels 11+: 
  //   - Falling mode: 0.5% linear increase per level (reduced from 2%)
  //   - Conveyor/Orbit: 2% linear increase per level
  if (level >= 11) {
    const levelsAbove10 = level - 10;
    
    if (info.phase === 'falling') {
      // Falling mode gets slower acceleration (0.5% per level)
      const speedIncrease = 1 + (levelsAbove10 * 0.005);
      return baseSpeed * speedIncrease;
    } else {
      // Conveyor and Orbit maintain original 2% scaling
      const speedIncrease = 1 + (levelsAbove10 * 0.02);
      return baseSpeed * speedIncrease;
    }
  }
  
  return baseSpeed;
}

// Get orbital speed for a specific ring (outer rings move faster)
export function getOrbitRingSpeed(level: number, ringIndex: number, totalRings: number): number {
  const baseSpeed = getSSCSpeed(level);
  // Outer rings (higher index) move faster
  // Ring 0 (innermost) = baseSpeed, outer rings scale up
  const ringMultiplier = 1 + (ringIndex / totalRings) * 0.5; // Up to 50% faster for outermost
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
