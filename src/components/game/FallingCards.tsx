import React, { useEffect, useCallback, useRef, useState } from "react";
import type { Card, FallingCard } from "@/types/game";
import { PlayingCard } from "./PlayingCard";
import { useAudio } from "@/contexts/AudioContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface FallingCardsProps {
  deck: Card[];
  selectedCards: Card[];
  selectedCardIds: string[];
  onSelectCard: (card: Card) => void;
  speed?: number;
  isPaused?: boolean;
  isRecycling?: boolean;
  reshuffleTrigger?: number;
  gameMode?: 'ssc' | 'classic' | 'blitz';
}

type LocalFallingCard = FallingCard & { instanceKey: string; isTouched?: boolean };

// Fisher-Yates shuffle using crypto for high-entropy randomness
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomValues = new Uint32Array(1);
    crypto.getRandomValues(randomValues);
    const j = randomValues[0] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function FallingCards({
  deck,
  selectedCards,
  selectedCardIds,
  onSelectCard,
  speed = 1,
  isPaused = false,
  isRecycling = false,
  reshuffleTrigger = 0,
  gameMode = 'classic',
}: FallingCardsProps) {
  const effectiveSpeed = gameMode === 'ssc' ? speed * 0.8 : speed;
  
  // Use refs for card positions to avoid React state updates on every frame
  const cardsRef = useRef<LocalFallingCard[]>([]);
  const cardElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const lastSpawnRef = useRef<number>(0);
  const spawnCountRef = useRef<number>(0);
  const selectionLockRef = useRef<number>(0);
  const { playSound } = useAudio();
  const isMobile = useIsMobile();
  
  // Force re-render only when cards are added/removed
  const [, setRenderTrigger] = useState(0);
  const triggerRender = useCallback(() => setRenderTrigger(v => v + 1), []);
  
  const hitboxPadding = isMobile ? 'p-6 -m-6' : 'p-4 -m-4';
  
  // Exhaustive deck system: shuffled queue of cards to deal
  const shuffledDeckRef = useRef<Card[]>([]);
  const dealtCardIdsRef = useRef<Set<string>>(new Set());

  // Initialize/reshuffle the deck
  const reshuffleDeck = useCallback(() => {
    shuffledDeckRef.current = fisherYatesShuffle(deck);
    dealtCardIdsRef.current.clear();
  }, [deck]);

  // Reset on reshuffle trigger or new game
  useEffect(() => {
    reshuffleDeck();
    cardsRef.current = [];
    cardElementsRef.current.clear();
    triggerRender();
  }, [reshuffleTrigger, reshuffleDeck, triggerRender]);

  // Reset on new game (full deck)
  useEffect(() => {
    if (deck.length === 52) {
      reshuffleDeck();
      cardsRef.current = [];
      cardElementsRef.current.clear();
      triggerRender();
    }
  }, [deck.length, reshuffleDeck, triggerRender]);

  // Deal next card from shuffled deck - completely hand-blind
  const dealNextCard = useCallback(
    (containerWidth: number): LocalFallingCard | null => {
      // Find next card in shuffled deck that hasn't been dealt or selected
      let picked: Card | null = null;
      
      while (shuffledDeckRef.current.length > 0) {
        const candidate = shuffledDeckRef.current.shift()!;
        
        // Skip if already selected by player
        if (selectedCardIds.includes(candidate.id)) {
          continue;
        }
        
        // Skip if currently on screen (already dealt but not collected)
        if (dealtCardIdsRef.current.has(candidate.id)) {
          continue;
        }
        
        picked = candidate;
        break;
      }
      
      // If deck exhausted, reshuffle and try again
      if (!picked && shuffledDeckRef.current.length === 0) {
        // Reshuffle: get all cards not currently selected
        const availableForReshuffle = deck.filter(c => !selectedCardIds.includes(c.id));
        shuffledDeckRef.current = fisherYatesShuffle(availableForReshuffle);
        dealtCardIdsRef.current.clear();
        
        // Try to get next card from reshuffled deck
        while (shuffledDeckRef.current.length > 0) {
          const candidate = shuffledDeckRef.current.shift()!;
          if (!selectedCardIds.includes(candidate.id)) {
            picked = candidate;
            break;
          }
        }
      }
      
      if (!picked) return null;

      dealtCardIdsRef.current.add(picked.id);
      spawnCountRef.current += 1;
      const cardWidth = 64;

      return {
        ...picked,
        instanceKey: `${picked.id}-${spawnCountRef.current}`,
        x: Math.random() * Math.max(0, containerWidth - cardWidth),
        y: -110,
        speed: (1.2 + Math.random() * 1.4) * effectiveSpeed,
        rotation: (Math.random() - 0.5) * 40,
        rotationSpeed: (Math.random() - 0.5) * 2.5,
        sway: 12 + Math.random() * 16,
        swaySpeed: 1.2 + Math.random() * 1.6,
      };
    },
    [deck, selectedCardIds, effectiveSpeed]
  );

  // Seed first card - only when deck is populated
  useEffect(() => {
    if (isPaused) return;
    if (deck.length === 0) return;
    if (cardsRef.current.length > 0) return;
    if (shuffledDeckRef.current.length === 0) return; // Wait for deck to be shuffled

    const measuredWidth = containerRef.current?.offsetWidth ?? 0;
    const effectiveWidth = measuredWidth > 0 ? measuredWidth : 480;
    const next = dealNextCard(effectiveWidth);
    if (next) {
      cardsRef.current = [next];
      lastSpawnRef.current = performance.now();
      triggerRender();
    }
  }, [deck.length, isPaused, dealNextCard, triggerRender]);

  // Main animation loop - updates DOM directly via refs
  useEffect(() => {
    if (isPaused) return;

    const tick = (t: number) => {
      const containerHeight = containerRef.current?.offsetHeight ?? 600;
      const measuredWidth = containerRef.current?.offsetWidth ?? 0;
      const effectiveWidth = measuredWidth > 0 ? measuredWidth : 480;

      let needsRender = false;
      const movedCards: LocalFallingCard[] = [];
      
      for (const card of cardsRef.current) {
        // Update position directly
        card.y += card.speed;
        card.rotation += card.rotationSpeed;
        card.x += Math.sin((t / 1000) * card.swaySpeed) * 0.35;
        
        // Update DOM element directly if it exists
        const element = cardElementsRef.current.get(card.instanceKey);
        if (element) {
          element.style.transform = `translate3d(${card.x}px, ${card.y}px, 0) rotate(${card.rotation}deg)`;
        }
        
        // Check bounds - card fell off screen, allow it to be dealt again
        if (card.y > containerHeight + 60) {
          dealtCardIdsRef.current.delete(card.id);
          needsRender = true;
          continue;
        }
        
        if (selectedCardIds.includes(card.id)) {
          needsRender = true;
          continue;
        }
        
        movedCards.push(card);
      }

      // Check if we need to spawn
      const shouldSpawn = t - lastSpawnRef.current > 600 / effectiveSpeed;
      if (shouldSpawn && movedCards.length < 14 && deck.length > 0) {
        const next = dealNextCard(effectiveWidth);
        if (next) {
          movedCards.push(next);
          lastSpawnRef.current = t;
          needsRender = true;
        }
      }

      cardsRef.current = movedCards;
      
      // Only trigger React render when cards added/removed
      if (needsRender) {
        triggerRender();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPaused, effectiveSpeed, selectedCardIds, dealNextCard, deck.length, triggerRender]);

  const handleCardPointerDown = useCallback(
    (card: LocalFallingCard, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.nativeEvent as any)?.stopImmediatePropagation?.();

      // Pointer capture to prevent multi-target / ghost interactions
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      
      // Local selection lock guard - prevent double-selection within 500ms
      const now = Date.now();
      if (now - selectionLockRef.current < 500) return;
      selectionLockRef.current = now;
      
      // Update touched state
      card.isTouched = true;
      
      playSound('cardSelect');
      onSelectCard(card);
      
      // Remove from refs
      cardsRef.current = cardsRef.current.filter((c) => c.instanceKey !== card.instanceKey);
      cardElementsRef.current.delete(card.instanceKey);
      triggerRender();
    },
    [onSelectCard, playSound, triggerRender]
  );

  // Get current cards for render
  const visibleCards = cardsRef.current;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden touch-none">
      {visibleCards.map((card) => (
        <div
          key={card.instanceKey}
          ref={(el) => {
            if (el) cardElementsRef.current.set(card.instanceKey, el);
            else cardElementsRef.current.delete(card.instanceKey);
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate3d(${card.x}px, ${card.y}px, 0) rotate(${card.rotation}deg)`,
            willChange: "transform",
          }}
          className="z-10"
        >
          <div
            onPointerDown={(e) => handleCardPointerDown(card, e)}
            className={`relative cursor-pointer ${hitboxPadding} select-none touch-none`}
            role="button"
            aria-label={`Select ${card.rank} of ${card.suit}`}
          >
            <div className={`transition-all duration-75 ${card.isTouched ? 'ring-4 ring-primary ring-opacity-80 rounded-lg shadow-lg shadow-primary/50' : ''}`}>
              <PlayingCard
                card={card}
                size="md"
                animate={false}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}