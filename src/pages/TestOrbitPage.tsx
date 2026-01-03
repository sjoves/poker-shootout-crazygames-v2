import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createDeck } from '@/lib/pokerEngine';
import { OrbitCards } from '@/components/game/OrbitCards';
import { Card } from '@/types/game';

const TestOrbitPage = () => {
  const navigate = useNavigate();
  const [testLevel, setTestLevel] = useState(22);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [reshuffleTrigger, setReshuffleTrigger] = useState(0);
  
  // Create a deck for testing
  const [deck] = useState(() => createDeck());

  const handleSelectCard = (card: Card) => {
    if (selectedCards.length < 5) {
      setSelectedCards(prev => [...prev, card]);
    }
  };

  const handleReset = () => {
    setSelectedCards([]);
    setReshuffleTrigger(prev => prev + 1);
  };

  // Calculate speed info for display
  const BASE_SPEED = 1.05;
  const scalingRate = 0.005;
  const levelFactor = testLevel > 10 ? (testLevel - 10) * scalingRate : 0;
  const scaledSpeed = BASE_SPEED * (1 + levelFactor);
  const speedPercentIncrease = testLevel > 10 ? ((testLevel - 10) * 0.5).toFixed(1) : '0';

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="p-4 flex justify-between items-center border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold font-display">Orbit Phase Debugger</h1>
        <Button 
          variant="outline"
          size="icon"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </Button>
      </header>

      {/* Main Simulation Area */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-background to-muted/30">
        <OrbitCards
          deck={deck}
          selectedCardIds={selectedCards.map(c => c.id)}
          onSelectCard={handleSelectCard}
          level={testLevel}
          isPaused={isPaused}
          reshuffleTrigger={reshuffleTrigger}
        />
      </div>

      {/* Selected Cards Display */}
      {selectedCards.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2 bg-muted/50 border-t border-border"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Selected:</span>
            <div className="flex gap-1">
              {selectedCards.map(card => (
                <div 
                  key={card.id} 
                  className={`w-8 h-10 rounded border flex items-center justify-center text-xs font-bold ${
                    card.suit === 'hearts' || card.suit === 'diamonds' 
                      ? 'text-red-500 bg-card' 
                      : 'text-foreground bg-card'
                  }`}
                >
                  {card.rank}{card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset} className="ml-auto">
              Reset
            </Button>
          </div>
        </motion.div>
      )}

      {/* Control Dashboard */}
      <footer className="p-4 bg-card border-t border-border">
        <div className="space-y-4">
          {/* Level Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium">SSC Level: {testLevel}</label>
              <span className="text-xs text-muted-foreground">
                {testLevel > 10 ? `+${speedPercentIncrease}% Speed` : 'Base Speed'}
              </span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="100" 
              value={testLevel} 
              onChange={(e) => setTestLevel(parseInt(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Ring Info Grid */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-muted rounded border border-border">
              <p className="text-muted-foreground mb-1">Inner Ring</p>
              <p className="font-mono">8 cards • 1.0×</p>
              <p className="font-mono text-primary">{(scaledSpeed * 1.0).toFixed(3)}</p>
            </div>
            <div className="p-2 bg-muted rounded border border-border">
              <p className="text-muted-foreground mb-1">Middle Ring</p>
              <p className="font-mono">12 cards • 1.15×</p>
              <p className="font-mono text-primary">{(scaledSpeed * 1.15).toFixed(3)}</p>
            </div>
            <div className="p-2 bg-muted rounded border border-border">
              <p className="text-muted-foreground mb-1">Outer Ring</p>
              <p className="font-mono">16 cards • 1.3×</p>
              <p className="font-mono text-primary">{(scaledSpeed * 1.3).toFixed(3)}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TestOrbitPage;
