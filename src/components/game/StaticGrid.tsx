import { motion } from 'framer-motion';
import { Card } from '@/types/game';
import { PlayingCard } from './PlayingCard';
import { useIsMobile } from '@/hooks/use-mobile';

interface StaticGridProps {
  deck: Card[];
  selectedCardIds: string[];
  onSelectCard: (card: Card) => void;
}

// Show at most 50% of the deck (26 cards), arranged in 5 columns x 5 rows = 25 cards max
const MAX_VISIBLE_CARDS = 25;
const GRID_COLUMNS = 5;

export function StaticGrid({ deck, selectedCardIds, onSelectCard }: StaticGridProps) {
  // Only show up to MAX_VISIBLE_CARDS
  const visibleCards = deck.slice(0, MAX_VISIBLE_CARDS);
  const isMobile = useIsMobile();
  const cardSize = isMobile ? 'xs' : 'sm';
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center w-full h-full"
    >
      <div 
        className="grid gap-1 sm:gap-2 p-2 sm:p-4"
        style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
      >
        {visibleCards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
          >
            <PlayingCard
              card={card}
              onClick={() => onSelectCard(card)}
              isSelected={selectedCardIds.includes(card.id)}
              size={cardSize}
              animate={false}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
