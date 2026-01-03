import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/types/game';
import { PlayingCard } from './PlayingCard';
import { getOrbitRingSpeed } from '@/lib/pokerEngine';
import useSound from 'use-sound';

interface OrbitCard extends Card {
  ring: number;
  angle: number;
  speed: number;
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
  const [breathPhase, setBreathPhase] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const [playCardHit] = useSound('/sounds/card-hit.wav', { volume: 0.3 });

  // Configuration - 8/12/16 card distribution per ring
  const totalRings = 3;
  const cardsPerRing = [8, 12, 16]; // Inner to outer
  const ringMultipliers = [1.0, 1.15, 1.3]; // Speed multipliers per ring
  const safeZonePadding = 40; // Reduced to allow off-screen breathing

  // Calculate base ring radii based on container size
  const getBaseRingRadii = useCallback(() => {
    if (!containerRef.current) return [80, 140, 200];
    const rect = containerRef.current.getBoundingClientRect();
    const maxRadius = Math.min(rect.width, rect.height) / 2 - safeZonePadding;
    return [
      maxRadius * 0.35, // Inner ring
      maxRadius * 0.6,  // Middle ring
      maxRadius * 0.9,  // Outer ring (can go offscreen with breathing)
    ];
  }, []);

  // Apply breathing effect to radii
  const getBreathingRadii = useCallback(() => {
    const baseRadii = getBaseRingRadii();
    if (!breathingEnabled) return baseRadii;
    
    // Sine wave oscillation - each ring breathes with phase offset
    return baseRadii.map((radius, index) => {
      const phaseOffset = index * 0.3; // Stagger the breathing per ring
      const breathOffset = Math.sin(breathPhase + phaseOffset) * breathingAmplitude;
      return radius + breathOffset;
    });
  }, [getBaseRingRadii, breathingEnabled, breathPhase, breathingAmplitude]);

  // Initialize orbit cards
  const initializeCards = useCallback(() => {
    const newOrbitCards: OrbitCard[] = [];
    let deckIndex = 0;

    // Calculate base speed with level scaling: 1.05 × (1 + (level - 10) × 0.005)
    const baseSpeed = 1.05 * (1 + (level > 10 ? (level - 10) * 0.005 : 0));

    for (let ring = 0; ring < totalRings; ring++) {
      const numCards = cardsPerRing[ring];
      const ringSpeed = baseSpeed * ringMultipliers[ring];
      
      for (let i = 0; i < numCards && deckIndex < deck.length; i++) {
        const card = deck[deckIndex++];
        if (!selectedCardIds.includes(card.id)) {
          const angle = (i / numCards) * Math.PI * 2;
          newOrbitCards.push({
            ...card,
            ring,
            angle,
            speed: ringSpeed,
          });
        }
      }
    }

    setOrbitCards(newOrbitCards);
  }, [deck, selectedCardIds, level]);

  // Reset on deck change or reshuffle
  useEffect(() => {
    initializeCards();
  }, [deck.length, reshuffleTrigger, initializeCards]);

  // Animation loop - handles both rotation and breathing
  useEffect(() => {
    if (isPaused) return;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      
      const deltaTime = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // Update card rotation angles
      setOrbitCards(prev => 
        prev.map(card => ({
          ...card,
          angle: card.angle + card.speed * deltaTime * 0.35,
        }))
      );

      // Update breathing phase
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

  const handleCardClick = useCallback((card: Card) => {
    playCardHit();
    onSelectCard(card);
    
    // Remove card from orbit
    setOrbitCards(prev => prev.filter(c => c.id !== card.id));
  }, [onSelectCard, playCardHit]);

  const ringRadii = useMemo(() => getBreathingRadii(), [getBreathingRadii, breathPhase]);
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

        {/* Orbit rings visual guides - animate with breathing */}
        {showRingGuides && ringRadii.map((radius, index) => (
          <motion.div
            key={index}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 pointer-events-none"
            animate={{
              width: radius * 2,
              height: radius * 2,
            }}
            transition={{ duration: 0.1 }}
          />
        ))}

        {/* Ring info labels (for dev) */}
        {showRingGuides && baseRadii.map((_, index) => (
          <div
            key={`label-${index}`}
            className="absolute top-1/2 left-1/2 text-[8px] text-primary/40 pointer-events-none z-5"
            style={{
              transform: `translate(-50%, -50%) translateY(${-ringRadii[index] - 8}px)`,
            }}
          >
            {['Inner 8×1.0', 'Mid 12×1.15', 'Outer 16×1.3'][index]}
          </div>
        ))}

        {/* Orbiting cards */}
        <AnimatePresence mode="popLayout">
          {orbitCards.map(card => {
            const pos = getCardPosition(card);
            const isSelected = selectedCardIds.includes(card.id);
            if (isSelected) return null;

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: pos.x,
                  y: pos.y,
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  x: { type: 'tween', duration: 0 },
                  y: { type: 'tween', duration: 0 },
                }}
                className="absolute top-1/2 left-1/2 cursor-pointer z-20"
                style={{
                  marginLeft: '-28px',
                  marginTop: '-40px',
                  willChange: 'transform',
                }}
                onClick={() => handleCardClick(card)}
                whileHover={{ scale: 1.1, zIndex: 30 }}
                whileTap={{ scale: 0.95 }}
              >
                <PlayingCard
                  card={card}
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
