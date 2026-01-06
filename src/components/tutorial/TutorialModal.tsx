import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Trophy, 
  Zap, 
  Target, 
  Clock, 
  Hand, 
  RotateCcw, 
  Sparkles,
  RectangleVertical,
  Crosshair,
  Flame,
  Star,
  ArrowRight
} from 'lucide-react';
import { POKER_HANDS, Card as CardType } from '@/types/game';
import { PlayingCard, EmptyCardSlot } from '@/components/game/PlayingCard';
import { TutorialCard } from '@/components/tutorial/TutorialCard';
import { evaluateHand } from '@/lib/pokerEngine';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Example hands for demonstration
const EXAMPLE_HANDS: Record<string, CardType[]> = {
  'Royal Flush': [
    { id: '10-hearts', suit: 'hearts', rank: '10', value: 10 },
    { id: 'J-hearts', suit: 'hearts', rank: 'J', value: 11 },
    { id: 'Q-hearts', suit: 'hearts', rank: 'Q', value: 12 },
    { id: 'K-hearts', suit: 'hearts', rank: 'K', value: 13 },
    { id: 'A-hearts', suit: 'hearts', rank: 'A', value: 14 },
  ],
  'Straight Flush': [
    { id: '5-spades', suit: 'spades', rank: '5', value: 5 },
    { id: '6-spades', suit: 'spades', rank: '6', value: 6 },
    { id: '7-spades', suit: 'spades', rank: '7', value: 7 },
    { id: '8-spades', suit: 'spades', rank: '8', value: 8 },
    { id: '9-spades', suit: 'spades', rank: '9', value: 9 },
  ],
  'Four of a Kind': [
    { id: 'K-hearts', suit: 'hearts', rank: 'K', value: 13 },
    { id: 'K-diamonds', suit: 'diamonds', rank: 'K', value: 13 },
    { id: 'K-clubs', suit: 'clubs', rank: 'K', value: 13 },
    { id: 'K-spades', suit: 'spades', rank: 'K', value: 13 },
    { id: '3-hearts', suit: 'hearts', rank: '3', value: 3 },
  ],
  'Full House': [
    { id: 'Q-hearts', suit: 'hearts', rank: 'Q', value: 12 },
    { id: 'Q-diamonds', suit: 'diamonds', rank: 'Q', value: 12 },
    { id: 'Q-clubs', suit: 'clubs', rank: 'Q', value: 12 },
    { id: '7-spades', suit: 'spades', rank: '7', value: 7 },
    { id: '7-hearts', suit: 'hearts', rank: '7', value: 7 },
  ],
  'Flush': [
    { id: '2-diamonds', suit: 'diamonds', rank: '2', value: 2 },
    { id: '5-diamonds', suit: 'diamonds', rank: '5', value: 5 },
    { id: '8-diamonds', suit: 'diamonds', rank: '8', value: 8 },
    { id: 'J-diamonds', suit: 'diamonds', rank: 'J', value: 11 },
    { id: 'A-diamonds', suit: 'diamonds', rank: 'A', value: 14 },
  ],
  'Straight': [
    { id: '4-hearts', suit: 'hearts', rank: '4', value: 4 },
    { id: '5-clubs', suit: 'clubs', rank: '5', value: 5 },
    { id: '6-diamonds', suit: 'diamonds', rank: '6', value: 6 },
    { id: '7-spades', suit: 'spades', rank: '7', value: 7 },
    { id: '8-hearts', suit: 'hearts', rank: '8', value: 8 },
  ],
  'Three of a Kind': [
    { id: '9-hearts', suit: 'hearts', rank: '9', value: 9 },
    { id: '9-diamonds', suit: 'diamonds', rank: '9', value: 9 },
    { id: '9-clubs', suit: 'clubs', rank: '9', value: 9 },
    { id: '4-spades', suit: 'spades', rank: '4', value: 4 },
    { id: 'K-hearts2', suit: 'hearts', rank: 'K', value: 13 },
  ],
  'Two Pair': [
    { id: 'J-hearts', suit: 'hearts', rank: 'J', value: 11 },
    { id: 'J-clubs', suit: 'clubs', rank: 'J', value: 11 },
    { id: '4-diamonds', suit: 'diamonds', rank: '4', value: 4 },
    { id: '4-spades', suit: 'spades', rank: '4', value: 4 },
    { id: 'A-hearts', suit: 'hearts', rank: 'A', value: 14 },
  ],
  'One Pair': [
    { id: '6-hearts', suit: 'hearts', rank: '6', value: 6 },
    { id: '6-spades', suit: 'spades', rank: '6', value: 6 },
    { id: '3-clubs', suit: 'clubs', rank: '3', value: 3 },
    { id: '9-diamonds', suit: 'diamonds', rank: '9', value: 9 },
    { id: 'K-hearts3', suit: 'hearts', rank: 'K', value: 13 },
  ],
  'High Card': [
    { id: '2-hearts', suit: 'hearts', rank: '2', value: 2 },
    { id: '5-clubs', suit: 'clubs', rank: '5', value: 5 },
    { id: '7-diamonds', suit: 'diamonds', rank: '7', value: 7 },
    { id: '9-spades', suit: 'spades', rank: '9', value: 9 },
    { id: 'K-hearts4', suit: 'hearts', rank: 'K', value: 13 },
  ],
};

