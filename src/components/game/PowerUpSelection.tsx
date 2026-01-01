import { motion } from 'framer-motion';
import { POWER_UPS } from '@/types/game';
import { Button } from '@/components/ui/button';
import { StarIcon } from '@heroicons/react/24/outline';

interface PowerUpSelectionProps {
  choices: string[];
  onSelect: (powerUpId: string) => void;
  onDismiss: () => void;
}

export function PowerUpSelection({ choices, onSelect, onDismiss }: PowerUpSelectionProps) {
  const powerUpOptions = choices.map(id => POWER_UPS.find(p => p.id === id)).filter(Boolean);
  
  if (powerUpOptions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 20 }}
        className="bg-card border-2 border-accent rounded-2xl p-6 max-w-md w-full shadow-2xl"
      >
        <div className="text-center mb-6">
          <motion.div
            initial={{ rotate: -10, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            <StarIcon className="w-12 h-12 text-accent mx-auto mb-3" />
          </motion.div>
          <h2 className="text-2xl font-display text-foreground mb-1">Choose Your Reward!</h2>
          <p className="text-sm text-muted-foreground">Select a power-up to add to your arsenal</p>
        </div>

        <div className="space-y-3 mb-6">
          {powerUpOptions.map((powerUp, index) => (
            <motion.button
              key={powerUp!.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              onClick={() => onSelect(powerUp!.id)}
              className="w-full p-4 bg-background/50 hover:bg-primary/10 border border-border hover:border-primary rounded-xl transition-all flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                {powerUp!.emoji}
              </div>
              <div className="text-left flex-1">
                <p className="font-display text-foreground group-hover:text-primary transition-colors">
                  {powerUp!.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {powerUp!.description}
                </p>
              </div>
              <div className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">
                Tier {powerUp!.tier}
              </div>
            </motion.button>
          ))}
        </div>

        <Button
          variant="ghost"
          onClick={onDismiss}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          Skip (no power-up)
        </Button>
      </motion.div>
    </motion.div>
  );
}
