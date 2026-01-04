import type { Card, Suit, Rank } from '@/types/game';
import { SUITS, RANKS, RANK_VALUES } from '@/types/game';

export interface SmartDropResult {
  isOneAway: boolean;
  targetHand: string | null;
  neededCards: Card[];
}

/**
 * Analyzes 4 cards to determine if they're "one card away" from a high-ranking hand.
 * Returns the cards needed to complete the hand.
 */
export function analyzeOneAwayHand(selectedCards: Card[], availableDeck: Card[]): SmartDropResult {
  if (selectedCards.length !== 4) {
    return { isOneAway: false, targetHand: null, neededCards: [] };
  }

  const neededCards: Card[] = [];
  let targetHand: string | null = null;

  // Check for one-away from Four of a Kind (3 of same rank + 1 other)
  const fourOfKindCard = checkOneAwayFourOfKind(selectedCards, availableDeck);
  if (fourOfKindCard) {
    neededCards.push(fourOfKindCard);
    targetHand = 'Four of a Kind';
  }

  // Check for one-away from Flush (4 of same suit)
  if (!targetHand) {
    const flushCard = checkOneAwayFlush(selectedCards, availableDeck);
    if (flushCard) {
      neededCards.push(flushCard);
      targetHand = 'Flush';
    }
  }

  // Check for one-away from Straight (4 consecutive or gap of 1)
  if (!targetHand) {
    const straightCard = checkOneAwayStraight(selectedCards, availableDeck);
    if (straightCard) {
      neededCards.push(straightCard);
      targetHand = 'Straight';
    }
  }

  // Check for one-away from Full House (3+1 or 2+2)
  if (!targetHand) {
    const fullHouseCard = checkOneAwayFullHouse(selectedCards, availableDeck);
    if (fullHouseCard) {
      neededCards.push(fullHouseCard);
      targetHand = 'Full House';
    }
  }

  return {
    isOneAway: neededCards.length > 0,
    targetHand,
    neededCards,
  };
}

function checkOneAwayFourOfKind(cards: Card[], deck: Card[]): Card | null {
  // Count ranks
  const rankCounts: Record<string, number> = {};
  cards.forEach(c => {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
  });

  // Find rank with 3 cards
  for (const [rank, count] of Object.entries(rankCounts)) {
    if (count === 3) {
      // Need the 4th card of this rank
      const needed = deck.find(c => c.rank === rank);
      if (needed) return needed;
    }
  }
  return null;
}

function checkOneAwayFlush(cards: Card[], deck: Card[]): Card | null {
  // Count suits
  const suitCounts: Record<string, number> = {};
  cards.forEach(c => {
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  });

  // All 4 same suit - need any card of that suit
  for (const [suit, count] of Object.entries(suitCounts)) {
    if (count === 4) {
      // Need any card of this suit for a flush
      const needed = deck.find(c => c.suit === suit);
      if (needed) return needed;
    }
  }
  return null;
}

function checkOneAwayStraight(cards: Card[], deck: Card[]): Card | null {
  // Get sorted values
  const values = cards.map(c => c.value).sort((a, b) => a - b);
  
  // Check for 4 consecutive (gap at start or end)
  const isConsecutive = values[1] === values[0] + 1 && 
                        values[2] === values[1] + 1 && 
                        values[3] === values[2] + 1;
  
  if (isConsecutive) {
    // Need card at start or end
    const lowValue = values[0] - 1;
    const highValue = values[3] + 1;
    
    // Prefer completing at the high end
    if (highValue <= 14) {
      const needed = deck.find(c => c.value === highValue);
      if (needed) return needed;
    }
    if (lowValue >= 2) {
      const needed = deck.find(c => c.value === lowValue);
      if (needed) return needed;
    }
    // Special case: A-2-3-4 needs 5, or 10-J-Q-K needs A
    if (values[0] === 2 && values[3] === 5) {
      const ace = deck.find(c => c.rank === 'A');
      if (ace) return ace;
    }
    if (values[0] === 10 && values[3] === 13) {
      const ace = deck.find(c => c.rank === 'A');
      if (ace) return ace;
    }
  }
  
  // Check for one gap (e.g., 3-4-5-7 needs 6, or 3-5-6-7 needs 4)
  for (let i = 0; i < 3; i++) {
    const gaps = [];
    let totalGap = 0;
    
    for (let j = 0; j < 3; j++) {
      const gap = values[j + 1] - values[j];
      gaps.push(gap);
      totalGap += gap;
    }
    
    // If total span is 4 (straight span) and there's exactly one gap of 2
    if (totalGap === 4) {
      const gapIndex = gaps.findIndex(g => g === 2);
      if (gapIndex !== -1 && gaps.filter(g => g === 2).length === 1) {
        const neededValue = values[gapIndex] + 1;
        const needed = deck.find(c => c.value === neededValue);
        if (needed) return needed;
      }
    }
  }
  
  // Check for edge straights with Ace
  // A-2-3-4 or 10-J-Q-A patterns
  const hasAce = cards.some(c => c.rank === 'A');
  if (hasAce) {
    const nonAceValues = cards.filter(c => c.rank !== 'A').map(c => c.value).sort((a, b) => a - b);
    
    // Low straight: A-2-3-4 needs 5
    if (nonAceValues.length === 3 && 
        nonAceValues[0] === 2 && nonAceValues[1] === 3 && nonAceValues[2] === 4) {
      const needed = deck.find(c => c.value === 5);
      if (needed) return needed;
    }
    
    // High straight: 10-J-Q-A needs K, or J-Q-K-A needs 10
    if (nonAceValues.length === 3) {
      if (nonAceValues[0] === 10 && nonAceValues[1] === 11 && nonAceValues[2] === 12) {
        const needed = deck.find(c => c.rank === 'K');
        if (needed) return needed;
      }
      if (nonAceValues[0] === 11 && nonAceValues[1] === 12 && nonAceValues[2] === 13) {
        const needed = deck.find(c => c.value === 10);
        if (needed) return needed;
      }
    }
  }
  
  return null;
}

function checkOneAwayFullHouse(cards: Card[], deck: Card[]): Card | null {
  const rankCounts: Record<string, number> = {};
  cards.forEach(c => {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
  });
  
  const counts = Object.entries(rankCounts);
  
  // 3 + 1: Need another of the single card's rank
  const threeOfKind = counts.find(([_, c]) => c === 3);
  const single = counts.find(([_, c]) => c === 1);
  
  if (threeOfKind && single) {
    const needed = deck.find(c => c.rank === single[0]);
    if (needed) return needed;
  }
  
  // 2 + 2: Need another of either pair
  const pairs = counts.filter(([_, c]) => c === 2);
  if (pairs.length === 2) {
    // Pick one pair to complete to trips
    const needed = deck.find(c => c.rank === pairs[0][0] || c.rank === pairs[1][0]);
    if (needed) return needed;
  }
  
  return null;
}

/**
 * Generate a random delay between 1-10 seconds for Smart Drop
 */
export function getSmartDropDelay(): number {
  return (Math.random() * 9 + 1) * 1000; // 1000ms to 10000ms
}
