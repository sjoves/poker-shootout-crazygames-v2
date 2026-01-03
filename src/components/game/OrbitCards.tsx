import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useSound from 'use-sound';
import { Card } from '@/types/game';
import { PlayingCard } from './PlayingCard';

interface OrbitSlot {
  ring: 0 | 1 | 2;
  slotIndex: number;
  totalSlotsInRing: number;
  card: Card;
  isNew: boolean;
}

interface OrbitCardsProps {
  deck: Card[];
  selectedCardIds: string[];
  onSelectCard: (card: Card) => void;
  level: number;
  isPaused?: boolean;
  reshuffleTrigger?: number;
  breathingEnabled?: boolean;
  breathingAmplitude?: number;
  breathingSpeed?: number;
  showRingGuides?: boolean;
}

const OrbitCardWrapper = ({
  x,
  y,
  isNew,
  children,
  cardId,
  onClick,
}: {
  x: number;
  y: number;
  isNew: boolean;
  children: React.ReactNode;
  cardId: string;
  onClick: () => void;
}) => {
  return (
    <motion.div
      key={cardId}
      initial={isNew ? { x: 0, y: 0, scale: 0, opacity: 0 } : false}
      animate={{ x, y, scale: 1, opacity: 1 }}
      exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 70, damping: 15, mass: 1 }}
      className="absolute top-1/2 left-1/2 cursor-pointer z-20"
      style={{
        marginLeft: '-28px',
        marginTop: '-40px',
        willChange: 'transform',
      }}
      onClick={onClick}
      whileHover={{ scale: 1.1, zIndex: 30 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.div>
  );
};

