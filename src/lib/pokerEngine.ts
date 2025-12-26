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
// Round 1: Levels 1-3 (Static) + Level 4 (Bonus)
// Round 2: Levels 5-7 (Conveyor) + Level 8 (Bonus)
// Round 3: Levels 9-11 (Falling) + Level 12 (Bonus)
// Pattern repeats with 5% difficulty increase and double points per round

export interface SSCLevelInfo {
  phase: 'static' | 'conveyor' | 'falling';
  isBonus: boolean;
  round: number; // 1-indexed round number (each round = 4 levels)
  pointMultiplier: number;
  difficultyMultiplier: number;
}

export function getSSCLevelInfo(level: number): SSCLevelInfo {
  // Each "super round" is 12 levels (3 phases × 4 levels each with bonus)
  const superRound = Math.floor((level - 1) / 12);
  const positionInSuperRound = ((level - 1) % 12) + 1; // 1-12
  
  // Determine phase and bonus status
  let phase: 'static' | 'conveyor' | 'falling';
  let isBonus: boolean;
  let phaseInSuperRound: number;
  
  if (positionInSuperRound <= 4) {
    phase = 'static';
    isBonus = positionInSuperRound === 4;
    phaseInSuperRound = 0;
  } else if (positionInSuperRound <= 8) {
    phase = 'conveyor';
    isBonus = positionInSuperRound === 8;
    phaseInSuperRound = 1;
  } else {
    phase = 'falling';
    isBonus = positionInSuperRound === 12;
    phaseInSuperRound = 2;
  }
  
  // Overall round number (for point doubling)
  const round = superRound * 3 + phaseInSuperRound + 1;
  
  // Points double each round (1x, 2x, 4x, 8x, ...)
  const pointMultiplier = Math.pow(2, round - 1);
  
  // Count bonus rounds completed (every 4 levels is a bonus)
  const bonusRoundsCompleted = Math.floor((level - 1) / 4);
  
  // Difficulty increases by 1% per bonus round completed after the first
  // First 4 levels (before first bonus): 0.7x base
  // After first bonus (level 5+): 0.7x + 1% per additional bonus round
  let difficultyMultiplier: number;
  if (bonusRoundsCompleted <= 1) {
    // No increase until after the first bonus round
    difficultyMultiplier = 0.7;
  } else {
    // 1% increase for each bonus round after the first
    difficultyMultiplier = 0.7 + ((bonusRoundsCompleted - 1) * 0.01);
  }
  
  return {
    phase,
    isBonus,
    round,
    pointMultiplier,
    difficultyMultiplier,
  };
}

export function getSSCPhase(level: number): 'static' | 'conveyor' | 'falling' {
  return getSSCLevelInfo(level).phase;
}

export function isSSCBonusLevel(level: number): boolean {
  return getSSCLevelInfo(level).isBonus;
}

export function getSSCPointMultiplier(level: number): number {
  return getSSCLevelInfo(level).pointMultiplier;
}

export function calculateLevelGoal(level: number): number {
  const info = getSSCLevelInfo(level);
  
  // Base goals: Level 1 = 1000, then increase
  let baseGoal: number;
  if (level === 1) baseGoal = 1000;
  else if (level <= 3) baseGoal = 1000 + (level - 1) * 500; // 1500, 2000
  else baseGoal = 2000 + (level - 3) * 300;
  
  // Apply difficulty multiplier
  baseGoal = Math.floor(baseGoal * info.difficultyMultiplier);
  
  // Bonus levels have higher goals
  if (info.isBonus) {
    baseGoal = Math.floor(baseGoal * 1.5);
  }
  
  return baseGoal;
}

export function getSSCSpeed(level: number): number {
  const info = getSSCLevelInfo(level);
  
  if (info.phase === 'static') return 0;
  
  // Position within phase (1-3 for regular levels, 4 for bonus)
  const superRound = Math.floor((level - 1) / 12);
  const positionInSuperRound = ((level - 1) % 12) + 1;
  
  let phasePosition: number;
  if (info.phase === 'conveyor') {
    phasePosition = positionInSuperRound - 4;
  } else {
    phasePosition = positionInSuperRound - 8;
  }
  
  // Base speed + increase per level in phase + difficulty scaling
  const baseSpeed = info.phase === 'conveyor' ? 0.4 : 0.6;
  const speedIncrement = info.phase === 'conveyor' ? 0.1 : 0.15;
  const speed = baseSpeed + (phasePosition - 1) * speedIncrement;
  
  // Apply difficulty multiplier for higher rounds
  return speed * info.difficultyMultiplier;
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
