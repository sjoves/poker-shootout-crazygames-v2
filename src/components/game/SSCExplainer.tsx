import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface SSCExplainerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SSCExplainer({ isOpen, onClose }: SSCExplainerProps) {
  const items = [
    {
      icon: '🃏',
      title: 'Build Hands',
      description: 'Select 5 cards to form poker hands and score points.',
    },
    {
      icon: '🔥',
      title: 'Streak Multiplier',
      description: 'Play better hands in a row to earn up to 2x multipliers!',
    },
    {
      icon: '🏆',
      title: '3 Stars',
      description: 'Score 50% over the goal to earn all 3 stars.',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-md z-[60]"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="max-w-sm mx-4 p-6 bg-card border border-border rounded-2xl shadow-2xl"
          >
            <h2 className="text-2xl font-display text-center text-foreground mb-6">
              How to Play
            </h2>

            <div className="space-y-4 mb-6">
              {items.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="text-4xl flex-shrink-0 w-14 h-14 flex items-center justify-center bg-muted/30 rounded-xl">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-display text-foreground font-medium">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button onClick={onClose} className="w-full font-display" size="lg">
              Let's Play!
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}