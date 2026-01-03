import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/types/game';
import { PlayingCard } from './PlayingCard';
import useSound from 'use-sound';

interface OrbitCard extends Card {
  ring: number;
  angle: number;
  speed: number;
  isNew?: boolean;
  entryTimestamp?: number;
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

// Wrapper component for smooth fly-in transitions
const OrbitCardWrapper = ({ 
  x, 
  y, 
  isNew, 
  children, 
  cardId,
  onClick 
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
      animate={{ 
        x, 
        y, 
        scale: 1, 
        opacity: 1 
      }}
      exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
      transition={{ 
        type: 'spring', 
        stiffness: 70, 
        damping: 15,
        mass: 1
      }}
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
  breathingAmplitude = 30,
  breathingSpeed = 0.5,
  showRingGuides = true,
}: OrbitCardsProps) {
  const [orbitCards, setOrbitCards] = useState<OrbitCard[]>([]);
  const [hiddenDeck, setHiddenDeck] = useState<Card[]>([]);
  const [breathPhase, setBreathPhase] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number>(performance.now()); // Fixed timestamp anchor
  const lastTimeRef = useRef<number>(0);
  const [playCardHit] = useSound('/sounds/card-hit.wav', { volume: 0.3 });

  // Configuration - 5/8/12 card distribution per ring = 25 total
  const totalRings = 3;
  const cardsPerRing = [5, 8, 12]; // Inner to outer
  const ringMultipliers = [1.0, 1.15, 1.3]; // Speed multipliers per ring
  const safeZonePadding = 40;
  const totalOrbitCards = cardsPerRing.reduce((a, b) => a + b, 0); // 25

  // Calculate base ring radii based on container size
  const getBaseRingRadii = useCallback(() => {
    if (!containerRef.current) return [80, 140, 200];
    const rect = containerRef.current.getBoundingClientRect();
    const maxRadius = Math.min(rect.width, rect.height) / 2 - safeZonePadding;
    return [
      maxRadius * 0.35, // Inner ring
      maxRadius * 0.6,  // Middle ring
      maxRadius * 0.9,  // Outer ring
    ];
  }, []);

  // Apply breathing effect to radii - uses fixed time anchor
  const getBreathingRadii = useCallback((currentBreathPhase: number) => {
    const baseRadii = getBaseRingRadii();
    if (!breathingEnabled) return baseRadii;
    
    return baseRadii.map((radius, index) => {
      const phaseOffset = index * 0.3;
      // Use the formula: baseRadius + (Math.sin(time * 0.5) * 150)
      const breathOffset = Math.sin(currentBreathPhase + phaseOffset) * breathingAmplitude;
      return radius + breathOffset;
    });
  }, [getBaseRingRadii, breathingEnabled, breathingAmplitude]);

  // Initialize orbit cards with 25 in orbit, rest in hidden deck
  const initializeCards = useCallback(() => {
    const newOrbitCards: OrbitCard[] = [];
    const newHiddenDeck: Card[] = [];
    let deckIndex = 0;

    // Calculate base speed with level scaling
    const baseSpeed = 1.05 * (1 + (level > 10 ? (level - 10) * 0.005 : 0));

    // Populate orbit rings
    for (let ring = 0; ring < totalRings; ring++) {
      const numCards = cardsPerRing[ring];
      const ringSpeed = baseSpeed * ringMultipliers[ring];
      
      for (let i = 0; i < numCards && deckIndex < deck.length; i++) {
        const card = deck[deckIndex++];
        const angle = (i / numCards) * Math.PI * 2;
        newOrbitCards.push({
          ...card,
          ring,
          angle,
          speed: ringSpeed,
          isNew: false,
          entryTimestamp: startTimeRef.current,
        });
      }
    }

    // Rest goes to hidden deck (recycle queue)
    while (deckIndex < deck.length) {
      newHiddenDeck.push(deck[deckIndex++]);
    }

    setOrbitCards(newOrbitCards);
    setHiddenDeck(newHiddenDeck);
    startTimeRef.current = performance.now();
  }, [deck, level, cardsPerRing, ringMultipliers, totalRings]);

  // Reset on deck change or reshuffle
  useEffect(() => {
    initializeCards();
  }, [deck.length, reshuffleTrigger, initializeCards]);

  // Animation loop - uses fixed time anchor for stability
  useEffect(() => {
    if (isPaused) return;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // Update card rotation angles - decoupled from selection state
      setOrbitCards(prev => 
        prev.map(card => ({
          ...card,
          angle: card.angle + card.speed * deltaTime * 0.35,
          // Clear isNew flag after entry animation completes (~500ms)
          isNew: card.isNew && (timestamp - (card.entryTimestamp || 0)) < 500,
        }))
      );

      // Update breathing phase using fixed time reference
      if (breathingEnabled) {
        setBreathPhase(prev => prev + deltaTime * breathingSpeed);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPaused, breathingEnabled, breathingSpeed]);

  // Reset time ref when paused
  useEffect(() => {
    if (isPaused) {
      lastTimeRef.current = 0;
    }
  }, [isPaused]);

  // Handle card selection with recycling
  const handleCardClick = useCallback((card: OrbitCard) => {
    playCardHit();
    onSelectCard(card);
    
    setOrbitCards(prev => {
      const remaining = prev.filter(c => c.id !== card.id);
      return remaining;
    });

    // Queue the played card to back of hidden deck and pull replacement
    setHiddenDeck(prev => {
      const newQueue = [...prev, card as Card];
      return newQueue;
    });
  }, [onSelectCard, playCardHit]);

  // Effect to replenish orbit from hidden deck
  useEffect(() => {
    const missingCount = totalOrbitCards - orbitCards.length;
    
    if (missingCount > 0 && hiddenDeck.length > 0) {
      const cardsToAdd = hiddenDeck.slice(0, missingCount);
      const remainingHidden = hiddenDeck.slice(missingCount);
      
      if (cardsToAdd.length > 0) {
        const baseSpeed = 1.05 * (1 + (level > 10 ? (level - 10) * 0.005 : 0));
        const currentTime = performance.now();
        
        // Find which ring needs cards
        const ringCounts = [0, 0, 0];
        orbitCards.forEach(c => ringCounts[c.ring]++);
        
        const newCards: OrbitCard[] = cardsToAdd.map((card, idx) => {
          // Find first ring that needs cards
          let targetRing = 0;
          for (let r = 0; r < totalRings; r++) {
            if (ringCounts[r] < cardsPerRing[r]) {
              targetRing = r;
              ringCounts[r]++;
              break;
            }
          }
          
          // Calculate entry angle - find a gap in the ring
          const ringCards = orbitCards.filter(c => c.ring === targetRing);
          const existingAngles = ringCards.map(c => c.angle % (Math.PI * 2));
          let entryAngle = Math.random() * Math.PI * 2;
          
          // Try to find a gap
          if (existingAngles.length > 0) {
            existingAngles.sort((a, b) => a - b);
            let maxGap = 0;
            let gapStart = 0;
            for (let i = 0; i < existingAngles.length; i++) {
              const next = existingAngles[(i + 1) % existingAngles.length];
              const curr = existingAngles[i];
              const gap = next > curr ? next - curr : (Math.PI * 2 - curr + next);
              if (gap > maxGap) {
                maxGap = gap;
                gapStart = curr;
              }
            }
            entryAngle = gapStart + maxGap / 2;
          }
          
          return {
            ...card,
            ring: targetRing,
            angle: entryAngle,
            speed: baseSpeed * ringMultipliers[targetRing],
            isNew: true,
            entryTimestamp: currentTime,
          };
        });
        
        setOrbitCards(prev => [...prev, ...newCards]);
        setHiddenDeck(remainingHidden);
      }
    }
  }, [orbitCards.length, hiddenDeck, totalOrbitCards, level, cardsPerRing, ringMultipliers, totalRings, orbitCards]);

  const ringRadii = useMemo(() => getBreathingRadii(breathPhase), [getBreathingRadii, breathPhase]);
  const baseRadii = useMemo(() => getBaseRingRadii(), [getBaseRingRadii]);

  // Calculate card positions with breathing radii
  const getCardPosition = useCallback((card: OrbitCard) => {
    const radius = ringRadii[card.ring] || ringRadii[0];
    const x = Math.cos(card.angle) * radius;
    const y = Math.sin(card.angle) * radius;
    return { x, y };
  }, [ringRadii]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden touch-none flex items-center justify-center"
      style={{ perspective: '1000px' }}
    >
      {/* Center anchor container */}
      <div className="relative w-full h-full max-w-[100vmin] max-h-[100vmin] mx-auto">
        {/* Center point indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary/30 z-10" />

        {/* Orbit rings visual guides */}
        {showRingGuides && ringRadii.map((radius, index) => (
          <motion.div
            key={index}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 pointer-events-none"
            animate={{
              width: radius * 2,
              height: radius * 2,
            }}
            transition={{ duration: 0.05 }}
          />
        ))}

        {/* Ring info labels */}
        {showRingGuides && baseRadii.map((_, index) => (
          <div
            key={`label-${index}`}
            className="absolute top-1/2 left-1/2 text-[8px] text-primary/40 pointer-events-none z-5"
            style={{
              transform: `translate(-50%, -50%) translateY(${-ringRadii[index] - 8}px)`,
            }}
          >
            {[`Inner ${cardsPerRing[0]}×1.0`, `Mid ${cardsPerRing[1]}×1.15`, `Outer ${cardsPerRing[2]}×1.3`][index]}
          </div>
        ))}

        {/* Hidden deck counter */}
        {showRingGuides && (
          <div className="absolute bottom-2 left-2 text-[10px] text-primary/50 bg-background/50 px-2 py-1 rounded">
            Orbit: {orbitCards.length}/{totalOrbitCards} | Queue: {hiddenDeck.length}
          </div>
        )}

        {/* Orbiting cards with AnimatePresence for smooth transitions */}
        <AnimatePresence mode="popLayout">
          {orbitCards.map(card => {
            const pos = getCardPosition(card);
            const isSelected = selectedCardIds.includes(card.id);
            if (isSelected) return null;

            return (
              <OrbitCardWrapper
                key={card.id}
                cardId={card.id}
                x={pos.x}
                y={pos.y}
                isNew={card.isNew || false}
                onClick={() => handleCardClick(card)}
              >
                <PlayingCard
                  card={card}
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