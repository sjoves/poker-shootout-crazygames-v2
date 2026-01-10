import { useState, useCallback, useEffect } from 'react';
import { POWER_UPS, Card, HandResult } from '@/types/game';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { StaticGrid } from '@/components/game/StaticGrid';
import { HandDisplay } from '@/components/game/HandDisplay';
import { createDeck, shuffleDeck, evaluateHand, generateSpecificHand } from '@/lib/pokerEngine';
import { useAudio } from '@/contexts/AudioContext';

export default function TestPowerUps() {
  const navigate = useNavigate();
  const { playSound } = useAudio();
  
  // Game state
  const [deck, setDeck] = useState<Card[]>(() => shuffleDeck(createDeck()));
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [currentHand, setCurrentHand] = useState<HandResult | null>(null);
  const [usedCards, setUsedCards] = useState<Card[]>([]);

  // Select a card
  const handleSelectCard = useCallback((card: Card) => {
    if (selectedCards.length >= 5) return;
    if (selectedCards.some(c => c.id === card.id)) return;
    
    setSelectedCards(prev => [...prev, card]);
    setDeck(prev => prev.filter(c => c.id !== card.id));
    setUsedCards(prev => [...prev, card]);
  }, [selectedCards]);

  // Evaluate hand when 5 cards selected
  useEffect(() => {
    if (selectedCards.length === 5) {
      const result = evaluateHand(selectedCards);
      setCurrentHand(result);
      playSound('handSubmit');
      
      // Auto-clear after showing result
      const timer = setTimeout(() => {
        // Recycle cards back to deck
        setDeck(prev => shuffleDeck([...prev, ...selectedCards]));
        setSelectedCards([]);
        setCurrentHand(null);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [selectedCards, playSound]);

  // Use a power-up
  const handleUsePowerUp = useCallback((powerUpId: string) => {
    console.log('[TestPowerUps] Using power-up:', powerUpId);
    
    const powerUp = POWER_UPS.find(p => p.id === powerUpId);
    if (!powerUp) {
      console.log('[TestPowerUps] Power-up not found:', powerUpId);
      return;
    }

    // Handle reshuffle
    if (powerUp.id === 'reshuffle') {
      console.log('[TestPowerUps] Reshuffling deck');
      setDeck(prev => shuffleDeck([...prev]));
      playSound('cardSelect');
      return;
    }

    // Handle add time (just log for test)
    if (powerUp.id === 'add_time') {
      console.log('[TestPowerUps] Add time triggered (+15s)');
      playSound('cardSelect');
      return;
    }

    // For hand-type power-ups, generate the hand
    if (powerUp.handType) {
      console.log('[TestPowerUps] Generating hand:', powerUp.handType);
      const hand = generateSpecificHand(powerUp.handType, deck);
      
      if (!hand) {
        console.log('[TestPowerUps] Could not generate hand - not enough cards');
        return;
      }

      console.log('[TestPowerUps] Generated:', hand.map(c => `${c.rank}${c.suit[0]}`).join(', '));
      
      // Set the selected cards and remove from deck
      setSelectedCards(hand);
      setDeck(prev => prev.filter(c => !hand.some(h => h.id === c.id)));
      setUsedCards(prev => [...prev, ...hand]);
      playSound('handSubmit');
    }
  }, [deck, playSound]);

  // Reset game
  const handleReset = () => {
    const newDeck = shuffleDeck(createDeck());
    setDeck(newDeck);
    setSelectedCards([]);
    setCurrentHand(null);
    setUsedCards([]);
  };

  const tierColors = {
    1: 'border-bronze bg-bronze/10',
    2: 'border-silver bg-silver/10',
    3: 'border-gold bg-gold/10',
  };

  return (
    <div className="h-screen flex flex-col modern-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-primary/20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-display text-primary">Power-Ups Test (Sitting Duck)</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      {/* Power-ups bar - horizontal across top */}
      <div className="p-3 border-b border-primary/20 bg-card/30">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap mr-2">Power-ups:</span>
          {POWER_UPS.map(powerUp => {
            const tierColor = powerUp.tier === 3 ? 'border-gold bg-gold/20 hover:bg-gold/30' 
                            : powerUp.tier === 2 ? 'border-silver bg-silver/20 hover:bg-silver/30'
                            : 'border-bronze bg-bronze/20 hover:bg-bronze/30';
            return (
              <button
                key={powerUp.id}
                onClick={() => handleUsePowerUp(powerUp.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all hover:scale-105 active:scale-95 ${tierColor}`}
                title={`${powerUp.name}: ${powerUp.description}`}
              >
                <span className="text-2xl">{powerUp.emoji}</span>
                <span className="text-sm font-medium text-foreground whitespace-nowrap">{powerUp.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main game area */}
      <div className="flex-1 relative overflow-hidden">
        <StaticGrid
          deck={deck}
          selectedCardIds={selectedCards.map(c => c.id)}
          onSelectCard={handleSelectCard}
        />
        
        {/* Hand display */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
          <HandDisplay cards={selectedCards} currentHand={currentHand} />
        </div>
      </div>

      {/* Status bar */}
      <div className="p-3 border-t border-primary/20 bg-card/50">
        <div className="flex items-center justify-center gap-6 text-sm">
          <span className="text-muted-foreground">
            Cards in deck: <span className="text-foreground font-medium">{deck.length}</span>
          </span>
          <span className="text-muted-foreground">
            Selected: <span className="text-foreground font-medium">{selectedCards.length}/5</span>
          </span>
        </div>
      </div>
    </div>
  );
}
