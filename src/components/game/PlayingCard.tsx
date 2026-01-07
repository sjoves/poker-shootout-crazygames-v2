import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Card, Suit } from '@/types/game';
import { cn } from '@/lib/utils';

interface PlayingCardProps {
  card: Card;
  onClick?: () => void;
  isSelected?: boolean;
  isDisabled?: boolean;
  size?: 'xs' | 'sm' | 'ssc' | 'sdm' | 'sdm-lg' | 'sd' | 'md' | 'hand' | 'lg' | 'conveyor-sm' | 'conveyor-md' | 'conveyor-lg';
  animate?: boolean;
  className?: string;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const isRedSuit = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';

// Jumbo-style sizing with larger ranks and pips like Bicycle cards
const SIZE_CONFIG = {
  xs: { card: 'w-12 h-[67px]', rank: 'text-base font-black', corner: 'text-xs', center: 'text-sm', pip: 'text-[8px]', gap: 'gap-0' },
  sm: { card: 'w-14 h-[79px]', rank: 'text-lg font-black', corner: 'text-sm', center: 'text-base', pip: 'text-[9px]', gap: 'gap-0' },
  ssc: { card: 'w-[68px] h-[95px]', rank: 'text-xl font-black', corner: 'text-base', center: 'text-lg', pip: 'text-[10px]', gap: 'gap-0' },
  // Game cards use vh-based sizing for CrazyGames compatibility (no scrolling)
  sdm: { card: 'w-[calc(13.6vh*0.714)] h-[13.6vh]', rank: 'text-lg font-black', corner: 'text-sm', center: 'text-base', pip: 'text-[9px]', gap: 'gap-0' },
  // Larger mobile cards for 3-row layout (~18% bigger than sdm)
  'sdm-lg': { card: 'w-[calc(16vh*0.714)] h-[16vh]', rank: 'text-xl font-black', corner: 'text-base', center: 'text-lg', pip: 'text-[10px]', gap: 'gap-0' },
  sd: { card: 'w-[calc(17vh*0.714)] h-[17vh]', rank: 'text-2xl font-black', corner: 'text-lg', center: 'text-xl', pip: 'text-xs', gap: 'gap-0' },
  md: { card: 'w-[76px] h-[106px]', rank: 'text-2xl font-black', corner: 'text-lg', center: 'text-xl', pip: 'text-sm', gap: 'gap-0.5' },
  // Hand display uses vh-based sizing
  hand: { card: 'w-[calc(11vh*0.714)] h-[11vh]', rank: 'text-lg font-black', corner: 'text-sm', center: 'text-base', pip: 'text-[10px]', gap: 'gap-0' },
  lg: { card: 'w-[115px] h-[158px]', rank: 'text-3xl font-black', corner: 'text-xl', center: 'text-2xl', pip: 'text-base', gap: 'gap-1' },
  // Responsive conveyor belt sizes - use w-full h-full to inherit from parent
  'conveyor-sm': { card: 'w-full h-full aspect-[2.5/3.5]', rank: 'text-base font-black', corner: 'text-xs', center: 'text-sm', pip: 'text-[8px]', gap: 'gap-0' },
  'conveyor-md': { card: 'w-full h-full aspect-[2.5/3.5]', rank: 'text-lg font-black', corner: 'text-sm', center: 'text-base', pip: 'text-[9px]', gap: 'gap-0' },
  'conveyor-lg': { card: 'w-full h-full aspect-[2.5/3.5]', rank: 'text-2xl font-black', corner: 'text-lg', center: 'text-xl', pip: 'text-xs', gap: 'gap-0.5' },
};

const PIP_LAYOUTS: Record<string, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
};

const CenterPips = memo(function CenterPips({ rank, suit, size }: { rank: string; suit: Suit; size: keyof typeof SIZE_CONFIG }) {
  const symbol = SUIT_SYMBOLS[suit];
  const count = PIP_LAYOUTS[rank];
  const config = SIZE_CONFIG[size];
  
  if (!count) {
    return (
      <div className={cn('flex flex-col items-center justify-center', config.center)}>
        <span className="font-bold">{rank}</span>
        <span>{symbol}</span>
      </div>
    );
  }

  if (count === 1) {
    return <span className={cn(config.center, 'font-normal')}>{symbol}</span>;
  }

  return (
    <div className={cn('grid grid-cols-2 gap-x-1', config.pip, config.gap)}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="text-center leading-tight">{symbol}</span>
      ))}
    </div>
  );
});

