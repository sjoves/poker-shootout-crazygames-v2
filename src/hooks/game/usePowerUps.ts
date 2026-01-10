import { useCallback } from 'react';
import { GameState, POWER_UPS } from '@/types/game';
import { shuffleDeck, generateSpecificHand } from '@/lib/pokerEngine';

export type RewardTier = 'bronze' | 'silver' | 'gold';

export function getRewardTier(score: number): RewardTier {
  if (score > 1200) return 'gold';
  if (score >= 500) return 'silver';
  return 'bronze';
}

export function getTierDisplayInfo(tier: RewardTier): { name: string; color: string; emoji: string } {
  switch (tier) {
    case 'gold':
      return { name: 'Gold', color: 'text-gold', emoji: '🥇' };
    case 'silver':
      return { name: 'Silver', color: 'text-silver', emoji: '🥈' };
    case 'bronze':
      return { name: 'Bronze', color: 'text-bronze', emoji: '🥉' };
  }
}

// Get power-ups available for a specific tier
function getPowerUpsForTier(tier: RewardTier): string[] {
  const tierNumber = tier === 'gold' ? 3 : tier === 'silver' ? 2 : 1;
  return POWER_UPS.filter(p => p.tier === tierNumber).map(p => p.id);
}

// Select a random power-up based on bonus round score
export function selectRewardPowerUp(score: number): string | null {
  const tier = getRewardTier(score);
  const availablePowerUps = getPowerUpsForTier(tier);
  
  if (availablePowerUps.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * availablePowerUps.length);
  return availablePowerUps[randomIndex];
}

export function usePowerUps(
  setState: React.Dispatch<React.SetStateAction<GameState>>
) {
  const usePowerUp = useCallback((powerUpId: string) => {
    console.log('[usePowerUp] Called with powerUpId:', powerUpId);
    setState(prev => {
      console.log('[usePowerUp] Current state - earnedPowerUps:', prev.earnedPowerUps, 'activePowerUps:', prev.activePowerUps);
      if (!prev.activePowerUps.includes(powerUpId)) {
        console.log('[PowerUp] Not in activePowerUps:', powerUpId, 'available:', prev.activePowerUps);
        return prev;
      }

      const powerUp = POWER_UPS.find(p => p.id === powerUpId);
      if (!powerUp) {
        console.log('[PowerUp] Power-up not found:', powerUpId);
        return prev;
      }

      console.log('[PowerUp] Using power-up:', powerUp.name, 'handType:', powerUp.handType);

      // Handle reshuffle power-up
      if (powerUp.id === 'reshuffle') {
        const shuffledDeck = shuffleDeck([...prev.deck]);
        // Remove power-up from both earned and active lists (consumed until won again)
        const newEarnedPowerUps = prev.earnedPowerUps.filter(id => id !== powerUpId);
        const newActivePowerUps = prev.activePowerUps.filter(id => id !== powerUpId);
        return {
          ...prev,
          deck: shuffledDeck,
          reshuffleTrigger: prev.reshuffleTrigger + 1,
          earnedPowerUps: newEarnedPowerUps,
          activePowerUps: newActivePowerUps,
        };
      }

      if (powerUp.id === 'add_time') {
        // Remove power-up from both earned and active lists (consumed until won again)
        const newEarnedPowerUps = prev.earnedPowerUps.filter(id => id !== powerUpId);
        const newActivePowerUps = prev.activePowerUps.filter(id => id !== powerUpId);
        return {
          ...prev,
          timeRemaining: prev.timeRemaining + 15,
          earnedPowerUps: newEarnedPowerUps,
          activePowerUps: newActivePowerUps,
        };
      }

      // For hand-type power-ups, we need to find cards in the deck
      // Combine deck with any unselected cards for maximum options
      const availableCards = [...prev.deck];
      console.log('[PowerUp] Available cards for hand generation:', availableCards.length);

      // Generate the specific hand
      const hand = generateSpecificHand(powerUp.handType, availableCards);
      if (!hand) {
        console.log('[PowerUp] Could not generate hand:', powerUp.handType, '- deck may not have required cards');
        // Don't consume the power-up if we can't generate the hand
        return prev;
      }

      console.log('[PowerUp] Generated hand:', hand.map(c => `${c.rank}${c.suit[0]}`).join(', '));

      // Remove the used cards from the deck
      const newDeck = prev.deck.filter(c => !hand.some(h => h.id === c.id));
      
      // Remove power-up from both earned and active lists (consumed)
      const newEarnedPowerUps = prev.earnedPowerUps.filter(id => id !== powerUpId);
      const newActivePowerUps = prev.activePowerUps.filter(id => id !== powerUpId);

      return {
        ...prev,
        selectedCards: hand,
        deck: newDeck,
        usedCards: [...prev.usedCards, ...hand],
        earnedPowerUps: newEarnedPowerUps,
        activePowerUps: newActivePowerUps,
      };
    });
  }, [setState]);

  // Claim the pending reward (add to inventory - no limit)
  const claimReward = useCallback(() => {
    console.log('[claimReward] Called');
    setState(prev => {
      console.log('[claimReward] pendingReward:', prev.pendingReward, 'earnedPowerUps:', prev.earnedPowerUps, 'activePowerUps:', prev.activePowerUps);
      if (!prev.pendingReward) return prev;
      
      const newEarnedPowerUps = [...prev.earnedPowerUps, prev.pendingReward];
      const newActivePowerUps = [...prev.activePowerUps, prev.pendingReward];
      
      return {
        ...prev,
        earnedPowerUps: newEarnedPowerUps,
        activePowerUps: newActivePowerUps,
        pendingReward: null,
        rewardTier: null,
        showLootBox: false,
        inventoryFull: false,
      };
    });
  }, [setState]);

  // Swap: discard an existing power-up to make room for the new one
  const swapPowerUp = useCallback((discardPowerUpId: string) => {
    setState(prev => {
      if (!prev.pendingReward) return prev;
      
      const newEarnedPowerUps = prev.earnedPowerUps.filter(id => id !== discardPowerUpId);
      const newActivePowerUps = prev.activePowerUps.filter(id => id !== discardPowerUpId);
      
      newEarnedPowerUps.push(prev.pendingReward);
      newActivePowerUps.push(prev.pendingReward);
      
      return {
        ...prev,
        earnedPowerUps: newEarnedPowerUps,
        activePowerUps: newActivePowerUps,
        pendingReward: null,
        rewardTier: null,
        showLootBox: false,
        inventoryFull: false,
      };
    });
  }, [setState]);

  // Discard the new reward (keep current inventory)
  const discardReward = useCallback(() => {
    setState(prev => ({
      ...prev,
      pendingReward: null,
      rewardTier: null,
      showLootBox: false,
      inventoryFull: false,
    }));
  }, [setState]);

  // Legacy: kept for backward compatibility
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
  }, [setState]);

  const dismissPowerUpSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      powerUpChoices: [],
      showPowerUpSelection: false,
      showLootBox: false,
      pendingReward: null,
      rewardTier: null,
      inventoryFull: false,
    }));
  }, [setState]);

  return {
    usePowerUp,
    claimReward,
    swapPowerUp,
    discardReward,
    selectPowerUp,
    dismissPowerUpSelection,
  };
}
