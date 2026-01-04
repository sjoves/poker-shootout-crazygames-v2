import { useCallback } from 'react';
import { Card, GameState } from '@/types/game';

export function useCardSelection(
  setState: React.Dispatch<React.SetStateAction<GameState>>
) {
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
        usedCards: shouldRecycle ? prev.usedCards : newUsedCards,
        deck: newDeck,
        cardsSelected: prev.cardsSelected + 1,
      };
    });
  }, [setState]);

  return { selectCard };
}
