import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, FallingCard } from '@/types/game';
import { PlayingCard } from './PlayingCard';

interface FallingCardsProps {
  deck: Card[];
  selectedCardIds: string[];
  onSelectCard: (card: Card) => void;
  speed?: number;
  isPaused?: boolean;
  isRecycling?: boolean;
}

export function FallingCards({
  deck,
  selectedCardIds,
  onSelectCard,
  speed = 1,
  isPaused = false,
  isRecycling = false,
}: FallingCardsProps) {
  const [fallingCards, setFallingCards] = useState<FallingCard[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const lastSpawnRef = useRef(0);
  const deckIndexRef = useRef(0);
  const spawnCountRef = useRef(0);

  // Spawn new cards
  const spawnCard = useCallback(() => {
    if (!containerRef.current) return;
    
    const availableCards = deck.filter(c => !selectedCardIds.includes(c.id));
    if (availableCards.length === 0) return;
    
    const cardIndex = isRecycling 
      ? Math.floor(Math.random() * availableCards.length)
      : deckIndexRef.current % availableCards.length;
    
    const card = availableCards[cardIndex];
    if (!card) return;
    
    deckIndexRef.current++;
    spawnCountRef.current++;
    
    const containerWidth = containerRef.current.offsetWidth;
    const cardWidth = 64;
    
    const fallingCard: FallingCard = {
      ...card,
      id: `${card.id}-${spawnCountRef.current}`, // Unique spawn ID
      x: Math.random() * (containerWidth - cardWidth),
      y: -100,
      speed: (2 + Math.random() * 2) * speed,
      rotation: (Math.random() - 0.5) * 30,
      rotationSpeed: (Math.random() - 0.5) * 0.5,
      sway: Math.random() * 20,
      swaySpeed: 2 + Math.random() * 2,
    };
    
    setFallingCards(prev => {
      if (prev.length >= 12) return prev;
      return [...prev, fallingCard];
    });
  }, [deck, selectedCardIds, speed, isRecycling]);

  // Animation loop using refs to avoid re-renders
  useEffect(() => {
    if (isPaused) return;
    
    const animate = () => {
      const containerHeight = containerRef.current?.offsetHeight || 600;
      
      setFallingCards(prev => {
        const now = performance.now();
        
        // Spawn new cards periodically
        if (now - lastSpawnRef.current > 500 / speed) {
          lastSpawnRef.current = now;
          // We'll spawn in next frame to avoid state issues
          setTimeout(() => spawnCard(), 0);
        }
        
        return prev
          .map(card => ({
            ...card,
            y: card.y + card.speed,
            rotation: card.rotation + card.rotationSpeed,
            x: card.x + Math.sin(now / 1000 * card.swaySpeed) * 0.3,
          }))
          .filter(card => {
            if (card.y > containerHeight + 50) {
              return false;
            }
            const originalId = card.id.split('-')[0] + '-' + card.id.split('-')[1];
            return !selectedCardIds.includes(originalId);
          });
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Initial spawn
    spawnCard();
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, speed, selectedCardIds]);

  const handleCardClick = useCallback((card: FallingCard) => {
    setFallingCards(prev => prev.filter(c => c.id !== card.id));
    // Extract original card ID for game state
    const originalId = card.id.split('-').slice(0, 2).join('-');
    onSelectCard({ ...card, id: originalId });
  }, [onSelectCard]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
    >
      <AnimatePresence>
        {fallingCards.map(card => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              left: card.x,
              top: card.y,
              transform: `rotate(${card.rotation}deg)`,
            }}
            className="cursor-pointer z-10"
            onClick={() => handleCardClick(card)}
          >
            <PlayingCard
              card={card}
              size="md"
              animate={false}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
