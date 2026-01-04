import { motion } from 'framer-motion';
import { Card } from '@/types/game';
import { PlayingCard } from './PlayingCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAudio } from '@/contexts/AudioContext';

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
  const { playSound } = useAudio();

  // Use 'ssc' size (20% larger than sm) for SSC Static mode
  const cardSize = isMobile ? 'sm' : 'ssc';
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 flex items-center justify-center pt-20 pb-36"
    >
      <div 
        className="grid gap-1 sm:gap-2 p-2 sm:p-4"
        style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
      >
        {visibleCards.map((card, index) => {
          const isSelected = selectedCardIds.includes(card.id);
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
            >
              <PlayingCard
                card={card}
                onClick={() => {
                  if (!isSelected) {
                    playSound('cardSelect');
                    onSelectCard(card);
                  }
                }}
                isSelected={isSelected}
                isDisabled={isSelected}
                size={cardSize}
                animate={false}
              />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
