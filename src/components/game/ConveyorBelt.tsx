import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, ConveyorCard } from '@/types/game';
import { PlayingCard } from './PlayingCard';
import { useAudio } from '@/contexts/AudioContext';
import { useIsMobile } from '@/hooks/use-mobile';

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
  // Use refs for card positions to avoid React state updates every frame
  const cardsRef = useRef<ConveyorCard[]>([]);
  const cardElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingReturnsRef = useRef<PendingReturn[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const initializedRef = useRef(false);
  const returnDelayMs = 3000;
  const { playSound } = useAudio();
  const isMobile = useIsMobile();
  
  // Force re-render only when cards are added/removed
  const [, setRenderTrigger] = useState(0);
  const triggerRender = useCallback(() => setRenderTrigger(v => v + 1), []);
  
  const cardWidth = isMobile ? 72 : 64;
  const cardSpacing = isMobile ? 28 : 20;

  // Reset on reshuffle
  useEffect(() => {
    if (reshuffleTrigger > 0) {
      initializedRef.current = false;
      cardsRef.current = [];
      cardElementsRef.current.clear();
      pendingReturnsRef.current = [];
      triggerRender();
    }
  }, [reshuffleTrigger, triggerRender]);

  // Initialize cards on tracks
  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;
    initializedRef.current = true;
    
    const containerWidth = containerRef.current.offsetWidth;
    const cardsPerRow = Math.floor(containerWidth / (cardWidth + cardSpacing));
    
    const cards: ConveyorCard[] = [];
    let deckIndex = 0;
    const usedCardIds = new Set<string>();
    
    for (let row = 0; row < rows; row++) {
      for (let i = 0; i < cardsPerRow; i++) {
        let card = null;
        for (let j = 0; j < deck.length; j++) {
          const candidateIndex = (deckIndex + j) % deck.length;
          const candidate = deck[candidateIndex];
          if (candidate && !usedCardIds.has(candidate.id)) {
            card = candidate;
            usedCardIds.add(candidate.id);
            deckIndex = candidateIndex + 1;
            break;
          }
        }
        if (!card) continue;
        
        const isLeftToRight = row % 2 === 0;
        const x = isLeftToRight 
          ? i * (cardWidth + cardSpacing)
          : containerWidth - (i + 1) * (cardWidth + cardSpacing);
        
        cards.push({
          ...card,
          id: `${card.id}-row${row}-pos${i}`,
          x,
          y: 0,
          row,
          speed: speed * (isLeftToRight ? 1 : -1) * 0.5,
        });
      }
    }
    
    cardsRef.current = cards;
    triggerRender();
  }, [deck, rows, speed, reshuffleTrigger, cardWidth, cardSpacing, triggerRender]);

  // Track selected cards for pending returns
  const prevSelectedRef = useRef<string[]>([]);
  useEffect(() => {
    const newlySelected = selectedCardIds.filter(id => !prevSelectedRef.current.includes(id));
    if (newlySelected.length > 0) {
      const now = Date.now();
      const newPending = newlySelected.map(id => {
        const card = deck.find(c => c.id === id);
        return card ? { card, returnTime: now + returnDelayMs } : null;
      }).filter(Boolean) as PendingReturn[];
      
      pendingReturnsRef.current = [...pendingReturnsRef.current, ...newPending];
    }
    prevSelectedRef.current = selectedCardIds;
  }, [selectedCardIds, deck, returnDelayMs]);

  // Animation loop - direct DOM updates
  useEffect(() => {
    if (isPaused || !containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    
    const animate = () => {
      const now = Date.now();
      let needsRender = false;
      
      // Check for cards ready to return
      const readyToReturn = pendingReturnsRef.current.filter(p => now >= p.returnTime);
      const stillPending = pendingReturnsRef.current.filter(p => now < p.returnTime);
      
      if (readyToReturn.length > 0) {
        const currentCardsOnBelt = new Set(cardsRef.current.map(c => c.id.split('-row')[0]));
        
        readyToReturn.forEach(({ card }) => {
          if (currentCardsOnBelt.has(card.id)) return;
          
          const row = Math.floor(Math.random() * rows);
          const isLeftToRight = row % 2 === 0;
          const x = isLeftToRight ? -cardWidth : containerWidth;
          
          cardsRef.current.push({
            ...card,
            id: `${card.id}-row${row}-ret${now}`,
            x,
            y: 0,
            row,
            speed: speed * (isLeftToRight ? 1 : -1) * 0.5,
          });
          currentCardsOnBelt.add(card.id);
          needsRender = true;
        });
        
        pendingReturnsRef.current = stillPending;
      }
      
      // Update card positions directly
      const updatedCards: ConveyorCard[] = [];
      
      for (const card of cardsRef.current) {
        card.x += card.speed;
        
        // Update DOM element directly
        const element = cardElementsRef.current.get(card.id);
        if (element) {
          element.style.transform = `translate3d(${card.x}px, 0, 0)`;
        }
        
        // Skip selected cards
        if (selectedCardIds.includes(card.id.split('-row')[0])) {
          needsRender = true;
          continue;
        }
        
        // Skip off-screen cards
        if (card.speed > 0 && card.x >= containerWidth + cardWidth) {
          needsRender = true;
          continue;
        }
        if (card.speed < 0 && card.x <= -cardWidth * 2) {
          needsRender = true;
          continue;
        }
        
        updatedCards.push(card);
      }
      
      // Add new cards at entry points
      const cardsOnBelt = new Set(updatedCards.map(c => c.id.split('-row')[0]));
      const cardsPending = new Set(pendingReturnsRef.current.map(p => p.card.id));
      
      for (let row = 0; row < rows; row++) {
        const rowCards = updatedCards.filter(c => c.row === row);
        const isLeftToRight = row % 2 === 0;
        const minCardsPerRow = Math.floor(containerWidth / (cardWidth + cardSpacing)) + 2;
        
        if (rowCards.length < minCardsPerRow) {
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
            cardsOnBelt.add(deckCard.id);
            needsRender = true;
          }
        }
      }
      
      cardsRef.current = updatedCards;
      
      if (needsRender) {
        triggerRender();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, selectedCardIds, speed, rows, cardWidth, cardSpacing, deck, triggerRender]);

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
  const visibleCards = cardsRef.current;

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
          {visibleCards.map(card => (
            <motion.div
              key={card.id}
              ref={(el) => {
                if (el) cardElementsRef.current.set(card.id, el);
                else cardElementsRef.current.delete(card.id);
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
              style={{
                position: 'absolute',
                left: 0,
                top: card.row * rowHeight + 10,
                transform: `translate3d(${card.x}px, 0, 0)`,
                willChange: 'transform',
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
