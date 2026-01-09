import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Suit } from '@/types/game';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

interface FlippableCardProps {
  card: Card;
  isKept: boolean;
  isFlippedExternal?: boolean;
  onFlip?: (cardId: string) => void;
  onKeep: (card: Card) => void;
  onUnkeep: (card: Card) => void;
  disabled?: boolean;
  size?: 'sm' | 'sdm' | 'sd';
}

const SIZE_CLASSES = {
  sm: { card: 'w-[40px] h-[57px]', rank: 'text-base font-black', corner: 'text-xs' },
  sdm: { card: 'w-[50px] h-[71px]', rank: 'text-lg font-black', corner: 'text-sm' },
  sd: { card: 'w-[60px] h-[85px]', rank: 'text-lg font-black', corner: 'text-sm' },
};

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const isRedSuit = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';

// Time in ms before card flips back if not kept
const AUTO_UNFLIP_DELAY = 2500;

export function FlippableCard({ card, isKept, isFlippedExternal, onFlip, onKeep, onUnkeep, disabled, size = 'sdm' }: FlippableCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const unflipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { playSound } = useAudio();
  const config = SIZE_CLASSES[size];
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const colorClass = isRedSuit(card.suit) ? 'text-red-600' : 'text-gray-900';

  // Sync with external flipped state - flip back if another card is flipped
  useEffect(() => {
    if (isFlippedExternal === false && isFlipped && !isKept) {
      setIsFlipped(false);
    }
  }, [isFlippedExternal, isFlipped, isKept]);

  // Auto-unflip after delay if not kept
  useEffect(() => {
    if (isFlipped && !isKept) {
      unflipTimerRef.current = setTimeout(() => {
        setIsFlipped(false);
      }, AUTO_UNFLIP_DELAY);
    }

    return () => {
      if (unflipTimerRef.current) {
        clearTimeout(unflipTimerRef.current);
      }
    };
  }, [isFlipped, isKept]);


  const handleKeepToggle = () => {
    // Clear the auto-unflip timer when keeping
    if (unflipTimerRef.current) {
      clearTimeout(unflipTimerRef.current);
    }
    
    if (isKept) {
      onUnkeep(card);
      setIsFlipped(false);
    } else {
      playSound('cardSelect');
      onKeep(card);
    }
  };

  const [isTouched, setIsTouched] = useState(false);

  const handlePointerDown = () => {
    if (disabled || isKept || isFlipped) return;
    setIsTouched(true);
  };

  const handlePointerUp = () => {
    setIsTouched(false);
    if (disabled || isKept || isFlipped) return;
    setIsFlipped(true);
    playSound('cardFlip');
    onFlip?.(card.id);
  };

  return (
    <div className="relative perspective-1000 touch-manipulation">
      <motion.div
        className={cn(
          config.card,
          'cursor-pointer relative',
          'transform-style-preserve-3d will-change-transform',
          disabled && !isKept && 'opacity-50 cursor-not-allowed'
        )}
        animate={{ 
          rotateY: isFlipped || isKept ? 180 : 0,
          scale: isTouched ? 1.05 : 1
        }}
        transition={{ 
          rotateY: { duration: 0.15, ease: 'easeOut' },
          scale: { duration: 0.1, ease: 'easeOut' }
        }}
      >
        {/* Card Back - Theme color */}
        <div
          className={cn(
            'absolute inset-0 rounded-lg backface-hidden overflow-hidden',
            'shadow-lg bg-accent will-change-transform'
          )}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => setIsTouched(false)}
        />

        {/* Card Front */}
        <div
          className={cn(
            'absolute inset-0 rounded-lg backface-hidden rotate-y-180',
            'bg-white border border-gray-200',
            'flex flex-col items-center justify-center',
            'shadow-lg will-change-transform',
            colorClass,
            isKept && 'ring-2 ring-green-500'
          )}
        >
          {/* Top-left corner - Jumbo style */}
          <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none">
            <span className={config.rank}>{card.rank}</span>
            <span className={config.corner}>{suitSymbol}</span>
          </div>

          {/* Center - clean look without pips */}

          {/* Bottom-right corner - Jumbo style */}
          <div className="absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180">
            <span className={config.rank}>{card.rank}</span>
            <span className={config.corner}>{suitSymbol}</span>
          </div>

          {/* Keep Button */}
          <AnimatePresence>
            {(isFlipped || isKept) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.1 }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleKeepToggle();
                }}
                className={cn(
                  'absolute -bottom-2 -right-2 w-6 h-6 rounded-full',
                  'flex items-center justify-center',
                  'border-2 transition-all duration-100',
                  'shadow-md z-10 touch-manipulation',
                  isKept
                    ? 'bg-green-500 border-green-600 text-white'
                    : 'bg-white border-gray-300 hover:border-green-500'
                )}
              >
                {isKept && <Check className="w-4 h-4" />}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
