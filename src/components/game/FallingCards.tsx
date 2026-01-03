import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Card, FallingCard } from "@/types/game";
import { PlayingCard } from "./PlayingCard";
import { useAudio } from "@/contexts/AudioContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface FallingCardsProps {
  deck: Card[];
  selectedCardIds: string[];
  onSelectCard: (card: Card) => void;
  speed?: number;
  isPaused?: boolean;
  isRecycling?: boolean;
  reshuffleTrigger?: number;
}

type LocalFallingCard = FallingCard & { instanceKey: string };

export function FallingCards({
  deck,
  selectedCardIds,
  onSelectCard,
  speed = 1,
  isPaused = false,
  isRecycling = false,
  reshuffleTrigger = 0,
}: FallingCardsProps) {
  const [fallingCards, setFallingCards] = useState<LocalFallingCard[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const lastSpawnRef = useRef<number>(0);
  const deckIndexRef = useRef<number>(0);
  const spawnCountRef = useRef<number>(0);
  const { playSound } = useAudio();
  const isMobile = useIsMobile();
  
  // 20% larger hitbox on mobile
  const hitboxPadding = isMobile ? 'p-6 -m-6' : 'p-4 -m-4';

  // Track which cards have already been spawned (by card id) so we don't re-spawn them
  const spawnedCardIdsRef = useRef<Set<string>>(new Set());

  // Reset and re-deal when reshuffleTrigger changes or deck resets
  useEffect(() => {
    // Clear all spawned cards and reset for a fresh re-deal
    spawnedCardIdsRef.current.clear();
    deckIndexRef.current = 0;
    setFallingCards([]); // Clear screen to trigger re-deal animation
  }, [reshuffleTrigger]);

  // Reset spawned tracking when deck changes significantly (new game)
  useEffect(() => {
    if (deck.length === 52) {
      spawnedCardIdsRef.current.clear();
      deckIndexRef.current = 0;
    }
  }, [deck.length]);

  const createSpawn = useCallback(
    (containerWidth: number): LocalFallingCard | null => {
      // For non-recycling modes, we need cards that:
      // 1. Are still in the deck
      // 2. Haven't been selected
      // 3. Haven't already been spawned (for non-recycling mode)
      const availableCards = deck.filter((c) => {
        if (selectedCardIds.includes(c.id)) return false;
        if (!isRecycling && spawnedCardIdsRef.current.has(c.id)) return false;
        return true;
      });
      
      if (availableCards.length === 0) return null;

      const pickIndex = isRecycling
        ? Math.floor(Math.random() * availableCards.length)
        : 0; // For non-recycling, always pick the first available (sequential from deck)

      const picked = availableCards[pickIndex];
      if (!picked) return null;

      // Mark this card as spawned for non-recycling mode
      if (!isRecycling) {
        spawnedCardIdsRef.current.add(picked.id);
      }

      deckIndexRef.current += 1;
      spawnCountRef.current += 1;

      const cardWidth = 64;

      return {
        ...picked,
        instanceKey: `${picked.id}-${spawnCountRef.current}`,
        x: Math.random() * Math.max(0, containerWidth - cardWidth),
        y: -110,
        speed: (1.2 + Math.random() * 1.4) * speed,
        rotation: (Math.random() - 0.5) * 40,
        rotationSpeed: (Math.random() - 0.5) * 2.5,
        sway: 12 + Math.random() * 16,
        swaySpeed: 1.2 + Math.random() * 1.6,
      };
    },
    [deck, selectedCardIds, speed, isRecycling]
  );

  // Seed a first card as soon as the deck becomes available
  // (prevents an empty screen when the container measures 0px briefly on mount)
  useEffect(() => {
    if (isPaused) return;
    if (deck.length === 0) return;

    setFallingCards((prev) => {
      if (prev.length > 0) return prev;

      const measuredWidth = containerRef.current?.offsetWidth ?? 0;
      const effectiveWidth = measuredWidth > 0 ? measuredWidth : 480;
      const next = createSpawn(effectiveWidth);
      if (!next) return prev;

      lastSpawnRef.current = performance.now();
      return [next];
    });
  }, [deck.length, isPaused, createSpawn]);

  useEffect(() => {
    if (isPaused) return;

    const tick = (t: number) => {
      const containerHeight = containerRef.current?.offsetHeight ?? 600;
      const measuredWidth = containerRef.current?.offsetWidth ?? 0;
      const effectiveWidth = measuredWidth > 0 ? measuredWidth : 480;

      setFallingCards((prev) => {
        const moved: LocalFallingCard[] = [];
        
        prev.forEach((card) => {
          const updatedCard = {
            ...card,
            y: card.y + card.speed,
            rotation: card.rotation + card.rotationSpeed,
            x: card.x + Math.sin((t / 1000) * card.swaySpeed) * 0.35,
          };
          
          // Check if card fell off screen
          if (updatedCard.y > containerHeight + 60) {
            // Card fell off - remove from spawned set so it can respawn
            if (!isRecycling) {
              spawnedCardIdsRef.current.delete(card.id);
            }
            return; // Don't add to moved array
          }
          
          // Check if card was selected
          if (selectedCardIds.includes(card.id)) {
            return; // Don't add to moved array
          }
          
          moved.push(updatedCard);
        });

        const shouldSpawn = t - lastSpawnRef.current > 600 / speed;
        if (!shouldSpawn) return moved;
        if (moved.length >= 14) return moved;
        if (deck.length === 0) return moved;

        const next = createSpawn(effectiveWidth);
        if (!next) return moved;

        lastSpawnRef.current = t;
        return [...moved, next];
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPaused, speed, selectedCardIds, createSpawn, isRecycling, deck.length]);

  const handleCardClick = useCallback(
    (card: LocalFallingCard) => {
      setFallingCards((prev) => prev.filter((c) => c.instanceKey !== card.instanceKey));
      playSound('cardSelect');
      onSelectCard(card);
    },
    [onSelectCard, playSound]
  );

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <AnimatePresence>
        {fallingCards.map((card) => (
          <motion.div
            key={card.instanceKey}
            initial={{ opacity: 0, scale: 0.9, rotate: card.rotation }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              rotate: card.rotation,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ 
              duration: 0.12,
              rotate: { duration: 0.1, ease: "linear" }
            }}
            style={{
              position: "absolute",
              left: card.x,
              top: card.y,
              willChange: "transform, top, left",
            }}
            className="z-10"
          >
            {/* Larger invisible hit zone for easier clicking - 20% larger on mobile */}
            <button
              onClick={() => handleCardClick(card)}
              className={`relative cursor-pointer ${hitboxPadding} focus:outline-none`}
              aria-label={`Select ${card.rank} of ${card.suit}`}
            >
              <PlayingCard
                card={card}
                size="md"
                animate={false}
              />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
