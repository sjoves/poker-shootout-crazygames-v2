import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Card, FallingCard } from "@/types/game";
import { PlayingCard } from "./PlayingCard";

interface FallingCardsProps {
  deck: Card[];
  selectedCardIds: string[];
  onSelectCard: (card: Card) => void;
  speed?: number;
  isPaused?: boolean;
  isRecycling?: boolean;
}

type LocalFallingCard = FallingCard & { instanceKey: string };

export function FallingCards({
  deck,
  selectedCardIds,
  onSelectCard,
  speed = 1,
  isPaused = false,
  isRecycling = false,
}: FallingCardsProps) {
  const [fallingCards, setFallingCards] = useState<LocalFallingCard[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const lastSpawnRef = useRef<number>(0);
  const deckIndexRef = useRef<number>(0);
  const spawnCountRef = useRef<number>(0);

  const createSpawn = useCallback(
    (containerWidth: number): LocalFallingCard | null => {
      const availableCards = deck.filter((c) => !selectedCardIds.includes(c.id));
      if (availableCards.length === 0) return null;

      const pickIndex = isRecycling
        ? Math.floor(Math.random() * availableCards.length)
        : deckIndexRef.current % availableCards.length;

      const picked = availableCards[pickIndex];
      if (!picked) return null;

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
        const moved = prev
          .map((card) => ({
            ...card,
            y: card.y + card.speed,
            rotation: card.rotation + card.rotationSpeed,
            x: card.x + Math.sin((t / 1000) * card.swaySpeed) * 0.35,
          }))
          .filter((card) => {
            if (card.y > containerHeight + 60) return false;
            return !selectedCardIds.includes(card.id);
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
  }, [isPaused, speed, selectedCardIds, createSpawn]);

  const handleCardClick = useCallback(
    (card: LocalFallingCard) => {
      setFallingCards((prev) => prev.filter((c) => c.instanceKey !== card.instanceKey));
      onSelectCard(card);
    },
    [onSelectCard]
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
            {/* Larger invisible hit zone for easier clicking */}
            <button
              onClick={() => handleCardClick(card)}
              className="relative cursor-pointer p-4 -m-4 focus:outline-none"
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
