import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, ConveyorCard } from '@/types/game';
import { PlayingCard } from './PlayingCard';
import { useAudio } from '@/contexts/AudioContext';

interface PendingReturn {
  card: Card;
  returnTime: number;
}

interface ConveyorBeltProps {
  deck: Card[];
  selectedCardIds: string[];
  onSelectCard: (card: Card) => void;
  speed?: number;
  isPaused?: boolean;
  rows?: number;
  isRecycling?: boolean;
  reshuffleTrigger?: number;
}

export function ConveyorBelt({
  deck,
  selectedCardIds,
  onSelectCard,
  speed = 1,
  isPaused = false,
  rows = 4,
  isRecycling = false,
  reshuffleTrigger = 0,
}: ConveyorBeltProps) {
  const [conveyorCards, setConveyorCards] = useState<ConveyorCard[]>([]);
  const [pendingReturns, setPendingReturns] = useState<PendingReturn[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const initializedRef = useRef(false);
  const returnDelayMs = 3000; // Cards return after 3 seconds
  const { playSound } = useAudio();

  // Reset and re-deal when reshuffleTrigger changes
  useEffect(() => {
    if (reshuffleTrigger > 0) {
      initializedRef.current = false;
      setConveyorCards([]);
      setPendingReturns([]);
    }
  }, [reshuffleTrigger]);

  // Initialize cards on tracks
  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;
    initializedRef.current = true;
    
    const containerWidth = containerRef.current.offsetWidth;
    const cardWidth = 64;
    const cardsPerRow = Math.floor(containerWidth / (cardWidth + 20));
    
    const cards: ConveyorCard[] = [];
    let deckIndex = 0;
    
    for (let row = 0; row < rows; row++) {
      for (let i = 0; i < cardsPerRow; i++) {
        if (deckIndex >= deck.length) deckIndex = 0;
        const card = deck[deckIndex];
        if (!card) continue;
        
        const isLeftToRight = row % 2 === 0;
        const x = isLeftToRight 
          ? i * (cardWidth + 20)
          : containerWidth - (i + 1) * (cardWidth + 20);
        
        cards.push({
          ...card,
          id: `${card.id}-row${row}-pos${i}`,
          x,
          y: 0,
          row,
          speed: speed * (isLeftToRight ? 1 : -1) * 0.5,
        });
        
        deckIndex++;
      }
    }
    
    setConveyorCards(cards);
  }, [deck, rows, speed, reshuffleTrigger]);

  // Track when cards are selected and schedule their return
  const prevSelectedRef = useRef<string[]>([]);
  useEffect(() => {
    const newlySelected = selectedCardIds.filter(id => !prevSelectedRef.current.includes(id));
    if (newlySelected.length > 0) {
      const now = Date.now();
      const newPending = newlySelected.map(id => {
        const card = deck.find(c => c.id === id);
        return card ? { card, returnTime: now + returnDelayMs } : null;
      }).filter(Boolean) as PendingReturn[];
      
      setPendingReturns(prev => [...prev, ...newPending]);
    }
    prevSelectedRef.current = selectedCardIds;
  }, [selectedCardIds, deck, returnDelayMs]);

  // Animation loop
  useEffect(() => {
    if (isPaused || !containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const cardWidth = 64;
    
    const animate = () => {
      const now = Date.now();
      
      // Check for cards ready to return
      setPendingReturns(prev => {
        const readyToReturn = prev.filter(p => now >= p.returnTime);
        const stillPending = prev.filter(p => now < p.returnTime);
        
        if (readyToReturn.length > 0) {
          setConveyorCards(cards => {
            const newCards = [...cards];
            readyToReturn.forEach(({ card }) => {
              // Find a random row and position to insert the card
              const row = Math.floor(Math.random() * rows);
              const isLeftToRight = row % 2 === 0;
              const x = isLeftToRight ? -cardWidth : containerWidth;
              
              newCards.push({
                ...card,
                id: `${card.id}-row${row}-ret${now}`,
                x,
                y: 0,
                row,
                speed: speed * (isLeftToRight ? 1 : -1) * 0.5,
              });
            });
            return newCards;
          });
        }
        
        return stillPending;
      });
      
      setConveyorCards(prev => {
        const updatedCards = prev
          .map(card => ({ ...card, x: card.x + card.speed }))
          .filter(card => !selectedCardIds.includes(card.id.split('-row')[0]))
          // Remove cards that are fully off-screen
          .filter(card => {
            if (card.speed > 0) return card.x < containerWidth + cardWidth;
            return card.x > -cardWidth * 2;
          });
        
        // Get IDs of cards currently on the belt (base card IDs, not unique instance IDs)
        const cardsOnBelt = new Set(updatedCards.map(c => c.id.split('-row')[0]));
        const cardsPending = new Set(pendingReturns.map(p => p.card.id));
        
        // Count cards per row and add new ones at entry points
        for (let row = 0; row < rows; row++) {
          const rowCards = updatedCards.filter(c => c.row === row);
          const isLeftToRight = row % 2 === 0;
          const minCardsPerRow = Math.floor(containerWidth / (cardWidth + 20)) + 2;
          
          if (rowCards.length < minCardsPerRow) {
            // Find a card that's not already on the belt, not selected, and not pending return
            const availableCards = deck.filter(c => 
              !cardsOnBelt.has(c.id) && 
              !selectedCardIds.includes(c.id) &&
              !cardsPending.has(c.id)
            );
            
            if (availableCards.length > 0) {
              const entryX = isLeftToRight ? -cardWidth : containerWidth;
              const deckCard = availableCards[Math.floor(Math.random() * availableCards.length)];
              updatedCards.push({
                ...deckCard,
                id: `${deckCard.id}-row${row}-t${now}`,
                x: entryX,
                y: 0,
                row,
                speed: speed * (isLeftToRight ? 1 : -1) * 0.5,
              });
              cardsOnBelt.add(deckCard.id); // Mark as used for subsequent row checks
            }
          }
        }
        
        return updatedCards;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, selectedCardIds, speed, rows, pendingReturns]);

  const handleCardClick = useCallback((card: ConveyorCard) => {
    const originalCard: Card = {
      id: card.id.split('-row')[0],
      suit: card.suit,
      rank: card.rank,
      value: card.value,
    };
    playSound('cardSelect');
    onSelectCard(originalCard);
  }, [onSelectCard, playSound]);

  const rowHeight = 120;
  const totalHeight = rows * rowHeight;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center overflow-hidden px-4"
    >
      <div 
        className="relative w-full"
        style={{ height: totalHeight }}
      >
      {/* Track backgrounds */}
      {Array(rows).fill(null).map((_, index) => (
        <div
          key={`track-${index}`}
          className="absolute left-0 right-0 h-20 bg-muted/30 border-y border-border/20"
          style={{ top: index * rowHeight }}
        >
          <div className="absolute inset-0 flex items-center opacity-20">
            {Array(20).fill(null).map((_, i) => (
              <div key={i} className="flex-1 border-r border-dashed border-muted-foreground/30" />
            ))}
          </div>
        </div>
      ))}
      
      {/* Cards */}
      <AnimatePresence>
        {conveyorCards.map(card => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
            style={{
              position: 'absolute',
              left: card.x,
              top: card.row * rowHeight + 10,
            }}
          >
            <PlayingCard
              card={card}
              onClick={() => handleCardClick(card)}
              size="md"
              animate={false}
              isSelected={selectedCardIds.includes(card.id.split('-row')[0])}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      </div>
    </div>
  );
}
