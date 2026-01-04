import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  baseRotationSpeed?: number;
}

// Memoized card wrapper with will-change optimization
const OrbitCardWrapper = React.memo(function OrbitCardWrapper({
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
}) {
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
});

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
  baseRotationSpeed = 0.6,
}: OrbitCardsProps) {
  const [slots, setSlots] = useState<OrbitSlot[]>([]);
  const [hiddenDeckCount, setHiddenDeckCount] = useState(0);
  const hiddenDeckRef = useRef<Card[]>([]);

  // Use ref for global time to avoid re-renders on every frame
  const globalTimeRef = useRef(0);
  const lastTimeRef = useRef<number>(0);
  const rafRef = useRef<number>();
  
  // Store calculated positions in ref for direct DOM updates
  const cardElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Force render only when cards change
  const [, setRenderTrigger] = useState(0);
  const triggerRender = useCallback(() => setRenderTrigger(v => v + 1), []);

  const containerRef = useRef<HTMLDivElement>(null);
  const safeZonePadding = 40;

  const [playCardHit] = useSound('/sounds/card-hit.wav', { volume: 0.3 });

  // Ring config: Inner 5, Middle 8, Outer 12 = 25
  const cardsPerRing = useMemo(() => [5, 8, 12] as const, []);
  const ringSpeedMultipliers = useMemo(() => [0.4, 0.5, 0.6] as const, []);
  const totalOrbitCards = 25;

  // Speed scales with level > 10
  const effectiveSpeed = useMemo(() => {
    const levelMultiplier = level > 10 ? 1 + (level - 10) * 0.005 : 1;
    return baseRotationSpeed * levelMultiplier;
  }, [baseRotationSpeed, level]);

  const getBaseRingRadii = useCallback(() => {
    if (!containerRef.current) return [80, 140, 200];
    const rect = containerRef.current.getBoundingClientRect();
    const maxRadius = Math.min(rect.width, rect.height) / 2 - safeZonePadding;
    return [maxRadius * 0.35, maxRadius * 0.6, maxRadius * 0.9];
  }, []);

  const baseRadii = useMemo(() => getBaseRingRadii(), [getBaseRingRadii]);

  const initialize = useCallback(() => {
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

    if (newSlots.length < totalOrbitCards && queue.length > 0) {
      const forbidden = new Set<string>(newSlots.map(s => s.card.id));
      while (newSlots.length < totalOrbitCards) {
        const next = queue.shift();
        if (!next) break;
        if (forbidden.has(next.id)) {
          queue.push(next);
          continue;
        }
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
    globalTimeRef.current = 0;
    lastTimeRef.current = 0;
  }, [cardsPerRing, deck]);

  useEffect(() => {
    initialize();
  }, [reshuffleTrigger, initialize]);

  // Calculate position for a slot - pure function, no state dependency
  const calculatePosition = useCallback(
    (slot: OrbitSlot, time: number) => {
      const baseRadius = baseRadii[slot.ring] ?? baseRadii[0];
      
      const phaseOffset = slot.ring * 0.3;
      const breathOffset = breathingEnabled 
        ? Math.sin(time * breathingSpeed + phaseOffset) * breathingAmplitude 
        : 0;
      const radius = baseRadius + breathOffset;

      const ringSpeedMultiplier = ringSpeedMultipliers[slot.ring];
      const baseAngle = (slot.slotIndex / slot.totalSlotsInRing) * Math.PI * 2;
      const rotationAngle = time * effectiveSpeed * ringSpeedMultiplier;
      const angle = baseAngle + rotationAngle;

      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    },
    [baseRadii, breathingAmplitude, breathingEnabled, breathingSpeed, effectiveSpeed, ringSpeedMultipliers]
  );

  // Global rAF loop - direct DOM updates
  useEffect(() => {
    if (isPaused) return;

    const tick = (ts: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = ts;
      const dt = (ts - lastTimeRef.current) / 1000;
      lastTimeRef.current = ts;
      globalTimeRef.current += dt;
      
      const time = globalTimeRef.current;
      
      // Update each card's position directly via DOM
      for (const slot of slots) {
        if (selectedCardIds.includes(slot.card.id)) continue;
        
        const element = cardElementsRef.current.get(slot.card.id);
        if (element) {
          const pos = calculatePosition(slot, time);
          element.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        }
      }
      
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPaused, slots, selectedCardIds, calculatePosition]);

  useEffect(() => {
    if (isPaused) lastTimeRef.current = 0;
  }, [isPaused]);

  const handleCardClick = useCallback(
    (slot: OrbitSlot) => {
      playCardHit();
      onSelectCard(slot.card);

      setSlots(prev => {
        const next = prev.map(s => {
          if (s.card.id !== slot.card.id) return s;

          const queue = hiddenDeckRef.current;
          const withoutPlayed = queue.filter(c => c.id !== slot.card.id);
          withoutPlayed.push(slot.card);
          hiddenDeckRef.current = withoutPlayed;

          const forbidden = new Set<string>([
            ...selectedCardIds,
            ...prev.map(p => p.card.id).filter(id => id !== slot.card.id)
          ]);
          
          const q = hiddenDeckRef.current;
          let replacement: Card | null = null;
          for (let i = 0; i < q.length; i++) {
            const candidate = q.shift();
            if (!candidate) break;
            if (!forbidden.has(candidate.id)) {
              replacement = candidate;
              break;
            }
            q.push(candidate);
          }

          if (!replacement) return s;
          return { ...s, card: replacement, isNew: true };
        });

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

  // Clear isNew flag after animation
  useEffect(() => {
    const hasNewCards = slots.some(s => s.isNew);
    if (!hasNewCards) return;

    const timer = setTimeout(() => {
      setSlots(prev => prev.map(s => ({ ...s, isNew: false })));
    }, 600);

    return () => clearTimeout(timer);
  }, [slots]);

  // Calculate ring guide radii - only needs to update occasionally
  const [currentRadii, setCurrentRadii] = useState(baseRadii);
  
  useEffect(() => {
    if (!breathingEnabled) {
      setCurrentRadii(baseRadii);
      return;
    }
    
    // Update ring guides at 10fps instead of 60fps
    const interval = setInterval(() => {
      const time = globalTimeRef.current;
      setCurrentRadii(baseRadii.map((base, idx) => {
        const phaseOffset = idx * 0.3;
        return base + Math.sin(time * breathingSpeed + phaseOffset) * breathingAmplitude;
      }));
    }, 100);
    
    return () => clearInterval(interval);
  }, [baseRadii, breathingAmplitude, breathingEnabled, breathingSpeed]);

  // Get initial positions for render
  const getInitialPosition = useCallback((slot: OrbitSlot) => {
    return calculatePosition(slot, globalTimeRef.current);
  }, [calculatePosition]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden touch-none flex items-center justify-center"
      style={{ perspective: '1000px' }}
    >
      <div className="relative w-full h-full max-w-[100vmin] max-h-[100vmin] mx-auto">
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary/30 z-10" />

        {/* Ring guides */}
        {showRingGuides && currentRadii.map((radius, index) => (
          <div
            key={index}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 pointer-events-none"
            style={{ width: radius * 2, height: radius * 2 }}
          />
        ))}

        {/* Debug info */}
        {showRingGuides && (
          <div className="absolute bottom-2 left-2 text-[10px] text-primary/50 bg-background/50 px-2 py-1 rounded">
            Orbit: {slots.length}/{totalOrbitCards} | Queue: {hiddenDeckCount} | Speed: {effectiveSpeed.toFixed(2)}
          </div>
        )}

        {/* Cards */}
        <AnimatePresence mode="popLayout">
          {slots.map((slot) => {
            const isSelected = selectedCardIds.includes(slot.card.id);
            if (isSelected) return null;

            const pos = getInitialPosition(slot);

            return (
              <motion.div
                key={slot.card.id}
                ref={(el) => {
                  if (el) cardElementsRef.current.set(slot.card.id, el);
                  else cardElementsRef.current.delete(slot.card.id);
                }}
                initial={slot.isNew ? { x: 0, y: 0, scale: 0, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 70, damping: 15, mass: 1 }}
                className="absolute top-1/2 left-1/2 cursor-pointer z-20"
                style={{
                  marginLeft: '-28px',
                  marginTop: '-40px',
                  transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
                  willChange: 'transform',
                }}
                onClick={() => handleCardClick(slot)}
                whileHover={{ scale: 1.1, zIndex: 30 }}
                whileTap={{ scale: 0.95 }}
              >
                <PlayingCard
                  card={slot.card}
                  size="sm"
                  className="shadow-lg hover:shadow-xl transition-shadow"
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