export function OrbitCards({
  deck,
  selectedCardIds,
  onSelectCard,
  level,
  isPaused = false,
  reshuffleTrigger = 0,
  breathingEnabled = true,
  breathingAmplitude = 150,
  breathingSpeed = 0.5,
  showRingGuides = true,
}: OrbitCardsProps) {
  const [slots, setSlots] = useState<OrbitSlot[]>([]);
  const [hiddenDeckCount, setHiddenDeckCount] = useState(0);
  const hiddenDeckRef = useRef<Card[]>([]);

  const [globalTime, setGlobalTime] = useState(0);
  const lastTimeRef = useRef<number>(0);
  const rafRef = useRef<number>();

  const containerRef = useRef<HTMLDivElement>(null);
  const safeZonePadding = 40;

  const [playCardHit] = useSound('/sounds/card-hit.wav', { volume: 0.3 });

  // Ring config: Inner 5, Middle 8, Outer 12 = 25
  const cardsPerRing = useMemo(() => [5, 8, 12] as const, []);
  const ringMultipliers = useMemo(() => [1.0, 1.15, 1.3] as const, []);
  const totalOrbitCards = 25;

  const baseSpeed = useMemo(() => {
    // Orbit base speed: 1.05 × (1 + (level - 10) × 0.005)
    return 1.05 * (1 + (level > 10 ? (level - 10) * 0.005 : 0));
  }, [level]);

  const getBaseRingRadii = useCallback(() => {
    if (!containerRef.current) return [80, 140, 200];
    const rect = containerRef.current.getBoundingClientRect();
    const maxRadius = Math.min(rect.width, rect.height) / 2 - safeZonePadding;
    return [maxRadius * 0.35, maxRadius * 0.6, maxRadius * 0.9];
  }, []);

  const initialize = useCallback(() => {
    // Ensure deck ids are unique in case upstream logic ever duplicates.
    const dedupedDeck = Array.from(new Map(deck.map(c => [c.id, c])).values());

    const newSlots: OrbitSlot[] = [];
    let i = 0;

    for (let ring = 0 as 0 | 1 | 2; ring < 3; ring = (ring + 1) as 0 | 1 | 2) {
      const totalSlotsInRing = cardsPerRing[ring];
      for (let slotIndex = 0; slotIndex < totalSlotsInRing; slotIndex++) {
        const card = dedupedDeck[i++];
        if (!card) break;
        newSlots.push({ ring, slotIndex, totalSlotsInRing, card, isNew: false });
      }
    }

    const queue = dedupedDeck.slice(i);
    hiddenDeckRef.current = queue;
    setHiddenDeckCount(queue.length);

    // Guarantee 25 slots if possible
    if (newSlots.length < totalOrbitCards && queue.length > 0) {
      const forbidden = new Set<string>(newSlots.map(s => s.card.id));
      while (newSlots.length < totalOrbitCards) {
        const next = queue.shift();
        if (!next) break;
        if (forbidden.has(next.id)) {
          queue.push(next);
          continue;
        }
        // Fill ring order + slot order deterministically
        const slotToFill = newSlots.length;
        const ring = (slotToFill < 5 ? 0 : slotToFill < 13 ? 1 : 2) as 0 | 1 | 2;
        const slotIndex = ring === 0 ? slotToFill : ring === 1 ? slotToFill - 5 : slotToFill - 13;
        const totalSlotsInRing = cardsPerRing[ring];
        newSlots.push({ ring, slotIndex, totalSlotsInRing, card: next, isNew: false });
        forbidden.add(next.id);
      }
      hiddenDeckRef.current = queue;
      setHiddenDeckCount(queue.length);
    }

    setSlots(newSlots);
    setGlobalTime(0);
    lastTimeRef.current = 0;
  }, [cardsPerRing, deck]);

  // Only reset orbit when the caller explicitly reshuffles (prevents stalls on selection)
  useEffect(() => {
    initialize();
  }, [reshuffleTrigger, initialize]);

  // rAF loop (never tied to deck/shuffle updates)
  useEffect(() => {
    if (isPaused) return;

    const tick = (ts: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = ts;
      const dt = (ts - lastTimeRef.current) / 1000;
      lastTimeRef.current = ts;
      setGlobalTime(t => t + dt);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPaused]);

  useEffect(() => {
    if (isPaused) lastTimeRef.current = 0;
  }, [isPaused]);

  const ringRadii = useMemo(() => {
    const base = getBaseRingRadii();
    if (!breathingEnabled) return base;

    // Required formula:
    // radius = baseRadius + (Math.sin(globalTime * 0.5) * 150)
    return base.map((radius, idx) => {
      const phaseOffset = idx * 0.3;
      const breath = Math.sin(globalTime * 0.5 + phaseOffset) * breathingAmplitude;
      return radius + breath;
    });
  }, [breathingAmplitude, breathingEnabled, getBaseRingRadii, globalTime]);

  const drawNextUnique = useCallback((forbidden: Set<string>) => {
    const queue = hiddenDeckRef.current;
    // Try up to queue.length iterations to find a usable card
    for (let i = 0; i < queue.length; i++) {
      const candidate = queue.shift();
      if (!candidate) break;
      if (!forbidden.has(candidate.id)) return candidate;
      queue.push(candidate);
    }
    return null;
  }, []);

  const recycleCardInSlot = useCallback(
    (slot: OrbitSlot) => {
      // Move played card to the back of the queue (ensuring queue uniqueness)
      const queue = hiddenDeckRef.current;
      const withoutPlayed = queue.filter(c => c.id !== slot.card.id);
      withoutPlayed.push(slot.card);
      hiddenDeckRef.current = withoutPlayed;

      const forbidden = new Set<string>([
        ...selectedCardIds,
        ...slots.map(s => s.card.id).filter(id => id !== slot.card.id),
      ]);

      const replacement = drawNextUnique(forbidden);
      if (!replacement) {
        setHiddenDeckCount(hiddenDeckRef.current.length);
        return null;
      }

      // Ensure the replacement is removed from queue (drawNextUnique already shifted it)
      setHiddenDeckCount(hiddenDeckRef.current.length);

      return {
        ...slot,
        card: replacement,
        isNew: true,
      } as OrbitSlot;
    },
    [drawNextUnique, selectedCardIds, slots]
  );

  const handleCardClick = useCallback(
    (slot: OrbitSlot) => {
      playCardHit();
      onSelectCard(slot.card);

      setSlots(prev => {
        // Rebuild forbidden set based on next slots
        const next = prev.map(s => {
          if (s.card.id !== slot.card.id) return s;

          const queue = hiddenDeckRef.current;
          // Put played to back, then draw replacement, preserving uniqueness.
          const withoutPlayed = queue.filter(c => c.id !== slot.card.id);
          withoutPlayed.push(slot.card);
          hiddenDeckRef.current = withoutPlayed;

          const forbidden = new Set<string>([...selectedCardIds, ...prev.map(p => p.card.id).filter(id => id !== slot.card.id)]);
          const replacement = (() => {
            const q = hiddenDeckRef.current;
            for (let i = 0; i < q.length; i++) {
              const candidate = q.shift();
              if (!candidate) break;
              if (!forbidden.has(candidate.id)) return candidate;
              q.push(candidate);
            }
            return null;
          })();

          if (!replacement) return s; // Shouldn't happen with a full deck

          return { ...s, card: replacement, isNew: true };
        });

        // Deduplicate visible card ids to prevent AnimatePresence key collisions
        const seen = new Set<string>();
        const deduped: OrbitSlot[] = [];
        for (const s of next) {
          if (seen.has(s.card.id)) continue;
          seen.add(s.card.id);
          deduped.push(s);
        }

        setHiddenDeckCount(hiddenDeckRef.current.length);

        return deduped;
      });
    },
    [onSelectCard, playCardHit, selectedCardIds]
  );

  const getSlotPosition = useCallback(
    (slot: OrbitSlot) => {
      const radius = ringRadii[slot.ring] ?? ringRadii[0];
      const ringSpeedMultiplier = ringMultipliers[slot.ring];

      // Required formula:
      // angle = (slotIndex / totalSlotsInRing) * 2 * PI + (globalTime * speedMultiplier)
      const angle =
        (slot.slotIndex / slot.totalSlotsInRing) * Math.PI * 2 +
        globalTime * baseSpeed * ringSpeedMultiplier;

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      return { x, y };
    },
    [baseSpeed, globalTime, ringMultipliers, ringRadii]
  );

  const baseRadii = useMemo(() => getBaseRingRadii(), [getBaseRingRadii]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden touch-none flex items-center justify-center"
      style={{ perspective: '1000px' }}
    >
      <div className="relative w-full h-full max-w-[100vmin] max-h-[100vmin] mx-auto">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary/30 z-10" />

        {showRingGuides && ringRadii.map((radius, index) => (
          <div
            key={index}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 pointer-events-none"
            style={{ width: radius * 2, height: radius * 2 }}
          />
        ))}

        {showRingGuides && baseRadii.map((_, index) => (
          <div
            key={`label-${index}`}
            className="absolute top-1/2 left-1/2 text-[8px] text-primary/40 pointer-events-none z-5"
            style={{ transform: `translate(-50%, -50%) translateY(${-ringRadii[index] - 8}px)` }}
          >
            {[`Inner ${cardsPerRing[0]}×1.0`, `Mid ${cardsPerRing[1]}×1.15`, `Outer ${cardsPerRing[2]}×1.3`][index]}
          </div>
        ))}

        {showRingGuides && (
          <div className="absolute bottom-2 left-2 text-[10px] text-primary/50 bg-background/50 px-2 py-1 rounded">
            Orbit: {slots.length}/{totalOrbitCards} | Queue: {hiddenDeckCount}
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {slots.map((slot) => {
            const isSelected = selectedCardIds.includes(slot.card.id);
            if (isSelected) return null;

            const pos = getSlotPosition(slot);

            return (
              <OrbitCardWrapper
                key={slot.card.id}
                cardId={slot.card.id}
                x={pos.x}
                y={pos.y}
                isNew={slot.isNew}
                onClick={() => handleCardClick(slot)}
              >
                <PlayingCard
                  card={slot.card}
                  size="sm"
                  className="shadow-lg hover:shadow-xl transition-shadow"
                />
              </OrbitCardWrapper>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
