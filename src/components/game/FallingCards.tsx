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
        speed: (2.2 + Math.random() * 2.2) * speed,
        rotation: (Math.random() - 0.5) * 28,
        rotationSpeed: (Math.random() - 0.5) * 0.6,
        sway: 12 + Math.random() * 16,
        swaySpeed: 1.2 + Math.random() * 1.6,
      };
    },
    [deck, selectedCardIds, speed, isRecycling]
  );

  useEffect(() => {
    if (isPaused) return;

    const tick = (t: number) => {
      const containerHeight = containerRef.current?.offsetHeight ?? 600;
      const containerWidth = containerRef.current?.offsetWidth ?? 0;

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
        if (!shouldSpawn || containerWidth <= 0) return moved;
        if (moved.length >= 14) return moved;

        const next = createSpawn(containerWidth);
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
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <AnimatePresence>
        {fallingCards.map((card) => (
          <motion.div
            key={card.instanceKey}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute",
              left: card.x,
              top: card.y,
              transform: `rotate(${card.rotation}deg)`,
              willChange: "transform, top, left",
            }}
            className="cursor-pointer z-10"
          >
            <PlayingCard card={card} onClick={() => handleCardClick(card)} size="md" animate={false} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
