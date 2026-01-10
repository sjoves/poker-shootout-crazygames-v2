import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAudio } from '@/contexts/AudioContext';
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
  
  // Store DOM elements for direct manipulation
  const cardElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  // Track which cards have been positioned to avoid resetting on re-render
  const initializedCardsRef = useRef<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const safeZonePadding = 40;

  const { playSound } = useAudio();

  // Ring config: Inner 5, Middle 8, Outer 12 = 25
  const cardsPerRing = useMemo(() => [5, 8, 12] as const, []);
  const ringSpeedMultipliers = useMemo(() => [0.4, 0.5, 0.6] as const, []);
  const totalOrbitCards = 25;

  // Detect mobile for reduced breathing
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const effectiveBreathingAmplitude = isMobile ? Math.min(breathingAmplitude, 20) : breathingAmplitude;

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

    // Clear initialized cards on full re-init
    initializedCardsRef.current.clear();
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
        ? Math.sin(time * breathingSpeed + phaseOffset) * effectiveBreathingAmplitude 
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
    [baseRadii, effectiveBreathingAmplitude, breathingEnabled, breathingSpeed, effectiveSpeed, ringSpeedMultipliers]
  );

  // Store slots in ref for rAF access without re-creating effect
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  const selectedCardIdsRef = useRef(selectedCardIds);
  useEffect(() => {
    selectedCardIdsRef.current = selectedCardIds;
  }, [selectedCardIds]);

  const calculatePositionRef = useRef(calculatePosition);
  useEffect(() => {
    calculatePositionRef.current = calculatePosition;
  }, [calculatePosition]);

  // Global rAF loop - direct DOM updates, stable effect
  useEffect(() => {
    if (isPaused) return;

    const tick = (ts: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = ts;
      const dt = (ts - lastTimeRef.current) / 1000;
      lastTimeRef.current = ts;
      globalTimeRef.current += dt;
      
      const time = globalTimeRef.current;
      const currentSlots = slotsRef.current;
      const currentSelectedIds = selectedCardIdsRef.current;
      const calcPos = calculatePositionRef.current;
      
      // Update each card's position directly via DOM - continuous animation
      for (const slot of currentSlots) {
        if (currentSelectedIds.includes(slot.card.id)) continue;
        
        const element = cardElementsRef.current.get(slot.card.id);
        if (element) {
          const pos = calcPos(slot, time);
          element.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        }
      }
      
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPaused]); // Only depend on isPaused - use refs for everything else

  useEffect(() => {
    if (isPaused) lastTimeRef.current = 0;
  }, [isPaused]);

  const handleCardClick = useCallback(
    (slot: OrbitSlot) => {
      playSound('cardSelect');
      
      // First update slots to replace the card, THEN call onSelectCard
      setSlots(prev => {
        const next = prev.map(s => {
          if (s.card.id !== slot.card.id) return s;

          const queue = hiddenDeckRef.current;
          const withoutPlayed = queue.filter(c => c.id !== slot.card.id);
          withoutPlayed.push(slot.card);
          hiddenDeckRef.current = withoutPlayed;

          const forbidden = new Set<string>([
            ...selectedCardIds,
            slot.card.id, // Include the card being selected
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
      
      // Call onSelectCard after updating slots
      onSelectCard(slot.card);
    },
    [onSelectCard, playSound, selectedCardIds]
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
        return base + Math.sin(time * breathingSpeed + phaseOffset) * effectiveBreathingAmplitude;
      }));
    }, 100);
    
    return () => clearInterval(interval);
  }, [baseRadii, effectiveBreathingAmplitude, breathingEnabled, breathingSpeed]);

  // Ref callback to set initial position only once per card
  const getCardRefCallback = useCallback((slot: OrbitSlot) => {
    return (el: HTMLDivElement | null) => {
      if (el) {
        cardElementsRef.current.set(slot.card.id, el);
        // Only set initial position if this card hasn't been positioned yet
        if (!initializedCardsRef.current.has(slot.card.id)) {
          const pos = calculatePosition(slot, globalTimeRef.current);
          el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
          initializedCardsRef.current.add(slot.card.id);
        }
      } else {
        cardElementsRef.current.delete(slot.card.id);
        initializedCardsRef.current.delete(slot.card.id);
      }
    };
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

        {/* Cards - pure DOM positioning via rAF, no style.transform in JSX */}
        <AnimatePresence>
          {slots.map((slot) => {
            const isSelected = selectedCardIds.includes(slot.card.id);
            if (isSelected) return null;

            return (
              <div
                key={slot.card.id}
                ref={getCardRefCallback(slot)}
                className="absolute top-1/2 left-1/2 cursor-pointer z-20 hover:scale-110 hover:z-30 active:scale-95 transition-[scale] duration-100"
                style={{
                  marginLeft: '-28px',
                  marginTop: '-40px',
                  willChange: 'transform',
                }}
                onClick={() => handleCardClick(slot)}
              >
                <motion.div
                  initial={slot.isNew ? { scale: 0, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 300, 
                    damping: 25,
                  }}
                >
                  <PlayingCard
                    card={slot.card}
                    size="sm"
                    className="shadow-lg hover:shadow-xl transition-shadow"
                  />
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
