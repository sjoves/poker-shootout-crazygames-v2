import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, Zap, RotateCcw, Gift, Trophy, Target, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card as CardType, SSCPhase, POWER_UPS, HandResult } from '@/types/game';
import { createDeck, shuffleDeck, generateSpecificHand, calculateLevelGoal } from '@/lib/pokerEngine';
import { StaticGrid } from '@/components/game/StaticGrid';
import { ConveyorBelt } from '@/components/game/ConveyorBelt';
import { FallingCards } from '@/components/game/FallingCards';
import { OrbitCards } from '@/components/game/OrbitCards';
import { BonusRound } from '@/components/game/BonusRound';
import { LevelCompleteModal } from '@/components/game/LevelCompleteModal';
import { PlayingCard } from '@/components/game/PlayingCard';

const PHASES: SSCPhase[] = ['static', 'conveyor', 'falling', 'orbit'];

const HAND_TYPES = [
  'Royal Flush',
  'Straight Flush', 
  'Four of a Kind',
  'Full House',
  'Flush',
  'Straight',
  'Three of a Kind',
  'Two Pair',
  'One Pair',
];

const DevSandbox = () => {
  const navigate = useNavigate();
  
  // Game state
  const [phase, setPhase] = useState<SSCPhase>('static');
  const [level, setLevel] = useState(22);
  const [isPaused, setIsPaused] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [deck, setDeck] = useState<CardType[]>(() => shuffleDeck(createDeck()));
  const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
  const [reshuffleTrigger, setReshuffleTrigger] = useState(0);
  
  // Power-up inventory
  const [inventory, setInventory] = useState<string[]>([]);
  
  // Modal states
  const [showBonusRound, setShowBonusRound] = useState(false);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  
  // Calculate speeds based on level and phase
  const getPhaseSpeed = () => {
    if (phase === 'conveyor') return 1.2 * (1 + (level > 10 ? (level - 10) * 0.02 : 0));
    if (phase === 'falling') return 1.5 * (1 + (level > 10 ? (level - 10) * 0.005 : 0));
    if (phase === 'orbit') return 1.05 * (1 + (level > 10 ? (level - 10) * 0.005 : 0));
    return 1;
  };
  const effectiveSpeed = getPhaseSpeed() * speedMultiplier;
  
  const handleSelectCard = useCallback((card: CardType) => {
    if (selectedCards.length < 5 && !selectedCards.some(c => c.id === card.id)) {
      setSelectedCards(prev => [...prev, card]);
      setDeck(prev => prev.filter(c => c.id !== card.id));
    }
  }, [selectedCards]);

  const handleReset = useCallback(() => {
    setSelectedCards([]);
    setDeck(shuffleDeck(createDeck()));
    setReshuffleTrigger(prev => prev + 1);
  }, []);

  const handleForceHand = useCallback((handType: string) => {
    const hand = generateSpecificHand(handType, deck);
    if (hand && hand.length === 5) {
      setSelectedCards(hand);
      setDeck(prev => prev.filter(c => !hand.some(h => h.id === c.id)));
    }
  }, [deck]);

  const handleAddPowerUp = useCallback((powerUpId: string) => {
    if (inventory.length < 3 && !inventory.includes(powerUpId)) {
      setInventory(prev => [...prev, powerUpId]);
    }
  }, [inventory]);

  const handleRemovePowerUp = useCallback((powerUpId: string) => {
    setInventory(prev => prev.filter(id => id !== powerUpId));
  }, []);

  const handleBonusSubmit = useCallback((cards: CardType[], result: HandResult, timeRemaining: number) => {
    setShowBonusRound(false);
    setShowLevelComplete(true);
  }, []);

  // Speed info calculations
  const conveyorSpeed = 1.2 * (1 + (level > 10 ? (level - 10) * 0.02 : 0));
  const fallingSpeed = 1.5 * (1 + (level > 10 ? (level - 10) * 0.005 : 0));
  const orbitSpeed = 1.05 * (1 + (level > 10 ? (level - 10) * 0.005 : 0));
  const levelGoal = calculateLevelGoal(level);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 p-3 flex justify-between items-center border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold font-display">Dev Sandbox</h1>
        <div className="flex gap-2">
          <Button 
            variant={speedMultiplier === 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setSpeedMultiplier(speedMultiplier === 0 ? 1 : 0)}
          >
            {speedMultiplier === 0 ? '▶' : '⏸'}
          </Button>
          <Button 
            variant={speedMultiplier === 2 ? "default" : "outline"}
            size="sm"
            onClick={() => setSpeedMultiplier(speedMultiplier === 2 ? 1 : 2)}
          >
            2×
          </Button>
        </div>
      </header>

      {/* Control Panel */}
      <div className="flex-shrink-0 p-3 bg-muted/50 border-b border-border space-y-3">
        {/* Phase Selector */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground self-center w-14">Phase:</span>
          {PHASES.map(p => (
            <Button
              key={p}
              variant={phase === p ? "default" : "outline"}
              size="sm"
              onClick={() => { setPhase(p); handleReset(); }}
              className="capitalize text-xs"
            >
              {p}
            </Button>
          ))}
        </div>

        {/* Level Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-14">Level:</span>
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={level} 
            onChange={(e) => setLevel(parseInt(e.target.value))}
            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-sm font-mono w-8">{level}</span>
          <span className="text-xs text-muted-foreground">Goal: {levelGoal}</span>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowBonusRound(true)}>
            <Gift className="w-4 h-4 mr-1" /> Bonus
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowLevelComplete(true)}>
            <Trophy className="w-4 h-4 mr-1" /> Win
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/game-over')}>
            <Target className="w-4 h-4 mr-1" /> Game Over
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" /> Reset
          </Button>
        </div>

        {/* Power-up Inventory */}
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-muted-foreground w-14">Power:</span>
          <div className="flex gap-1">
            {inventory.map(id => {
              const powerUp = POWER_UPS.find(p => p.id === id);
              return powerUp ? (
                <Button
                  key={id}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRemovePowerUp(id)}
                  className="text-xs"
                >
                  {powerUp.emoji} {powerUp.name}
                </Button>
              ) : null;
            })}
            {inventory.length < 3 && (
              <select 
                className="text-xs bg-muted border border-border rounded px-2 py-1"
                onChange={(e) => { if (e.target.value) handleAddPowerUp(e.target.value); e.target.value = ''; }}
                value=""
              >
                <option value="">+ Add</option>
                {POWER_UPS.filter(p => !inventory.includes(p.id)).map(p => (
                  <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Main Playground Area */}
      <div className="flex-1 relative overflow-hidden">
        {showBonusRound ? (
          <BonusRound
            deck={shuffleDeck(createDeck())}
            onSubmitHand={handleBonusSubmit}
            onSkip={() => setShowBonusRound(false)}
            timeRemaining={30}
            score={1500}
            level={level}
            bonusRoundNumber={Math.ceil(level / 3)}
          />
        ) : (
          <>
            {phase === 'static' && (
              <StaticGrid
                deck={deck}
                selectedCardIds={selectedCards.map(c => c.id)}
                onSelectCard={handleSelectCard}
              />
            )}
            {phase === 'conveyor' && (
              <ConveyorBelt
                deck={deck}
                selectedCardIds={selectedCards.map(c => c.id)}
                onSelectCard={handleSelectCard}
                speed={effectiveSpeed}
                isPaused={speedMultiplier === 0}
                reshuffleTrigger={reshuffleTrigger}
                isRecycling={true}
              />
            )}
            {phase === 'falling' && (
              <FallingCards
                deck={deck}
                selectedCardIds={selectedCards.map(c => c.id)}
                onSelectCard={handleSelectCard}
                speed={effectiveSpeed}
                isPaused={speedMultiplier === 0}
                reshuffleTrigger={reshuffleTrigger}
                isRecycling={true}
              />
            )}
            {phase === 'orbit' && (
              <OrbitCards
                deck={deck}
                selectedCardIds={selectedCards.map(c => c.id)}
                onSelectCard={handleSelectCard}
                level={level}
                isPaused={speedMultiplier === 0}
                reshuffleTrigger={reshuffleTrigger}
              />
            )}
          </>
        )}
      </div>

      {/* Selected Cards & Hand Forcer */}
      <div className="flex-shrink-0 p-3 bg-card border-t border-border space-y-2">
        {/* Selected Cards Display */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-14">Hand:</span>
          <div className="flex gap-1 flex-1">
            {selectedCards.map(card => (
              <div 
                key={card.id} 
                className={`w-10 h-14 rounded border flex items-center justify-center text-sm font-bold ${
                  card.suit === 'hearts' || card.suit === 'diamonds' 
                    ? 'text-red-500 bg-card border-red-500/30' 
                    : 'text-foreground bg-card border-border'
                }`}
              >
                {card.rank}{card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
              </div>
            ))}
            {Array(5 - selectedCards.length).fill(null).map((_, i) => (
              <div key={`empty-${i}`} className="w-10 h-14 rounded border border-dashed border-muted-foreground/30 bg-muted/20" />
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedCards([])}>
            Clear
          </Button>
        </div>

        {/* Force Hand Buttons */}
        <div className="flex gap-1 flex-wrap">
          <span className="text-xs text-muted-foreground w-14 self-center">Force:</span>
          {HAND_TYPES.map(hand => (
            <Button
              key={hand}
              variant="outline"
              size="sm"
              onClick={() => handleForceHand(hand)}
              className="text-xs py-1 h-7"
            >
              {hand}
            </Button>
          ))}
        </div>

        {/* Speed Info */}
        <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span>Conveyor: {conveyorSpeed.toFixed(2)}</span>
          <span>Falling: {fallingSpeed.toFixed(2)}</span>
          <span>Orbit: {orbitSpeed.toFixed(2)} (1.0×/1.15×/1.3×)</span>
          <span className="ml-auto">Multiplier: {speedMultiplier}×</span>
        </div>
      </div>

      {/* Level Complete Modal */}
      <LevelCompleteModal
        isOpen={showLevelComplete}
        level={level}
        score={1500}
        levelScore={1500}
        cumulativeScore={5000}
        goalScore={levelGoal}
        starRating={2}
        isBonusRound={false}
        isBonusFailed={false}
        pendingBonusRound={false}
        onNextLevel={() => setShowLevelComplete(false)}
        onStartBonusRound={() => { setShowLevelComplete(false); setShowBonusRound(true); }}
      />
    </div>
  );
};

export default DevSandbox;
