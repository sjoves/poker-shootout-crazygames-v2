import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BonusRound } from '@/components/game/BonusRound';
import { Card, Suit, Rank, HandResult, RANK_VALUES } from '@/types/game';

// Generate a shuffled deck
function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];
  
  let id = 0;
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ id: `card-${id++}`, suit, rank, value: RANK_VALUES[rank] });
    }
  }
  
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}

export default function TestBonusRoundMobile() {
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Card[]>(createDeck);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [introComplete, setIntroComplete] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!introComplete || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [introComplete, timeRemaining]);

  const handleSubmitHand = (cards: Card[], result: HandResult, time: number) => {
    console.log('Hand submitted:', { cards, result, time });
    setSubmitted(true);
  };

  const handleSkip = () => {
    console.log('Skipped bonus round');
    setSubmitted(true);
  };

  const handleReset = () => {
    setDeck(createDeck());
    setTimeRemaining(60);
    setIntroComplete(false);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-display text-primary mb-4">Round Complete!</h1>
        <button
          onClick={handleReset}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Full-screen bonus round - works on all viewports for testing */}
      <div className="h-screen">
        <BonusRound
          deck={deck}
          onSubmitHand={handleSubmitHand}
          onSkip={handleSkip}
          timeRemaining={timeRemaining}
          score={12500}
          level={3}
          bonusRoundNumber={2}
          onIntroComplete={() => setIntroComplete(true)}
          onHome={() => navigate('/')}
          onRestart={handleReset}
        />
      </div>
    </div>
  );
}
