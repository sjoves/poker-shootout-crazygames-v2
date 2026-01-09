import React, { useState, useEffect, useRef, useCallback } from 'react';

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

// Default rows (desktop)
const DESKTOP_ROWS = 3;
const MOBILE_ROWS = 4;

// Card aspect ratio: 2.5:3.5 = 0.714
const CARD_ASPECT_RATIO = 2.5 / 3.5;

export function ConveyorBelt({
  deck,
  selectedCardIds,
  onSelectCard,
  speed = 1,
  isPaused = false,
  rows = DESKTOP_ROWS,
  isRecycling = false,
  reshuffleTrigger = 0,
}: ConveyorBeltProps) {
  const isMobile = useIsMobile();
  // 4 rows on mobile, 3 on desktop
  const actualRows = isMobile ? MOBILE_ROWS : DESKTOP_ROWS;
  
  // Use refs for card positions to avoid React state updates every frame
  const cardsRef = useRef<ConveyorCard[]>([]);
  const cardElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingReturnsRef = useRef<PendingReturn[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const initializedRef = useRef(false);
  const returnDelayMs = 3000;
  const { playSound } = useAudio();

  // Atomic lock to prevent multi-touch / ghost taps (no time-based gating)
  const isSelectingRef = useRef(false);

  // Force re-render only when cards are added/removed
  const [, setRenderTrigger] = useState(0);
  const triggerRender = useCallback(() => setRenderTrigger(v => v + 1), []);

  // Track when cards are ready for animation
  const [cardsReady, setCardsReady] = useState(false);

  // Responsive card sizing based on viewport
  // Each row takes ~30% of available height (90vh / 3 rows = 30vh max per row)
  // Card height is capped to fit within rows, with gaps accounted for
  const getCardDimensions = useCallback(() => {
    const vh = window.innerHeight / 100;
    
    // Available height for cards: account for hand display at bottom
    const rowGap = isMobile ? 17 : 16; // Row gap - increased by 5px on mobile
    const handDisplayReserve = isMobile ? 60 : 150; // Reserved for hand display - decreased by 50px total on mobile
    const numRows = isMobile ? 4 : 3; // 4 rows on mobile, 3 on desktop
    const availableHeight = (vh * 90) - handDisplayReserve - (rowGap * (numRows - 1)); // Total height minus gaps and hand display
    const maxCardHeight = availableHeight / numRows; // Each row's max card height
    
    // Desktop full-screen: larger cards
    // Mobile: smaller cards
    // Breakpoint at 1024px for desktop full-screen mode
    const isFullScreen = window.innerWidth >= 1024;
    
    // Max height capped at 22vh to prevent overlap on shorter screens
    const maxVhHeight = vh * 22;
    
    let cardHeight: number;
    if (isMobile) {
      // Mobile: scale cards to fit 4 rows
      cardHeight = Math.min(maxCardHeight, vh * 14);
    } else if (isFullScreen) {
      // Full-screen: cards scale to fill height, capped at 22vh
      cardHeight = Math.min(maxCardHeight, maxVhHeight);
    } else {
      // Tablet/smaller desktop
      cardHeight = Math.min(maxCardHeight, vh * 18, maxVhHeight);
    }
    
    // Maintain aspect ratio
    const cardWidth = cardHeight * CARD_ASPECT_RATIO;
    
    // Spacing scales with card size - increased to reduce overlap
    const spacing = isFullScreen ? cardWidth * 0.7 : (isMobile ? cardWidth * 0.8 : cardWidth * 0.6);
    
    return { cardWidth, cardHeight, spacing, rowGap };
  }, [isMobile]);

  const [dimensions, setDimensions] = useState(getCardDimensions);
  
  // Update dimensions on resize (and when breakpoint-derived sizing changes)
  useEffect(() => {
    const handleResize = () => setDimensions(getCardDimensions());

    // Run once immediately so changes like isMobile toggling take effect
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getCardDimensions]);

  const { cardWidth, cardHeight, spacing: cardSpacing, rowGap } = dimensions;

  // Reset on reshuffle or row count change
  const prevRowsRef = useRef(actualRows);
  useEffect(() => {
    const shouldReset = reshuffleTrigger > 0 || prevRowsRef.current !== actualRows;
    prevRowsRef.current = actualRows;
    
    if (shouldReset) {
      initializedRef.current = false;
      cardsRef.current = [];
      cardElementsRef.current.clear();
      pendingReturnsRef.current = [];
      setCardsReady(false);
      triggerRender();
    }
  }, [reshuffleTrigger, actualRows, triggerRender]);

  // Initialize cards on tracks - only when deck has cards
  useEffect(() => {
    if (initializedRef.current || !containerRef.current || deck.length === 0) return;
    initializedRef.current = true;
    
    const containerWidth = containerRef.current.offsetWidth;
    const cardsPerRow = Math.floor(containerWidth / (cardWidth + cardSpacing));
    
    const cards: ConveyorCard[] = [];
    let deckIndex = 0;
    const usedCardIds = new Set<string>();
    
    for (let row = 0; row < actualRows; row++) {
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
    setCardsReady(true);
    triggerRender();
  }, [deck, actualRows, speed, reshuffleTrigger, cardWidth, cardSpacing, triggerRender]);

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
    // Don't start animation if paused, no container, or no cards initialized yet
    if (isPaused || !containerRef.current || !cardsReady) {
      return;
    }
    
    const containerWidth = containerRef.current.offsetWidth;
    // Start cards further off-screen to ensure smooth entry
    const offScreenBuffer = cardWidth * 2;
    
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
          
          const row = Math.floor(Math.random() * actualRows);
          const isLeftToRight = row % 2 === 0;
          // Start further off-screen for smooth entry
          const x = isLeftToRight ? -offScreenBuffer : containerWidth + offScreenBuffer - cardWidth;
          
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
        
        // Skip off-screen cards (with buffer)
        if (card.speed > 0 && card.x >= containerWidth + offScreenBuffer) {
          needsRender = true;
          continue;
        }
        if (card.speed < 0 && card.x <= -offScreenBuffer) {
          needsRender = true;
          continue;
        }
        
        updatedCards.push(card);
      }
      
      // Add new cards at entry points
      const cardsOnBelt = new Set(updatedCards.map(c => c.id.split('-row')[0]));
      const cardsPending = new Set(pendingReturnsRef.current.map(p => p.card.id));
      
      for (let row = 0; row < actualRows; row++) {
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
            // Start further off-screen for smooth entry
            const entryX = isLeftToRight ? -offScreenBuffer : containerWidth + offScreenBuffer - cardWidth;
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
  }, [isPaused, cardsReady, selectedCardIds, speed, actualRows, cardWidth, cardSpacing, deck, triggerRender]);

  const handleCardPointerDown = useCallback((card: ConveyorCard, e: React.PointerEvent) => {
    // Atomic lock - reject if already processing
    if (isSelectingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    isSelectingRef.current = true;

    try {
      // Global hand guard: never visually "kill" a card if the hand is already full
      if (selectedCardIds.length >= 5) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const baseId = card.id.split('-row')[0];
      if (selectedCardIds.includes(baseId)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Stop all event propagation first
      e.stopPropagation();
      (e.nativeEvent as any)?.stopImmediatePropagation?.();

      // Instant visual removal (opacity: 0 for hardware-accelerated hide)
      const el = e.currentTarget as HTMLElement;
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';

      // Remove from active list in the same frame
      cardsRef.current = cardsRef.current.filter((c) => c.id !== card.id);
      cardElementsRef.current.delete(card.id);
      triggerRender();

      // Pointer capture to prevent multi-target / ghost interactions
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      const originalCard: Card = {
        id: baseId,
        suit: card.suit,
        rank: card.rank,
        value: card.value,
      };
      playSound('cardSelect');
      onSelectCard(originalCard);

      // No Ghost Taps: prevent click synthesis after pointerdown
      e.preventDefault();
    } finally {
      // Release lock in next microtask
      queueMicrotask(() => {
        isSelectingRef.current = false;
      });
    }
  }, [onSelectCard, playSound, selectedCardIds, triggerRender]);

  // Row height = card height + padding
  const rowHeight = cardHeight + rowGap;
  const totalHeight = actualRows * rowHeight;
  const visibleCards = cardsRef.current;

  // Determine card size variant based on viewport
  const isFullScreen = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const isSmallDesktop = typeof window !== 'undefined' && !isMobile && !isFullScreen;
  const cardSizeVariant = isFullScreen ? 'conveyor-lg' : (isMobile ? 'conveyor-sm' : 'conveyor-md');
  
  // Reduce max height by 20% for smaller desktop views
  const maxHeightValue = isSmallDesktop ? 'calc(72vh - 180px)' : 'calc(90vh - 180px)';

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 z-10 flex justify-center overflow-hidden px-2 sm:px-4 lg:px-8 ${
        isMobile ? 'items-center' : 'items-start pt-4'
      }`}
      style={{ maxWidth: '100vw' }}
    >
      <div 
        className={`relative w-full max-w-[100vw] flex flex-col ${isMobile ? 'justify-center' : 'justify-start'}`}
        style={{ 
          height: totalHeight,
          maxHeight: maxHeightValue,
        }}
      >
        {/* Track backgrounds */}
        {Array(actualRows).fill(null).map((_, index) => (
          <div
            key={`track-${index}`}
            className="absolute left-0 right-0 bg-muted/30 border-y border-border/20"
            style={{ 
              top: index * rowHeight,
              height: cardHeight + 8, // Slight padding around cards
            }}
          >
            <div className="absolute inset-0 flex items-center opacity-20">
              {Array(20).fill(null).map((_, i) => (
                <div key={i} className="flex-1 border-r border-dashed border-muted-foreground/30" />
              ))}
            </div>
          </div>
        ))}
        
        {/* Cards - no AnimatePresence to avoid layout thrashing */}
        {visibleCards.map(card => (
          <div
            key={card.id}
            ref={(el) => {
              if (el) cardElementsRef.current.set(card.id, el);
              else cardElementsRef.current.delete(card.id);
            }}
            style={{
              position: 'absolute',
              left: 0,
              top: card.row * rowHeight + 4,
              transform: `translate3d(${card.x}px, 0, 0)`,
              willChange: 'transform, opacity',
              width: cardWidth,
              height: cardHeight,
            }}
            onPointerDown={(e) => handleCardPointerDown(card, e)}
            className="cursor-pointer select-none touch-none"
          >
            <PlayingCard
              card={card}
              size={cardSizeVariant as any}
              animate={false}
              isSelected={selectedCardIds.includes(card.id.split('-row')[0])}
              className="w-full h-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
