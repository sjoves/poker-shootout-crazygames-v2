import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Trophy, Zap, Target, Clock, Hand } from 'lucide-react';
import { POKER_HANDS } from '@/types/game';
import { PlayingCard } from '@/components/game/PlayingCard';
import { Card as CardType } from '@/types/game';

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
    { id: 'K-hearts', suit: 'hearts', rank: 'K', value: 13 },
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
    { id: 'K-hearts', suit: 'hearts', rank: 'K', value: 13 },
  ],
  'High Card': [
    { id: '2-hearts', suit: 'hearts', rank: '2', value: 2 },
    { id: '5-clubs', suit: 'clubs', rank: '5', value: 5 },
    { id: '7-diamonds', suit: 'diamonds', rank: '7', value: 7 },
    { id: '9-spades', suit: 'spades', rank: '9', value: 9 },
    { id: 'K-hearts', suit: 'hearts', rank: 'K', value: 13 },
  ],
};

const HAND_DESCRIPTIONS: Record<string, string> = {
  'Royal Flush': 'A, K, Q, J, 10 all of the same suit',
  'Straight Flush': 'Five consecutive cards of the same suit',
  'Four of a Kind': 'Four cards of the same rank',
  'Full House': 'Three of a kind plus a pair',
  'Flush': 'Five cards of the same suit',
  'Straight': 'Five consecutive cards of any suit',
  'Three of a Kind': 'Three cards of the same rank',
  'Two Pair': 'Two different pairs',
  'One Pair': 'Two cards of the same rank',
  'High Card': 'No matching cards - highest card wins',
};

interface TutorialStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedHandIndex, setSelectedHandIndex] = useState(0);

  const steps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Poker Rush!',
      icon: <Trophy className="w-8 h-8 text-primary" />,
      content: (
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Build poker hands as fast as you can to score points!
          </p>
          <div className="flex justify-center gap-4 py-4">
            <div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
              <Hand className="w-6 h-6 text-primary" />
              <span className="text-sm">Collect Cards</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
              <Target className="w-6 h-6 text-accent" />
              <span className="text-sm">Build Hands</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
              <Clock className="w-6 h-6 text-gold" style={{ color: 'hsl(var(--gold))' }} />
              <span className="text-sm">Beat the Clock</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'gameplay',
      title: 'How to Play',
      icon: <Zap className="w-8 h-8 text-accent" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
              <span className="text-xl">1️⃣</span>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Tap cards</strong> to add them to your hand (up to 5 cards)
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
              <span className="text-xl">2️⃣</span>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Complete hands</strong> to score points automatically
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
              <span className="text-xl">3️⃣</span>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Higher hands</strong> = more points! Aim for flushes and straights
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
              <span className="text-xl">4️⃣</span>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Card values</strong> add bonus points (Ace = 14, King = 13, etc.)
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'modes',
      title: 'Game Modes',
      icon: <Target className="w-8 h-8 text-primary" />,
      content: (
        <div className="space-y-3">
          <div className="p-3 bg-muted/20 rounded-lg border-l-4 border-green-500">
            <h4 className="font-semibold flex items-center gap-2">
              🎯 Classic Mode
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Free</span>
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Race against time! Use all 52 cards to build as many hands as possible.
            </p>
          </div>
          <div className="p-3 bg-muted/20 rounded-lg border-l-4 border-yellow-500">
            <h4 className="font-semibold">⚡ 52-Card Blitz</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Speed challenge! No time limit - just use all cards as fast as you can.
            </p>
          </div>
          <div className="p-3 bg-muted/20 rounded-lg border-l-4 border-primary">
            <h4 className="font-semibold">🏆 Sharp Shooter Challenge</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Endless levels! Meet score goals to advance. Cards get faster each level.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'hands',
      title: 'Hand Rankings',
      icon: <Trophy className="w-8 h-8 text-gold" style={{ color: 'hsl(var(--gold))' }} />,
      content: (
        <div className="space-y-4">
          {/* Hand selector */}
          <div className="flex flex-wrap gap-1 justify-center">
            {POKER_HANDS.map((hand, index) => (
              <button
                key={hand.name}
                onClick={() => setSelectedHandIndex(index)}
                className={`px-2 py-1 text-xs rounded-full transition-all ${
                  selectedHandIndex === index
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {hand.name}
              </button>
            ))}
          </div>

          {/* Selected hand display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedHandIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-muted/20 rounded-xl p-4"
            >
              <div className="text-center mb-3">
                <h4 className="text-lg font-display text-primary">
                  {POKER_HANDS[selectedHandIndex].name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {HAND_DESCRIPTIONS[POKER_HANDS[selectedHandIndex].name]}
                </p>
                <div className="mt-2 inline-flex items-center gap-2 bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                  +{POKER_HANDS[selectedHandIndex].basePoints} base points
                </div>
              </div>

              {/* Example cards */}
              <div className="flex justify-center gap-1 flex-wrap">
                {EXAMPLE_HANDS[POKER_HANDS[selectedHandIndex].name]?.map((card) => (
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
          <div className="mt-2">
            <p className="text-xs text-center text-muted-foreground mb-2">Quick Reference</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {POKER_HANDS.map((hand) => (
                <div
                  key={hand.name}
                  className={`flex justify-between px-2 py-1 rounded ${
                    hand.name === POKER_HANDS[selectedHandIndex].name
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span>{hand.name}</span>
                  <span className="font-semibold">+{hand.basePoints}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
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
    setSelectedHandIndex(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">Game Tutorial</DialogTitle>
        
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 py-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'bg-primary w-6'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col items-center mb-4">
                {steps[currentStep].icon}
                <h3 className="text-xl font-display mt-2">{steps[currentStep].title}</h3>
              </div>
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <span className="text-sm text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </span>

          <Button onClick={nextStep} className="gap-1">
            {currentStep === steps.length - 1 ? "Let's Play!" : 'Next'}
            {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
