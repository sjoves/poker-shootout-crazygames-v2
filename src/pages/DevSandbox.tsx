import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, RotateCcw, Gift, Trophy, Target, Eye, EyeOff, User, HelpCircle, Settings, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card as CardType, SSCPhase, POWER_UPS, HandResult, GameMode } from '@/types/game';
import { createDeck, shuffleDeck, generateSpecificHand, calculateLevelGoal, evaluateHand, createBonusFriendlyDeck } from '@/lib/pokerEngine';
import { StaticGrid } from '@/components/game/StaticGrid';
import { ConveyorBelt } from '@/components/game/ConveyorBelt';
import { FallingCards } from '@/components/game/FallingCards';
import { OrbitCards } from '@/components/game/OrbitCards';
import { BonusRound } from '@/components/game/BonusRound';
import { LevelCompleteModal } from '@/components/game/LevelCompleteModal';

type MainMode = 'ssc' | 'classic' | 'blitz';
type SubMode = 'fc' | 'cb';

const PHASES: SSCPhase[] = ['sitting_duck', 'conveyor', 'falling', 'orbit'];

const HAND_TYPES = [
  'Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House',
  'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'One Pair',
];

const TIER_1_POWERUPS = ['reshuffle', 'two_pair', 'three_kind', 'add_time'];
const TIER_2_POWERUPS = ['straight', 'flush', 'full_house'];
const TIER_3_POWERUPS = ['four_kind', 'straight_flush', 'royal_flush'];

