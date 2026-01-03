import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowTrendingUpIcon, Squares2X2Icon, ArrowsRightLeftIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface SSCExplainerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SSCExplainer({ isOpen, onClose }: SSCExplainerProps) {
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
            className="max-w-lg mx-4 p-6 bg-card border border-border rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-2xl font-display text-center text-foreground mb-6">
              How to Play SSC Mode
            </h2>

            {/* Better-Hand Multiplier */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-display text-foreground">Better-Hand Multiplier</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Play progressively better poker hands to earn multipliers!
              </p>
              <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1st better hand:</span>
                  <span className="text-primary font-bold">1.2x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">2nd better hand:</span>
                  <span className="text-primary font-bold">1.5x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">3rd+ better hand:</span>
                  <span className="text-primary font-bold">2x</span>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t border-border mt-2">
                  The multiplier resets if your hand is equal or worse than the previous one.
                </p>
              </div>
            </div>

            {/* Mode Rotation */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Squares2X2Icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-display text-foreground">3-Level Mode Rotation</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <Squares2X2Icon className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs font-medium text-foreground">Static</p>
                  <p className="text-xs text-muted-foreground">Levels 1-3</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <ArrowsRightLeftIcon className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs font-medium text-foreground">Conveyor</p>
                  <p className="text-xs text-muted-foreground">Levels 4-6</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <ArrowDownIcon className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs font-medium text-foreground">Falling</p>
                  <p className="text-xs text-muted-foreground">Levels 7-9</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Bonus rounds every 3 levels! The cycle repeats with increasing difficulty.
              </p>
            </div>

            {/* Scoring */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-foreground mb-2">Point Values</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-muted/30 rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Royal Flush:</span>
                  <span className="text-foreground">5,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Straight Flush:</span>
                  <span className="text-foreground">2,500</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Four of a Kind:</span>
                  <span className="text-foreground">1,500</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Full House:</span>
                  <span className="text-foreground">1,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Flush:</span>
                  <span className="text-foreground">750</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Straight:</span>
                  <span className="text-foreground">500</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Three of a Kind:</span>
                  <span className="text-foreground">300</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Two Pair:</span>
                  <span className="text-foreground">150</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">One Pair:</span>
                  <span className="text-foreground">50</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">High Card:</span>
                  <span className="text-foreground">10</span>
                </div>
              </div>
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