// Cards for guided interactive demo - setup for a flush
const GUIDED_DEMO_CARDS: CardType[] = [
  { id: '7-hearts', suit: 'hearts', rank: '7', value: 7 },
  { id: 'K-diamonds', suit: 'diamonds', rank: 'K', value: 13 },
  { id: '3-hearts', suit: 'hearts', rank: '3', value: 3 },
  { id: 'J-hearts', suit: 'hearts', rank: 'J', value: 11 },
  { id: '5-clubs', suit: 'clubs', rank: '5', value: 5 },
  { id: 'A-hearts', suit: 'hearts', rank: 'A', value: 14 },
  { id: '9-spades', suit: 'spades', rank: '9', value: 9 },
  { id: '2-hearts', suit: 'hearts', rank: '2', value: 2 },
  { id: '10-hearts', suit: 'hearts', rank: '10', value: 10 },
  { id: 'Q-diamonds', suit: 'diamonds', rank: 'Q', value: 12 },
];

// Target cards for guided selection (hearts for flush)
const GUIDED_TARGET_IDS = ['7-hearts', '3-hearts', 'J-hearts', 'A-hearts', '2-hearts'];

interface TutorialStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

// Animated Hand Pointer Component
function HandPointer({ targetIndex, isVisible }: { targetIndex: number; isVisible: boolean }) {
  if (!isVisible) return null;
  
  return (
    <motion.div
      className="absolute z-50 pointer-events-none"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        y: [0, -8, 0],
      }}
      transition={{
        y: { repeat: Infinity, duration: 0.8 }
      }}
      style={{
        left: `${(targetIndex % 5) * 20 + 10}%`,
        top: '60%',
        transform: 'translateX(-50%)',
      }}
    >
      <div className="relative">
        <Hand className="w-8 h-8 text-primary rotate-[-30deg] drop-shadow-lg" />
        <motion.div 
          className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
        />
      </div>
    </motion.div>
  );
}