// Memoized PlayingCard to prevent re-renders when only position changes
const PlayingCardInner = forwardRef<HTMLButtonElement, PlayingCardProps>(function PlayingCardInner(
  {
    card,
    onClick,
    isSelected,
    isDisabled,
    size = 'md',
    animate = true,
    className,
  },
  ref
) {
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const colorClass = isRedSuit(card.suit) ? 'text-red-600' : 'text-gray-900';
  const config = SIZE_CONFIG[size];

  return (
    <motion.button
      ref={ref}
      onPointerDown={!isDisabled && !isSelected ? onClick : undefined}
      disabled={isDisabled || isSelected}
      whileHover={!isDisabled && !isSelected ? { scale: 1.05, y: -5, transition: { duration: 0.1 } } : {}}
      whileTap={!isDisabled && !isSelected ? { scale: 0.95, transition: { duration: 0.05 } } : {}}
      initial={animate ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1, transition: { duration: 0.1 } }}
      className={cn(
        config.card,
        'relative rounded-lg bg-white shadow-lg cursor-pointer select-none touch-manipulation',
        'flex flex-col items-center justify-center',
        'border border-gray-200',
        'transition-all duration-100',
        colorClass,
        isSelected && 'ring-2 ring-primary opacity-50 cursor-not-allowed',
        isDisabled && 'opacity-50 cursor-not-allowed',
        !isDisabled && !isSelected && 'hover:shadow-xl active:shadow-md',
        className
      )}
    >
      {/* Top-left corner */}
      <div className={cn('absolute top-0.5 left-1 flex flex-col items-center leading-none')}>
        <span className={cn('font-bold', config.rank)}>{card.rank}</span>
        <span className={config.corner}>{suitSymbol}</span>
      </div>

      {/* Center pips/face */}
      <CenterPips rank={card.rank} suit={card.suit} size={size} />

      {/* Bottom-right corner (inverted) */}
      <div className={cn('absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180')}>
        <span className={cn('font-bold', config.rank)}>{card.rank}</span>
        <span className={config.corner}>{suitSymbol}</span>
      </div>
    </motion.button>
  );
});

PlayingCardInner.displayName = 'PlayingCard';

export const PlayingCard = memo(PlayingCardInner, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these props actually change
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDisabled === nextProps.isDisabled &&
    prevProps.size === nextProps.size &&
    prevProps.className === nextProps.className
  );
});

const EMPTY_SLOT_SIZES = {
  xs: 'w-12 h-[67px]',
  sm: 'w-14 h-[79px]',
  ssc: 'w-[68px] h-[95px]',
  sdm: 'w-[calc(13.6vh*0.714)] h-[13.6vh]',
  'sdm-lg': 'w-[calc(16vh*0.714)] h-[16vh]',
  sd: 'w-[calc(17vh*0.714)] h-[17vh]',
  md: 'w-[76px] h-[106px]',
  hand: 'w-[calc(11vh*0.714)] h-[11vh]',
  lg: 'w-[115px] h-[158px]',
  'conveyor-sm': 'w-full h-full aspect-[2.5/3.5]',
  'conveyor-md': 'w-full h-full aspect-[2.5/3.5]',
  'conveyor-lg': 'w-full h-full aspect-[2.5/3.5]',
};

export function EmptyCardSlot({ size = 'md' }: { size?: keyof typeof EMPTY_SLOT_SIZES }) {
  return (
    <div
      className={cn(
        EMPTY_SLOT_SIZES[size],
        'rounded-lg border-2 border-dashed border-muted-foreground/30',
        'flex items-center justify-center',
        'bg-muted/20'
      )}
    >
      <span className="text-muted-foreground text-2xl">?</span>
    </div>
  );
}
