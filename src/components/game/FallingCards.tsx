import React, { useEffect, useCallback, useRef, useState } from "react";
import type { Card, FallingCard } from "@/types/game";
import { PlayingCard } from "./PlayingCard";
import { useAudio } from "@/contexts/AudioContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { analyzeOneAwayHand, getSmartDropDelay } from "@/lib/smartDrop";

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
  const { playSound } = useAudio();
  const isMobile = useIsMobile();
  
  // Smart Drop state
  const smartDropTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const smartDropTriggeredRef = useRef<boolean>(false);
  const lastSelectedCountRef = useRef<number>(0);
  
  // Force re-render only when cards are added/removed
  const [, setRenderTrigger] = useState(0);
  const triggerRender = useCallback(() => setRenderTrigger(v => v + 1), []);
  
  const hitboxPadding = isMobile ? 'p-6 -m-6' : 'p-4 -m-4';
  const spawnedCardIdsRef = useRef<Set<string>>(new Set());

  // Reset on reshuffle
  useEffect(() => {
    spawnedCardIdsRef.current.clear();
    cardsRef.current = [];
    cardElementsRef.current.clear();
    smartDropTriggeredRef.current = false;
    if (smartDropTimeoutRef.current) {
      clearTimeout(smartDropTimeoutRef.current);
      smartDropTimeoutRef.current = null;
    }
    triggerRender();
  }, [reshuffleTrigger, triggerRender]);

  // Reset on new game
  useEffect(() => {
    if (deck.length === 52) {
      spawnedCardIdsRef.current.clear();
      cardsRef.current = [];
      cardElementsRef.current.clear();
      smartDropTriggeredRef.current = false;
      lastSelectedCountRef.current = 0;
      if (smartDropTimeoutRef.current) {
        clearTimeout(smartDropTimeoutRef.current);
        smartDropTimeoutRef.current = null;
      }
      triggerRender();
    }
  }, [deck.length, triggerRender]);

  // Create a specific card spawn for Smart Drop
  const createSmartDropSpawn = useCallback(
    (containerWidth: number, specificCard: Card): LocalFallingCard => {
      spawnCountRef.current += 1;
      const cardWidth = 64;

      return {
        ...specificCard,
        instanceKey: `${specificCard.id}-smart-${spawnCountRef.current}`,
        x: Math.random() * Math.max(0, containerWidth - cardWidth),
        y: -110,
        speed: (1.0 + Math.random() * 0.8) * effectiveSpeed, // Slightly slower for visibility
        rotation: (Math.random() - 0.5) * 20, // Less rotation for easier selection
        rotationSpeed: (Math.random() - 0.5) * 1.5,
        sway: 8 + Math.random() * 10, // Less sway for easier selection
        swaySpeed: 1.0 + Math.random() * 1.2,
      };
    },
    [effectiveSpeed]
  );

  const createSpawn = useCallback(
    (containerWidth: number): LocalFallingCard | null => {
      const availableCards = deck.filter((c) => {
        if (selectedCardIds.includes(c.id)) return false;
        if (!isRecycling && spawnedCardIdsRef.current.has(c.id)) return false;
        return true;
      });
      
      if (availableCards.length === 0) return null;

      const pickIndex = isRecycling
        ? Math.floor(Math.random() * availableCards.length)
        : 0;

      const picked = availableCards[pickIndex];
      if (!picked) return null;

      if (!isRecycling) {
        spawnedCardIdsRef.current.add(picked.id);
      }

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
    [deck, selectedCardIds, effectiveSpeed, isRecycling]
  );

  // Smart Drop: Monitor when player has exactly 4 cards that are "one away" from high-ranking hand
  useEffect(() => {
    // Only trigger in SSC mode (which uses falling phase)
    if (gameMode !== 'ssc') return;
    if (isPaused) return;
    
    // Reset Smart Drop trigger when selection changes significantly
    if (selectedCards.length !== 4) {
      // If no longer at 4 cards, clear any pending Smart Drop
      if (smartDropTimeoutRef.current) {
        clearTimeout(smartDropTimeoutRef.current);
        smartDropTimeoutRef.current = null;
      }
      // Reset triggered flag if we've collected 5 or gone below 4
      if (selectedCards.length === 5 || selectedCards.length < lastSelectedCountRef.current) {
        smartDropTriggeredRef.current = false;
      }
      lastSelectedCountRef.current = selectedCards.length;
      return;
    }
    
    // Already triggered Smart Drop for this set of 4 cards
    if (smartDropTriggeredRef.current) return;
    
    // Get available cards from deck (not already selected)
    const availableDeck = deck.filter(c => !selectedCardIds.includes(c.id));
    
    // Analyze if current 4 cards are "one away" from a high-ranking hand
    const analysis = analyzeOneAwayHand(selectedCards, availableDeck);
    
    if (analysis.isOneAway && analysis.neededCards.length > 0) {
      console.log(`[Smart Drop] Detected one-away from ${analysis.targetHand}!`);
      
      // Set up delayed spawn
      const delay = getSmartDropDelay();
      console.log(`[Smart Drop] Will spawn needed card in ${(delay / 1000).toFixed(1)}s`);
      
      smartDropTimeoutRef.current = setTimeout(() => {
        const containerWidth = containerRef.current?.offsetWidth ?? 480;
        const neededCard = analysis.neededCards[0];
        
        // Check if the needed card is still available (not already on screen or selected)
        const stillAvailable = !selectedCardIds.includes(neededCard.id) && 
          !cardsRef.current.some(c => c.id === neededCard.id);
        
        if (stillAvailable) {
          console.log(`[Smart Drop] Spawning ${neededCard.rank} of ${neededCard.suit} for ${analysis.targetHand}!`);
          const smartCard = createSmartDropSpawn(containerWidth, neededCard);
          cardsRef.current.push(smartCard);
          triggerRender();
        }
        
        smartDropTimeoutRef.current = null;
      }, delay);
      
      smartDropTriggeredRef.current = true;
    }
    
    lastSelectedCountRef.current = selectedCards.length;
  }, [selectedCards, selectedCardIds, deck, gameMode, isPaused, createSmartDropSpawn, triggerRender]);

  // Cleanup Smart Drop timeout on unmount
  useEffect(() => {
    return () => {
      if (smartDropTimeoutRef.current) {
        clearTimeout(smartDropTimeoutRef.current);
      }
    };
  }, []);

  // Seed first card
  useEffect(() => {
    if (isPaused || deck.length === 0) return;
    if (cardsRef.current.length > 0) return;

    const measuredWidth = containerRef.current?.offsetWidth ?? 0;
    const effectiveWidth = measuredWidth > 0 ? measuredWidth : 480;
    const next = createSpawn(effectiveWidth);
    if (next) {
      cardsRef.current = [next];
      lastSpawnRef.current = performance.now();
      triggerRender();
    }
  }, [deck.length, isPaused, createSpawn, triggerRender]);

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
        
        // Check bounds
        if (card.y > containerHeight + 60) {
          if (!isRecycling) {
            spawnedCardIdsRef.current.delete(card.id);
          }
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
        const next = createSpawn(effectiveWidth);
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
  }, [isPaused, effectiveSpeed, selectedCardIds, createSpawn, isRecycling, deck.length, triggerRender]);

  const handleCardPointerDown = useCallback(
    (card: LocalFallingCard, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
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
