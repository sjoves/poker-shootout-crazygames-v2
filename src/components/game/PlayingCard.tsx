import { motion } from 'framer-motion';
import { Card, Suit } from '@/types/game';
import { cn } from '@/lib/utils';

interface PlayingCardProps {
  card: Card;
  onClick?: () => void;
  isSelected?: boolean;
  isDisabled?: boolean;
  size?: 'xs' | 'sm' | 'ssc' | 'md' | 'lg';
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

const SIZE_CONFIG = {
  xs: { card: 'w-12 h-[67px]', rank: 'text-xs', corner: 'text-[8px]', center: 'text-base', pip: 'text-[6px]', gap: 'gap-0' },
  sm: { card: 'w-14 h-[79px]', rank: 'text-sm', corner: 'text-[10px]', center: 'text-lg', pip: 'text-[7px]', gap: 'gap-0' },
  ssc: { card: 'w-[68px] h-[95px]', rank: 'text-sm', corner: 'text-[10px]', center: 'text-xl', pip: 'text-[8px]', gap: 'gap-0' }, // 20% larger than sm
  md: { card: 'w-[76px] h-[106px]', rank: 'text-base', corner: 'text-xs', center: 'text-2xl', pip: 'text-[10px]', gap: 'gap-0.5' },
  lg: { card: 'w-[115px] h-[158px]', rank: 'text-xl', corner: 'text-sm', center: 'text-4xl', pip: 'text-xs', gap: 'gap-1' },
};

// Number of pips to show based on card rank
const PIP_LAYOUTS: Record<string, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
};

function CenterPips({ rank, suit, size }: { rank: string; suit: Suit; size: 'xs' | 'sm' | 'ssc' | 'md' | 'lg' }) {
  const symbol = SUIT_SYMBOLS[suit];
  const count = PIP_LAYOUTS[rank];
  const config = SIZE_CONFIG[size];
  
  if (!count) {
    // Face card (J, Q, K)
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

  // Simple grid layout for pips
  return (
    <div className={cn('grid grid-cols-2 gap-x-1', config.pip, config.gap)}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="text-center leading-tight">{symbol}</span>
      ))}
    </div>
  );
}

export function PlayingCard({
  card,
  onClick,
  isSelected,
  isDisabled,
  size = 'md',
  animate = true,
  className,
}: PlayingCardProps) {
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const colorClass = isRedSuit(card.suit) ? 'text-red-600' : 'text-gray-900';
  const config = SIZE_CONFIG[size];

  return (
    <motion.button
      onClick={onClick}
      disabled={isDisabled || isSelected}
      whileHover={!isDisabled && !isSelected ? { scale: 1.05, y: -5 } : {}}
      whileTap={!isDisabled && !isSelected ? { scale: 0.95 } : {}}
      initial={animate ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        config.card,
        'relative rounded-lg bg-white shadow-lg cursor-pointer select-none',
        'flex flex-col items-center justify-center',
        'border border-gray-200',
        'transition-all duration-200',
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
}

const EMPTY_SLOT_SIZES = {
  xs: 'w-12 h-[67px]',
  sm: 'w-14 h-[79px]',
  ssc: 'w-[68px] h-[95px]',
  md: 'w-[76px] h-[106px]',
  lg: 'w-[115px] h-[158px]',
};

export function EmptyCardSlot({ size = 'md' }: { size?: 'xs' | 'sm' | 'ssc' | 'md' | 'lg' }) {
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