// Guided Interactive Demo Component
function GuidedInteractiveDemo({ onComplete }: { onComplete: () => void }) {
  const [availableCards, setAvailableCards] = useState<CardType[]>(GUIDED_DEMO_CARDS);
  const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
  const [showHandPointer, setShowHandPointer] = useState(true);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [handResult, setHandResult] = useState<{ name: string; points: number } | null>(null);

  // Get current target card
  const currentTargetId = GUIDED_TARGET_IDS[selectedCards.length];
  const targetCardIndex = availableCards.findIndex(c => c.id === currentTargetId);

  const handleCardClick = (card: CardType) => {
    if (selectedCards.length >= 5) return;
    
    // Check if it's a target card (hint system - allow any card but highlight targets)
    const isTarget = GUIDED_TARGET_IDS.includes(card.id);
    
    setSelectedCards(prev => [...prev, card]);
    setAvailableCards(prev => prev.filter(c => c.id !== card.id));
    
    if (selectedCards.length < 4) {
      setCurrentTargetIndex(prev => prev + 1);
    }
  };

  const handleReset = () => {
    setAvailableCards(GUIDED_DEMO_CARDS);
    setSelectedCards([]);
    setShowHandPointer(true);
    setCurrentTargetIndex(0);
    setShowSuccess(false);
    setHandResult(null);
  };

  // Evaluate hand when 5 cards selected
  useEffect(() => {
    if (selectedCards.length === 5) {
      setShowHandPointer(false);
      const result = evaluateHand(selectedCards);
      setHandResult({ name: result.hand.name, points: result.totalPoints });
      setShowSuccess(true);
    }
  }, [selectedCards]);

  return (
    <div className="space-y-3 relative">
      {/* Instruction banner */}
      <motion.div 
        className="bg-primary/10 border border-primary/30 rounded-lg p-2 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-sm font-medium text-primary">
          {showSuccess ? (
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              Hand Formed! You scored {handResult?.points} points!
            </span>
          ) : (
            <>
              👆 Tap 5 cards to build a poker hand!
              <span className="block text-xs text-primary/70 mt-1">
                Hint: Select the hearts for a Flush!
              </span>
            </>
          )}
        </p>
      </motion.div>

      {/* Hand Display Area */}
      <div className="bg-muted/30 rounded-xl p-3 relative overflow-hidden">
        <p className="text-xs text-muted-foreground mb-1 text-center font-medium">
          YOUR HAND
        </p>
        <div className="flex justify-center gap-1 min-h-[80px]">
          {Array.from({ length: 5 }).map((_, i) => (
            selectedCards[i] ? (
              <motion.div
                key={selectedCards[i].id}
                initial={{ scale: 0, y: 50, rotate: -10 }}
                animate={{ scale: 1, y: 0, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <TutorialCard
                  card={selectedCards[i]}
                  size="ssc"
                />
              </motion.div>
            ) : (
              <motion.div
                key={`empty-${i}`}
                animate={i === selectedCards.length ? { 
                  scale: [1, 1.05, 1],
                  borderColor: ['hsl(var(--primary) / 0.3)', 'hsl(var(--primary) / 0.6)', 'hsl(var(--primary) / 0.3)']
                } : {}}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <EmptyCardSlot size="ssc" />
              </motion.div>
            )
          ))}
        </div>

        {/* Success animation overlay */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-lg font-display shadow-lg"
                >
                  <Sparkles className="w-5 h-5" />
                  {handResult?.name}
                  <span className="font-bold">+{handResult?.points}</span>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-3 text-sm text-muted-foreground"
                >
                  Great job! You built a poker hand!
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Available Cards Grid */}
      <div className="relative">
        <p className="text-xs text-muted-foreground mb-1 text-center">
          TAP CARDS TO SELECT
        </p>
        <div className="grid grid-cols-5 gap-1 justify-items-center">
          {availableCards.map((card, index) => {
            const isTarget = card.id === currentTargetId;
            return (
              <motion.div
                key={card.id}
                className="relative"
                animate={isTarget && showHandPointer ? {
                  scale: [1, 1.08, 1],
                } : {}}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                <PlayingCard
                  card={card}
                  size="sm"
                  onClick={() => handleCardClick(card)}
                  animate={false}
                  className={isTarget && showHandPointer ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                />
                {isTarget && showHandPointer && (
                  <motion.div
                    className="absolute -top-8 left-1/2 -translate-x-1/2"
                    animate={{ y: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                  >
                    <Hand className="w-6 h-6 text-primary rotate-180" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
          <RotateCcw className="w-3 h-3" />
          Try Again
        </Button>
        {showSuccess && (
          <Button size="sm" onClick={onComplete} className="gap-1">
            Got it! <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Game Modes Content Component
function GameModesContent() {
  return (
    <div className="space-y-4">
      {/* Classic Mode */}
      <motion.div 
        className="p-4 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-xl border border-emerald-500/30"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <RectangleVertical className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-display text-base text-emerald-400 flex items-center gap-2">
              Classic Mode
              <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full">FREE</span>
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              <strong className="text-foreground">Objective:</strong> Use a full 52-card deck to form poker hands.
            </p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>📊 <strong>Scoring:</strong> Hand rankings + remaining cards + speed bonus</p>
              <p>⏱️ <strong>Time:</strong> Under 1 min = speed bonus • Over 2 min = penalty</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Blitz Mode */}
      <motion.div 
        className="p-4 bg-gradient-to-r from-amber-500/10 to-transparent rounded-xl border border-amber-500/30"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Hand className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-display text-base text-amber-400 flex items-center gap-2">
              Blitz Mode
              <Zap className="w-3 h-3" />
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              <strong className="text-foreground">Objective:</strong> Form as many poker hands as possible in exactly 1 minute!
            </p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>📊 <strong>Scoring:</strong> Hand rankings + total hands completed</p>
              <p>⚡ <strong>Speed is key:</strong> The faster you build hands, the more you score!</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sharp Shooter Challenge */}
      <motion.div 
        className="p-4 bg-gradient-to-r from-primary/10 to-transparent rounded-xl border border-primary/30"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Crosshair className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-display text-base text-primary flex items-center gap-2">
              Sharp Shooter Challenge
              <Trophy className="w-3 h-3 text-gold" />
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              <strong className="text-foreground">The Gauntlet:</strong> Multi-phase progressive challenge!
            </p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>🎯 <strong>Phases:</strong> Sitting Duck → Carnival Gallery → Sky is Falling</p>
              <p>🚀 <strong>Unlock:</strong> High-intensity Orbit mode at higher levels</p>
              <p>🧠 <strong>Bonus:</strong> Special Concentration bonus round for extra points</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Hand Rankings Content Component
function HandRankingsContent() {
  const [selectedHand, setSelectedHand] = useState(0);

  const handData = [
    { name: 'Royal Flush', points: 5000, desc: '10, J, Q, K, A of the same suit' },
    { name: 'Straight Flush', points: 2500, desc: '5 cards in sequence, same suit' },
    { name: 'Four of a Kind', points: 1000, desc: '4 cards of the same rank' },
    { name: 'Full House', points: 750, desc: '3 of a kind plus a pair' },
    { name: 'Flush', points: 500, desc: '5 cards of the same suit' },
    { name: 'Straight', points: 400, desc: '5 cards in sequence, mixed suits' },
    { name: 'Three of a Kind', points: 300, desc: '3 cards of the same rank' },
    { name: 'Two Pair', points: 200, desc: 'Two different pairs' },
    { name: 'One Pair', points: 100, desc: 'Two cards of the same rank' },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center bg-muted/20 rounded-lg p-3">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Goal:</strong> Build the strongest 5-card combination possible!
        </p>
      </div>

      {/* Hand selector pills */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {handData.map((hand, index) => (
          <button
            key={hand.name}
            onClick={() => setSelectedHand(index)}
            className={`px-2.5 py-1 text-xs rounded-full transition-all ${
              selectedHand === index
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {hand.name}
          </button>
        ))}
      </div>

      {/* Selected hand display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedHand}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50"
        >
          <div className="text-center mb-3">
            <h4 className="text-xl font-display text-primary">
              {handData[selectedHand].name}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              {handData[selectedHand].desc}
            </p>
            <motion.div 
              className="mt-3 inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full font-display text-lg"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Star className="w-4 h-4" />
              {handData[selectedHand].points} pts
            </motion.div>
          </div>

          {/* Example cards */}
          <div className="flex justify-center gap-1 flex-wrap">
            {EXAMPLE_HANDS[handData[selectedHand].name]?.map((card) => (
              <PlayingCard
                key={card.id}
                card={card}
                size="sm"
                animate={false}
                isDisabled
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Quick reference table */}
      <div className="bg-muted/20 rounded-lg p-3">
        <p className="text-xs text-center text-muted-foreground mb-2 font-medium">QUICK REFERENCE</p>
        <div className="grid grid-cols-1 gap-1">
          {handData.map((hand, index) => (
            <motion.div
              key={hand.name}
              className={`flex justify-between items-center px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
                selectedHand === index
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-muted/30'
              }`}
              onClick={() => setSelectedHand(index)}
              whileHover={{ x: 4 }}
            >
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center bg-muted/50 rounded text-xs font-bold">
                  {index + 1}
                </span>
                {hand.name}
              </span>
              <span className="font-display font-bold text-primary">{hand.points}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      id: 'quickstart',
      title: 'Interactive QuickStart',
      icon: <Sparkles className="w-8 h-8 text-primary" />,
      content: <GuidedInteractiveDemo onComplete={() => setCurrentStep(1)} />,
    },
    {
      id: 'modes',
      title: 'Game Modes',
      icon: <Target className="w-8 h-8 text-accent" />,
      content: <GameModesContent />,
    },
    {
      id: 'rankings',
      title: 'How to Play Poker',
      icon: <Trophy className="w-8 h-8 text-gold" />,
      content: <HandRankingsContent />,
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[65vh] overflow-y-auto p-0 gap-0 border-border/50 bg-gradient-to-b from-background to-muted/20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {steps[currentStep].icon}
              <div>
                <DialogTitle className="text-lg font-display">
                  {steps[currentStep].title}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Step {currentStep + 1} of {steps.length}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Progress bar */}
          <div className="flex gap-1 mt-3">
            {steps.map((_, index) => (
              <motion.div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted/50'
                }`}
                initial={false}
                animate={{ scaleX: index <= currentStep ? 1 : 0.5 }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/50 px-4 py-3">
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            {/* Step dots */}
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'bg-primary w-4'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>

            <Button onClick={nextStep} className="gap-1">
              {currentStep === steps.length - 1 ? "Let's Play!" : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