const DevSandbox = () => {
  const navigate = useNavigate();
  
  // Game mode state
  const [mainMode, setMainMode] = useState<MainMode>('ssc');
  const [subMode, setSubMode] = useState<SubMode>('fc');
  const [phase, setPhase] = useState<SSCPhase>('orbit');
  const [level, setLevel] = useState(22);
  
  // Timer and game state
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [handsPlayed, setHandsPlayed] = useState(0);
  
  // Speed controls
  const [speedOverride, setSpeedOverride] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Breathing controls (for Orbit)
  const [breathingEnabled, setBreathingEnabled] = useState(true);
  const [breathingAmplitude, setBreathingAmplitude] = useState(150);
  const [breathingSpeed, setBreathingSpeed] = useState(0.5);
  const [baseRotationSpeed, setBaseRotationSpeed] = useState(0.6);
  
  // Deck and cards
  const [deck, setDeck] = useState<CardType[]>(() => shuffleDeck(createDeck()));
  const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
  const [reshuffleTrigger, setReshuffleTrigger] = useState(0);
  
  // Debug toggles
  const [showHitboxes, setShowHitboxes] = useState(false);
  const [showHandEvaluator, setShowHandEvaluator] = useState(true);
  const [showRingGuides, setShowRingGuides] = useState(true);
  
  // Power-up inventory (max 3)
  const [inventory, setInventory] = useState<string[]>([]);
  
  // Modal states
  const [showBonusRound, setShowBonusRound] = useState(false);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);

  // Calculate effective phase based on mode
  const effectivePhase = useMemo(() => {
    if (mainMode === 'classic' || mainMode === 'blitz') {
      return subMode === 'fc' ? 'falling' : 'conveyor';
    }
    return phase;
  }, [mainMode, subMode, phase]);

  // Calculate speed based on settings and phase
  const getPhaseSpeed = useCallback(() => {
    if (speedOverride !== null) return speedOverride;
    
    // Conveyor: 1.2 × (1 + (level - 10) × 0.02)
    if (effectivePhase === 'conveyor') {
      return 1.2 * (1 + (level > 10 ? (level - 10) * 0.02 : 0));
    }
    // Falling: 1.5 × (1 + (level - 10) × 0.005)
    if (effectivePhase === 'falling') {
      return 1.5 * (1 + (level > 10 ? (level - 10) * 0.005 : 0));
    }
    // Orbit: 1.05 × (1 + (level - 10) × 0.005)
    if (effectivePhase === 'orbit') {
      return 1.05 * (1 + (level > 10 ? (level - 10) * 0.005 : 0));
    }
    return 1;
  }, [effectivePhase, level, speedOverride]);

  const effectiveSpeed = getPhaseSpeed();
  
  // Goal: 500 × 1.05^(level - 1)
  const levelGoal = calculateLevelGoal(level);

  // Real-time hand evaluation
  const currentHandResult = useMemo(() => {
    if (selectedCards.length === 5) {
      return evaluateHand(selectedCards);
    }
    return null;
  }, [selectedCards]);

  // Timer effect
  useEffect(() => {
    if (!isTimerRunning || isPaused || timeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          if (mainMode === 'blitz') {
            setShowGameOver(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, isPaused, timeRemaining, mainMode]);

  // Card selection
  const handleSelectCard = useCallback((card: CardType) => {
    if (selectedCards.length < 5 && !selectedCards.some(c => c.id === card.id)) {
      setSelectedCards(prev => [...prev, card]);
      setDeck(prev => prev.filter(c => c.id !== card.id));
    }
  }, [selectedCards]);

  // Start/Reset game
  const handleStartGame = useCallback(() => {
    setScore(0);
    setHandsPlayed(0);
    setSelectedCards([]);
    setTimeRemaining(mainMode === 'blitz' ? 60 : (mainMode === 'ssc' ? 60 : 9999));
    setIsTimerRunning(mainMode === 'blitz' || mainMode === 'ssc');
    setDeck(shuffleDeck(createDeck()));
    setReshuffleTrigger(prev => prev + 1);
    setShowGameOver(false);
    setShowLevelComplete(false);
  }, [mainMode]);

  // Refill deck
  const handleRefillDeck = useCallback((bonusFriendly: boolean = false) => {
    const newDeck = bonusFriendly 
      ? createBonusFriendlyDeck(Math.ceil(level / 3))
      : shuffleDeck(createDeck());
    setDeck(newDeck);
    setReshuffleTrigger(prev => prev + 1);
  }, [level]);

  // Force hand
  const handleForceHand = useCallback((handType: string) => {
    const hand = generateSpecificHand(handType, deck);
    if (hand && hand.length === 5) {
      setSelectedCards(hand);
      setDeck(prev => prev.filter(c => !hand.some(h => h.id === c.id)));
    }
  }, [deck]);

  // Win level (SSC)
  const handleWinLevel = useCallback(() => {
    const winScore = Math.floor(levelGoal * 1.5);
    setScore(winScore);
    setShowLevelComplete(true);
  }, [levelGoal]);

  // End game
  const handleEndGame = useCallback(() => {
    setIsTimerRunning(false);
    setShowGameOver(true);
  }, []);

  // Bonus round handlers
  const handleBonusSubmit = useCallback((cards: CardType[], result: HandResult, time: number) => {
    setShowBonusRound(false);
    setScore(prev => prev + result.totalPoints + (time * 10));
    setShowLevelComplete(true);
  }, []);

  // Power-up management
  const handleAddPowerUp = useCallback((powerUpId: string) => {
    if (inventory.length < 3 && !inventory.includes(powerUpId)) {
      setInventory(prev => [...prev, powerUpId]);
    }
  }, [inventory]);

  const handleRemovePowerUp = useCallback((powerUpId: string) => {
    setInventory(prev => prev.filter(id => id !== powerUpId));
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 p-2 flex justify-between items-center border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold font-display">Dev Sandbox</span>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
            {mainMode.toUpperCase()}{mainMode !== 'ssc' ? `-${subMode.toUpperCase()}` : ''} | {effectivePhase}
          </span>
        </div>
        <div className="flex gap-1">
          <Button 
            variant={isPaused ? "default" : "outline"}
            size="icon"
            className="w-8 h-8"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Top-Tier Game Mode Controls */}
      <div className="flex-shrink-0 p-2 bg-muted/50 border-b border-border space-y-2 text-xs">
        {/* Row 1: Mode + Sub-Mode + Phase */}
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-muted-foreground w-10">Mode:</span>
          <div className="flex border border-border rounded overflow-hidden">
            {(['ssc', 'classic', 'blitz'] as MainMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMainMode(m); handleStartGame(); }}
                className={`px-3 py-1 uppercase font-medium ${mainMode === m ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
              >
                {m}
              </button>
            ))}
          </div>
          
          {/* Sub-mode for Classic/Blitz */}
          {mainMode !== 'ssc' && (
            <div className="flex border border-border rounded overflow-hidden ml-2">
              <button
                onClick={() => setSubMode('fc')}
                className={`px-2 py-1 ${subMode === 'fc' ? 'bg-accent text-accent-foreground' : 'bg-card hover:bg-muted'}`}
              >
                Falling
              </button>
              <button
                onClick={() => setSubMode('cb')}
                className={`px-2 py-1 ${subMode === 'cb' ? 'bg-accent text-accent-foreground' : 'bg-card hover:bg-muted'}`}
              >
                Conveyor
              </button>
            </div>
          )}
          
          {/* Phase selector for SSC */}
          {mainMode === 'ssc' && (
            <div className="flex gap-1 ml-2">
              {PHASES.map(p => (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  className={`px-2 py-1 capitalize rounded ${phase === p ? 'bg-accent text-accent-foreground' : 'bg-card hover:bg-muted border border-border'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Row 2: Level Jumper + Goal Display */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-muted-foreground w-10">Level:</span>
            <input 
              type="range" min="1" max="100" value={level} 
              onChange={(e) => setLevel(parseInt(e.target.value))}
              className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="font-mono w-8 text-center">{level}</span>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded px-2 py-1">
            <Target className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">Goal:</span>
            <span className="font-mono font-bold">{levelGoal.toLocaleString()}</span>
          </div>
        </div>

        {/* Row 3: Timer Controls */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-10">Timer:</span>
            <input 
              type="number" 
              value={timeRemaining} 
              onChange={(e) => setTimeRemaining(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 bg-card border border-border rounded px-2 py-1 text-center font-mono"
            />
            <Button 
              variant={isTimerRunning ? "default" : "outline"} 
              size="sm" 
              className="h-6 px-2"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
            >
              {isTimerRunning ? 'Stop' : 'Run'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Speed:</span>
            <input 
              type="range" min="0" max="100" 
              value={speedOverride !== null ? speedOverride * 10 : getPhaseSpeed() * 10} 
              onChange={(e) => setSpeedOverride(parseFloat(e.target.value) / 10)}
              className="w-24 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="font-mono w-8">{(speedOverride ?? getPhaseSpeed()).toFixed(1)}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2"
              onClick={() => setSpeedOverride(null)}
            >
              Auto
            </Button>
          </div>
        </div>

        {/* Row 4: Orbit Controls (only show for orbit phase) */}
        {effectivePhase === 'orbit' && (
          <div className="flex gap-4 items-center bg-card/50 rounded p-1 flex-wrap">
            {/* Rotation Speed */}
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-xs">Rotation:</span>
              <input 
                type="range" min="1" max="20" value={baseRotationSpeed * 10}
                onChange={(e) => setBaseRotationSpeed(parseInt(e.target.value) / 10)}
                className="w-16 h-1 accent-primary"
              />
              <span className="font-mono text-xs w-6">{baseRotationSpeed.toFixed(1)}</span>
            </div>
            
            {/* Breathing Toggle */}
            <span className="text-muted-foreground">Breathing:</span>
            <Button 
              variant={breathingEnabled ? "default" : "outline"} 
              size="sm" 
              className="h-5 px-2 text-xs"
              onClick={() => setBreathingEnabled(!breathingEnabled)}
            >
              {breathingEnabled ? 'ON' : 'OFF'}
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-xs">Amp:</span>
              <input 
                type="range" min="0" max="200" value={breathingAmplitude}
                onChange={(e) => setBreathingAmplitude(parseInt(e.target.value))}
                className="w-16 h-1 accent-primary"
                disabled={!breathingEnabled}
              />
              <span className="font-mono text-xs w-6">{breathingAmplitude}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-xs">Speed:</span>
              <input 
                type="range" min="1" max="20" value={breathingSpeed * 10}
                onChange={(e) => setBreathingSpeed(parseInt(e.target.value) / 10)}
                className="w-16 h-1 accent-primary"
                disabled={!breathingEnabled}
              />
              <span className="font-mono text-xs w-6">{breathingSpeed.toFixed(1)}</span>
            </div>
            <Button 
              variant={showRingGuides ? "default" : "outline"} 
              size="sm" 
              className="h-5 px-2 text-xs"
              onClick={() => setShowRingGuides(!showRingGuides)}
            >
              Rings
            </Button>
          </div>
        )}

        {/* Row 5: Lifecycle & Debug Controls */}
        <div className="flex gap-1 flex-wrap items-center">
          <Button variant="outline" size="sm" className="h-6 px-2" onClick={handleStartGame}>
            <Play className="w-3 h-3 mr-1" /> Start
          </Button>
          <Button variant="outline" size="sm" className="h-6 px-2" onClick={handleEndGame}>
            Game Over
          </Button>
          {mainMode === 'ssc' && (
            <Button variant="outline" size="sm" className="h-6 px-2" onClick={handleWinLevel}>
              <Trophy className="w-3 h-3 mr-1" /> Force Win
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-6 px-2" onClick={() => setShowBonusRound(true)}>
            <Gift className="w-3 h-3 mr-1" /> Bonus
          </Button>
          <div className="border-l border-border mx-1 h-4" />
          <Button variant="outline" size="sm" className="h-6 px-2" onClick={() => handleRefillDeck(false)}>
            <RotateCcw className="w-3 h-3 mr-1" /> Refill
          </Button>
          <Button variant="outline" size="sm" className="h-6 px-2" onClick={() => handleRefillDeck(true)}>
            🎁 Bonus Deck
          </Button>
          <div className="border-l border-border mx-1 h-4" />
          <Button 
            variant={showHitboxes ? "default" : "outline"} 
            size="sm" 
            className="h-6 px-2"
            onClick={() => setShowHitboxes(!showHitboxes)}
          >
            {showHitboxes ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
            Hitbox
          </Button>
        </div>

        {/* Row 6: Power-Up Granter */}
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-muted-foreground">Inventory:</span>
          <div className="flex gap-0.5">
            {inventory.map(id => {
              const p = POWER_UPS.find(x => x.id === id);
              return p ? (
                <button 
                  key={id} 
                  onClick={() => handleRemovePowerUp(id)} 
                  className="bg-secondary px-2 py-0.5 rounded text-sm hover:bg-destructive/20"
                  title={`${p.name} (click to remove)`}
                >
                  {p.emoji}
                </button>
              ) : null;
            })}
            {Array(3 - inventory.length).fill(null).map((_, i) => (
              <div key={`empty-${i}`} className="w-7 h-6 border border-dashed border-muted-foreground/30 rounded" />
            ))}
          </div>
          <div className="border-l border-border mx-1 h-4" />
          <span className="text-muted-foreground text-xs">Add:</span>
          <div className="flex gap-0.5">
            <span className="text-muted-foreground text-xs">T1:</span>
            {TIER_1_POWERUPS.map(id => {
              const p = POWER_UPS.find(x => x.id === id);
              return p ? (
                <button 
                  key={id} 
                  onClick={() => handleAddPowerUp(id)} 
                  className="bg-card border border-border px-1.5 py-0.5 rounded text-xs hover:bg-muted disabled:opacity-50"
                  disabled={inventory.includes(id) || inventory.length >= 3}
                  title={p.name}
                >
                  {p.emoji}
                </button>
              ) : null;
            })}
          </div>
          <div className="flex gap-0.5">
            <span className="text-muted-foreground text-xs">T2:</span>
            {TIER_2_POWERUPS.map(id => {
              const p = POWER_UPS.find(x => x.id === id);
              return p ? (
                <button 
                  key={id} 
                  onClick={() => handleAddPowerUp(id)} 
                  className="bg-card border border-border px-1.5 py-0.5 rounded text-xs hover:bg-muted disabled:opacity-50"
                  disabled={inventory.includes(id) || inventory.length >= 3}
                  title={p.name}
                >
                  {p.emoji}
                </button>
              ) : null;
            })}
          </div>
          <div className="flex gap-0.5">
            <span className="text-muted-foreground text-xs">T3:</span>
            {TIER_3_POWERUPS.map(id => {
              const p = POWER_UPS.find(x => x.id === id);
              return p ? (
                <button 
                  key={id} 
                  onClick={() => handleAddPowerUp(id)} 
                  className="bg-card border border-border px-1.5 py-0.5 rounded text-xs hover:bg-muted disabled:opacity-50"
                  disabled={inventory.includes(id) || inventory.length >= 3}
                  title={p.name}
                >
                  {p.emoji}
                </button>
              ) : null;
            })}
          </div>
        </div>
      </div>

      {/* Main Playground Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Score & Timer Overlay */}
        <div className="absolute top-2 left-2 right-2 z-20 flex justify-between pointer-events-none">
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded px-3 py-1">
            <span className="text-xs text-muted-foreground">Score:</span>
            <span className="font-bold ml-1">{score.toLocaleString()}</span>
            {mainMode === 'ssc' && (
              <span className="text-xs text-muted-foreground ml-2">/ {levelGoal}</span>
            )}
          </div>
          <div className={`bg-card/90 backdrop-blur-sm border border-border rounded px-3 py-1 ${timeRemaining <= 10 && timeRemaining > 0 ? 'border-red-500 text-red-500' : ''}`}>
            <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
          </div>
        </div>

        {/* Hitbox Debug Overlay */}
        {showHitboxes && (effectivePhase === 'conveyor' || effectivePhase === 'falling') && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {effectivePhase === 'falling' && (
              <>
                <div className="absolute top-0 left-0 right-0 h-24 bg-green-500/20 border-b-2 border-dashed border-green-500">
                  <span className="text-green-500 text-xs p-1">Spawn Zone</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-red-500/20 border-t-2 border-dashed border-red-500">
                  <span className="text-red-500 text-xs p-1">Despawn Zone</span>
                </div>
              </>
            )}
            {effectivePhase === 'conveyor' && (
              <>
                <div className="absolute top-0 left-0 w-16 h-full bg-green-500/20 border-r-2 border-dashed border-green-500">
                  <span className="text-green-500 text-xs p-1">Spawn L</span>
                </div>
                <div className="absolute top-0 right-0 w-16 h-full bg-green-500/20 border-l-2 border-dashed border-green-500">
                  <span className="text-green-500 text-xs p-1">Spawn R</span>
                </div>
              </>
            )}
          </div>
        )}

        {showBonusRound ? (
          <BonusRound
            deck={shuffleDeck(createDeck())}
            onSubmitHand={handleBonusSubmit}
            onSkip={() => setShowBonusRound(false)}
            timeRemaining={30}
            score={score}
            level={level}
            bonusRoundNumber={Math.ceil(level / 3)}
          />
        ) : showGameOver ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <h2 className="text-3xl font-display text-foreground mb-4">Game Over</h2>
              <p className="text-xl text-primary mb-2">Final Score: {score.toLocaleString()}</p>
              <p className="text-muted-foreground mb-4">Hands Played: {handsPlayed}</p>
              <Button onClick={handleStartGame}>Play Again</Button>
            </div>
          </div>
        ) : (
          <>
            {effectivePhase === 'sitting_duck' && (
              <StaticGrid
                deck={deck}
                selectedCardIds={selectedCards.map(c => c.id)}
                onSelectCard={handleSelectCard}
              />
            )}
            {effectivePhase === 'conveyor' && (
              <ConveyorBelt
                deck={deck}
                selectedCardIds={selectedCards.map(c => c.id)}
                onSelectCard={handleSelectCard}
                speed={effectiveSpeed}
                isPaused={isPaused}
                reshuffleTrigger={reshuffleTrigger}
                isRecycling={true}
              />
            )}
            {effectivePhase === 'falling' && (
              <FallingCards
                deck={deck}
                selectedCardIds={selectedCards.map(c => c.id)}
                onSelectCard={handleSelectCard}
                speed={effectiveSpeed}
                isPaused={isPaused}
                reshuffleTrigger={reshuffleTrigger}
                isRecycling={true}
              />
            )}
            {effectivePhase === 'orbit' && (
              <OrbitCards
                deck={deck}
                selectedCardIds={selectedCards.map(c => c.id)}
                onSelectCard={handleSelectCard}
                level={level}
                isPaused={isPaused}
                reshuffleTrigger={reshuffleTrigger}
                breathingEnabled={breathingEnabled}
                breathingAmplitude={breathingAmplitude}
                breathingSpeed={breathingSpeed}
                showRingGuides={showRingGuides}
                baseRotationSpeed={baseRotationSpeed}
              />
            )}
          </>
        )}
      </div>

      {/* Hand Evaluator & Controls */}
      <div className="flex-shrink-0 p-2 bg-card border-t border-border space-y-2 text-xs">
        {/* Selected Cards + Live Evaluator */}
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 flex-1">
            {selectedCards.map(card => (
              <div 
                key={card.id} 
                className={`w-8 h-11 rounded border flex items-center justify-center text-xs font-bold ${
                  card.suit === 'hearts' || card.suit === 'diamonds' 
                    ? 'text-red-500 bg-card border-red-500/30' 
                    : 'text-foreground bg-card border-border'
                }`}
              >
                {card.rank}{card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
              </div>
            ))}
            {Array(5 - selectedCards.length).fill(null).map((_, i) => (
              <div key={`empty-${i}`} className="w-8 h-11 rounded border border-dashed border-muted-foreground/30 bg-muted/20" />
            ))}
          </div>
          
          {/* Live Hand Evaluation Overlay */}
          {showHandEvaluator && currentHandResult && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary/10 border border-primary/30 rounded px-2 py-1"
            >
              <div className="font-bold text-primary">{currentHandResult.hand.name}</div>
              <div className="text-muted-foreground">
                Base: {currentHandResult.hand.basePoints} + Val: {currentHandResult.valueBonus} = <span className="text-foreground font-bold">{currentHandResult.totalPoints}</span>
              </div>
            </motion.div>
          )}
          
          <Button variant="ghost" size="sm" className="h-6" onClick={() => setSelectedCards([])}>
            Clear
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6"
            onClick={() => {
              if (currentHandResult) {
                setScore(prev => prev + currentHandResult.totalPoints);
                setHandsPlayed(prev => prev + 1);
                setSelectedCards([]);
              }
            }}
            disabled={selectedCards.length !== 5}
          >
            Submit
          </Button>
        </div>

        {/* Force Hand Buttons */}
        <div className="flex gap-0.5 flex-wrap">
          {HAND_TYPES.map(hand => (
            <Button key={hand} variant="outline" size="sm" onClick={() => handleForceHand(hand)} className="text-xs py-0 h-5 px-1.5">
              {hand}
            </Button>
          ))}
        </div>
      </div>

      {/* Bottom Navigation: Profile, Leaderboard, Help, Settings, Test */}
      <div className="flex-shrink-0 p-2 bg-muted border-t border-border flex justify-center gap-3">
        <Button variant="ghost" size="icon" className="w-9 h-9" onClick={() => navigate('/account')}>
          <User className="w-4 h-4 text-primary" />
        </Button>
        <Button variant="ghost" size="icon" className="w-9 h-9" onClick={() => navigate('/leaderboard')}>
          <Trophy className="w-4 h-4 text-primary" />
        </Button>
        <Button variant="ghost" size="icon" className="w-9 h-9" onClick={() => navigate('/')}>
          <HelpCircle className="w-4 h-4 text-primary" />
        </Button>
        <Button variant="ghost" size="icon" className="w-9 h-9" onClick={() => navigate('/')}>
          <Settings className="w-4 h-4 text-primary" />
        </Button>
        <Button variant="default" size="icon" className="w-9 h-9">
          <Zap className="w-4 h-4" />
        </Button>
      </div>

      {/* Level Complete Modal */}
      <LevelCompleteModal
        isOpen={showLevelComplete}
        level={level}
        score={score}
        levelScore={score}
        cumulativeScore={score}
        goalScore={levelGoal}
        starRating={score >= levelGoal * 1.5 ? 3 : score >= levelGoal * 1.25 ? 2 : 1}
        isBonusRound={false}
        isBonusFailed={false}
        pendingBonusRound={level % 3 === 0}
        onNextLevel={() => { setShowLevelComplete(false); setLevel(prev => prev + 1); handleStartGame(); }}
        onStartBonusRound={() => { setShowLevelComplete(false); setShowBonusRound(true); }}
      />
    </div>
  );
};

export default DevSandbox;
