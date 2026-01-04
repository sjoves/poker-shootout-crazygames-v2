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
  }, [setState]);

  // Claim the pending reward (add to inventory - no limit)
  const claimReward = useCallback(() => {
    setState(prev => {
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
